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
    this.types.push({
      detectJSType,
      detectRawType,
      toJSON,
      fromJSON,
    });
  }

  registerClass<T extends object, TName extends string>(
    constructor: { new(...args: any): T },
    name: TName,
  ) {
    type SerializedValue = T & { $ctor: string };
    this.registerType<T, SerializedValue>(
      (a): a is T => a instanceof constructor && a.constructor == constructor,
      (a): a is SerializedValue => a && typeof a == "object" && "$ctor" in a ? true : false,
      (a, parser) => ({ $ctor: name, ...(parser.toJSON({ ...a }) as T)}),
      ({ $ctor, ...values }, parser) => Object.assign(Object.create(constructor.prototype), parser.fromJSON(values))
    )
  }

  toJSON(a: unknown): unknown {
    const type = this.types.find(t => t.detectJSType(a));

    if (type) {
      return type.toJSON(a, this);
    }

    if (a instanceof Array) {
      // TODO: string keys of arrays?

      return a.map(value => this.toJSON(value));
    } else if (a && typeof a === "object") {
      const result: any = {};

      Object.keys(a).forEach(key => result[key] = this.toJSON((a as any)[key]))

      return result;
    }

    return a;
  }
  fromJSON(a: unknown): unknown {
    const type = this.types.find(t => t.detectRawType(a));

    if (type) {
      return type.fromJSON(a, this);
    }
    if (a instanceof Array) {
      // TODO: string keys of arrays?

      return a.map(value => this.fromJSON(value));
    } else if (a && typeof a === "object") {
      const result: any = {};

      Object.keys(a).forEach(key => result[key] = this.fromJSON((a as any)[key]))

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

export default defaultInstance;
