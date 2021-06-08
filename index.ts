export class XJSON {
  toJSON(a: unknown): unknown { return a; }
  fromJSON(a: unknown): unknown { return a; }
  parse(input: string): any {
    return this.fromJSON(JSON.parse(input));
  }
  stringify(input: any): string {
    return JSON.stringify(this.toJSON(input));
  }
}

export const defaultInstance = new XJSON();

export default defaultInstance;