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

  toJSON(a: unknown): unknown {
    const type = this.types.find(t => t.detectJSType(a));

    if (type) {
      return type.toJSON(a, this);
    }

    // if (a instanceof Array) {
    //   // TODO: string keys of arrays?

    //   return a.map(value => this.toJSON(value));
    // } else if (a && typeof a === "object") {
    //   const result: any = {};

    //   Object.keys(a).forEach(key => result[key] = this.toJSON((a as any)[key]))

    //   return result;
    // }

    return a;
  }
  fromJSON(a: unknown): unknown {
    const type = this.types.find(t => t.detectRawType(a));

    if (type) {
      return type.fromJSON(a, this);
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
