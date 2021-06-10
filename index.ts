import { fromByteArray, toByteArray } from "base64-js";

type Visitor = (
  input: unknown,
  getOutput: () => unknown,
  parser: ParseContext
) => any;

export class XJSON {
  types: {
    detectJSType: (value: unknown) => boolean;
    detectRawType: (value: unknown) => boolean;
    toJSON: (value: any, parser: ParseContext) => any;
    fromJSON: (value: any, parser: ParseContext) => any;
  }[] = [];

  registerType<T, S>(
    detectJSType: (value: unknown) => value is T,
    detectRawType: (value: unknown) => value is S,
    toJSON: (value: T, parser: ParseContext) => S,
    fromJSON: (value: S, parser: ParseContext) => T
  ): void {
    // the array is backwards in order to prefer later defined types
    this.types.unshift({
      detectJSType,
      detectRawType,
      toJSON,
      fromJSON,
    });
  }

  visitors: {
    toJSON: Visitor;
    fromJSON: Visitor;
  }[] = [];

  registerVisitor(toJSON: Visitor, fromJSON: Visitor) {
    this.visitors.push({
      toJSON,
      fromJSON,
    });
  }

  getContext(): ParseContext {
    if (this instanceof ParseContext) return this;
    return new ParseContext(this);
  }

  registerClass<T extends object, TName extends string>(
    constructor: { new (...args: any): T },
    name: TName,
    strictConstructorCheck: boolean = true
  ) {
    type SerializedValue = T & { $ctor: string };
    this.registerType<T, SerializedValue>(
      (a): a is T =>
        a instanceof constructor &&
        (!strictConstructorCheck || a.constructor == constructor),
      (a): a is SerializedValue =>
        a &&
        typeof a == "object" &&
        "$ctor" in a &&
        (a as { $ctor: string }).$ctor == name
          ? true
          : false,
      (a, parser) => ({ $ctor: name, ...(parser.toJSON({ ...a }) as T) }),
      ({ $ctor, ...values }, parser) =>
        Object.assign(
          Object.create(constructor.prototype),
          parser.fromJSON(values)
        )
    );
  }

  registerNominal<T, TArgs extends unknown[], TName extends string>(
    detectType: (value: unknown) => value is T,
    serialize: (input: T) => TArgs,
    factory: (...args: TArgs) => T,
    name: TName
  ) {
    type SerializedValue = { $nominal: TName; $args: unknown[] };
    this.registerType<T, SerializedValue>(
      detectType,
      (a): a is SerializedValue =>
        a &&
        typeof a === "object" &&
        "$nominal" in a &&
        (a as { $nominal: string }).$nominal == name
          ? true
          : false,
      (a, parser) => ({
        $nominal: name,
        $args: serialize(a).map((a) => parser.toJSON(a)),
      }),
      ({ $args }, parser) =>
        factory(...($args.map((a) => parser.fromJSON(a)) as TArgs))
    );
  }

  registerNominalClass<
    T extends object,
    TArgs extends unknown[],
    TName extends string
  >(
    constructor: { new (...args: TArgs): T },
    serialize: (input: T) => TArgs,
    name: TName,
    strictConstructorCheck: boolean = true
  ) {
    return this.registerNominal<T, TArgs, TName>(
      (a): a is T =>
        a instanceof constructor &&
        (!strictConstructorCheck || a.constructor == constructor),
      serialize,
      (...args) => new constructor(...args),
      name
    );
  }

  toJSON(a: unknown): unknown {
    const type = this.types.find((t) => t.detectJSType(a));
    const context = this.getContext();

    return context.visit("toJSON", a, () => {
      if (type) {
        return type.toJSON(a, context);
      }

      if (a instanceof Array) {
        // TODO: string keys of arrays?

        return a.map((value) => context.toJSON(value));
      } else if (a && typeof a === "object") {
        const result: any = {};

        Object.keys(a).forEach(
          (key) => (result[key] = context.toJSON((a as any)[key]))
        );

        return result;
      }

      return a;
    });
  }
  fromJSON(a: unknown): unknown {
    const type = this.types.find((t) => t.detectRawType(a));
    const context = this.getContext();

    return context.visit("fromJSON", a, () => {
      if (type) {
        return type.fromJSON(a, context);
      }
      if (a instanceof Array) {
        // TODO: string keys of arrays?

        return a.map((value) => context.fromJSON(value));
      } else if (a && typeof a === "object") {
        const result: any = {};

        Object.keys(a).forEach(
          (key) => (result[key] = context.fromJSON((a as any)[key]))
        );

        return result;
      }

      return a;
    });
  }
  parse(input: string): any {
    return this.fromJSON(JSON.parse(input));
  }
  stringify(input: any): string {
    return JSON.stringify(this.toJSON(input));
  }
}

export class ParseContext extends XJSON {
  constructor(public parent: XJSON) {
    super();

    this.types = parent.types;
    this.visitors = parent.visitors;
  }

  visit<Input, Output>(
    visitorType: "toJSON" | "fromJSON",
    input: Input,
    output: () => Output
  ): Output {
    let getOutput = () => output();

    this.visitors.forEach((definition) => {
      const visitor = definition[visitorType];
      const next = getOutput;

      getOutput = () => visitor(input, next, this);
    });

    return getOutput();
  }

  getIdCounter = 0;
  getId() {
    return this.getIdCounter++ + "";
  }
}

export const defaultInstance = new XJSON();

defaultInstance.registerNominal(
  (value): value is bigint => typeof value === "bigint",
  (value): [string] => [value.toString()],
  (serialized: string) => BigInt(serialized),
  "BigInt"
);

// TODO: a more space efficient binary encoding
defaultInstance.registerType(
  (value): value is Uint8Array => value instanceof Uint8Array,
  (value): value is { $binary: string } =>
    value && typeof value === "object" && "$binary" in value ? true : false,
  (value): { $binary: string } => ({
    $binary: fromByteArray(value),
  }),
  ({ $binary }) => toByteArray($binary)
);
defaultInstance.registerNominal(
  (value): value is number => typeof value === "number" && isNaN(value),
  (): [] => [],
  () => NaN,
  "NaN"
);
defaultInstance.registerNominal(
  (value): value is number =>
    typeof value === "number" && !isNaN(value) && !isFinite(value),
  (value): ["+" | "-"] => [value > 0 ? "+" : "-"],
  (value) => (value == "+" ? Infinity : -Infinity),
  "Infinity"
);
defaultInstance.registerNominalClass(
  Date,
  (value): [string] => [value.toISOString()],
  "Date"
);
defaultInstance.registerNominal(
  (a): a is Error => a instanceof Error,
  (a) => [a.message, a.stack, a.constructor.name],
  (message, stack, name) => {
    const result = new Error(message);
    result.stack = stack;
    (result as { originalName?: string }).originalName = name;

    return result;
  },
  "Error"
);
defaultInstance.registerNominalClass(
  RegExp,
  (value): [string, string] => [value.source, value.flags],
  "RegExp"
);
defaultInstance.registerNominalClass(
  Map,
  (value): [[unknown, unknown][]] => {
    const result: [unknown, unknown][] = [];

    value.forEach((value, key) => result.push([key, value]));

    return [result];
  },
  "Map"
);
defaultInstance.registerNominalClass(
  Set,
  (value): [unknown[]] => {
    const result: unknown[] = [];

    value.forEach((value) => result.push(value));

    return [result];
  },
  "Set"
);

// Circular & duplicate instances
defaultInstance.registerVisitor(
  (input, output, parser) => {
    if (typeof input === "object" && input) {
      const instanceMap = getRefMap(parser);

      if (instanceMap.has(input)) {
        const ref = { $$ref: "TODO" };
        const current = instanceMap.get(input);

        if (current instanceof Array)
          current.push((value) => (ref.$$ref = value.$$id));
        else if (current) ref.$$ref = current();
        else {
          /* typescript doesn't understand sets */
        }

        return ref;
      } else {
        const needsRef: NeedsRefCallback[] = [];
        instanceMap.set(input, needsRef);

        const result = output();
        if (needsRef.length) {
          const placeholder = result as { $$id: string };
          placeholder.$$id = parser.getId();
          needsRef.forEach((cb) => cb(placeholder));
          instanceMap.set(input, () => placeholder.$$id);
        } else {
          instanceMap.set(input, () => {
            const placeholder = result as { $$id: string };
            placeholder.$$id = parser.getId();
            instanceMap.set(input, () => placeholder.$$id);
            return placeholder.$$id;
          });
        }

        return result;
      }
    }

    return output();
  },
  (input, output, parser) => {
    const result = output();
    const instanceMap = getInstanceMap(parser);

    if (input instanceof Object && "$$id" in input) {
      instanceMap.set((input as { $$id: string }).$$id, result);
      delete (result as { $$id?: string }).$$id;
    }

    const walk = (thing: any) => {
      if (thing instanceof Object) {
        Object.keys(thing).forEach((key) => {
          const value = thing[key];
          if (value instanceof Object && "$$ref" in value) {
            thing[key] = instanceMap.get(value.$$ref);
          } else {
            walk(value);
          }
        });
      }
    };

    walk(result);

    return result;
  }
);
type NeedsRefCallback = (replacement: { $$id: string }) => void;

function getRefMap(
  context: any
): WeakMap<object, NeedsRefCallback[] | (() => string)> {
  return context.instances || (context.instances = new WeakMap());
}
function getInstanceMap(context: any): Map<string, unknown> {
  return context.instances || (context.instances = new Map());
}

export default defaultInstance;
