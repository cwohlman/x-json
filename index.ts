export class XJSON {
  types: {
    detectJSType: (value: unknown) => boolean;
    detectRawType: (value: unknown) => boolean;
    toJSON: (value: any, parser: XJSON) => any;
    fromJSON: (value: any, parser: XJSON) => any;
  }[] = [];

  registerType<T, S>(
    detectJSType: (value: unknown) => value is T,
    detectRawType: (value: unknown) => value is S,
    toJSON: (value: T, parser: XJSON) => S,
    fromJSON: (value: S, parser: XJSON) => T
  ): void {
    // the array is backwards in order to prefer later defined types
    this.types.unshift({
      detectJSType,
      detectRawType,
      toJSON,
      fromJSON,
    });
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

    if (type) {
      return type.toJSON(a, this);
    }

    if (a instanceof Array) {
      // TODO: string keys of arrays?

      return a.map((value) => this.toJSON(value));
    } else if (a && typeof a === "object") {
      const result: any = {};

      Object.keys(a).forEach(
        (key) => (result[key] = this.toJSON((a as any)[key]))
      );

      return result;
    }

    return a;
  }
  fromJSON(a: unknown): unknown {
    const type = this.types.find((t) => t.detectRawType(a));

    if (type) {
      return type.fromJSON(a, this);
    }
    if (a instanceof Array) {
      // TODO: string keys of arrays?

      return a.map((value) => this.fromJSON(value));
    } else if (a && typeof a === "object") {
      const result: any = {};

      Object.keys(a).forEach(
        (key) => (result[key] = this.fromJSON((a as any)[key]))
      );

      return result;
    }

    return a;
  }
  parse(input: string): any {
    return this.fromJSON(JSON.parse(input));
  }
  stringify(input: any): string {
    return JSON.stringify(this.toJSON(input));
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
defaultInstance.registerType<Uint8Array, { $binary: number[] }>(
  (value): value is Uint8Array => value instanceof Uint8Array,
  (value): value is { $binary: number[] } => value && typeof value === "object" && "$binary" in value ? true  : false,
  (value): { $binary: number[] } => ({ $binary: Buffer.from(value).toJSON().data }),
  (data) => new Uint8Array(data.$binary)
);
defaultInstance.registerNominal(
  (value): value is number => typeof value === "number" && isNaN(value),
  (): [] => [],
  () => NaN,
  "NaN"
);
defaultInstance.registerNominal(
  (value): value is number => typeof value === "number" && ! isNaN(value) && ! isFinite(value),
  (value): ["+" | "-"] => [value > 0 ? "+" : "-"],
  (value) => value == "+" ? Infinity : -Infinity,
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

export default defaultInstance;
