import defaultInstance, { XJSON } from "./index";

describe("XJSON", () => {
  describe("Unconfigured parser", () => {
    it("should parse plain JSON as objects", () => {
      const parser = new XJSON();

      expect(parser.parse("{}")).toEqual(JSON.parse("{}"));
    });
    it("should stringify objects as plain JSON", () => {
      const parser = new XJSON();

      expect(parser.stringify({})).toEqual(JSON.stringify({}));
    });
    it("should stringify arrays as plain JSON", () => {
      const parser = new XJSON();

      expect(parser.stringify([])).toEqual(JSON.stringify([]));
    });
    it("should call fromJSON when parsing", () => {
      const parser = new XJSON();

      parser.toJSON = (a) => {
        return 1;
      };

      expect(parser.stringify({})).toEqual(JSON.stringify(1));
    });
  });
  describe("registerType", () => {
    it("should detect & serialize custom types", () => {
      const parser = new XJSON();
      parser.registerType(
        (a): a is string => typeof a == "string",
        (a): a is { $string: string } =>
          a && typeof a == "object" && "$string" in a,
        (a) => ({ $string: a }),
        ({ $string }) => $string
      );

      expect(parser.toJSON("foo")).toEqual({ $string: "foo" });
    });
    it("should detect & parse custom types", () => {
      const parser = new XJSON();
      parser.registerType(
        (a): a is string => typeof a == "string",
        (a): a is { $string: string } =>
          a && typeof a == "object" && "$string" in a,
        (a) => ({ $string: a }),
        ({ $string }) => $string
      );

      expect(parser.fromJSON({ $string: "foo" })).toEqual("foo");
    });
    it("full circle sanity check for custom types", () => {
      const parser = new XJSON();
      parser.registerType(
        (a): a is string => typeof a == "string",
        (a): a is { $string: string } =>
          a && typeof a == "object" && "$string" in a,
        (a) => ({ $string: a }),
        ({ $string }) => $string
      );

      expect(parser.fromJSON(parser.toJSON("foo"))).toEqual("foo");
    });
    it("should serialize & deserialize nested values in objects", () => {
      const parser = new XJSON();
      parser.registerType(
        (a): a is string => typeof a == "string",
        (a): a is { $string: string } =>
          a && typeof a == "object" && "$string" in a,
        (a) => ({ $string: a }),
        ({ $string }) => $string
      );

      expect(parser.toJSON({ x: "foo" })).toEqual({ x: { $string: "foo" } });
      expect(parser.fromJSON(parser.toJSON({ x: "foo" }))).toEqual({
        x: "foo",
      });
    });
    it("should serialize nested values in arrays", () => {
      const parser = new XJSON();
      parser.registerType(
        (a): a is string => typeof a == "string",
        (a): a is { $string: string } =>
          a && typeof a == "object" && "$string" in a,
        (a) => ({ $string: a }),
        ({ $string }) => $string
      );

      expect(parser.toJSON(["foo"])).toEqual([{ $string: "foo" }]);
      expect(parser.fromJSON(parser.toJSON(["foo"]))).toEqual(["foo"]);
    });
  });
  describe("registerClass", () => {
    it("should preserve object proto when deserializing", () => {
      const parser = new XJSON();
      class Example {}

      parser.registerClass(Example, "Example");

      expect(parser.fromJSON(parser.toJSON(new Example()))).toBeInstanceOf(
        Example
      );
    });
    it("should allow serializing multiple classes", () => {
      const parser = new XJSON();
      class Example {}
      class Other {}

      parser.registerClass(Example, "Example");
      parser.registerClass(Other, "Other");

      expect(parser.fromJSON(parser.toJSON(new Other()))).toBeInstanceOf(Other);
    });
  });
  describe("registerNominal", () => {
    it("should pass serialized values to the factory", function () {
      const parser = new XJSON();
      parser.registerNominal(
        (a): a is bigint => typeof a === "bigint",
        (a): [string] => [a.toString()],
        (a) => BigInt(a),
        "BigInt"
      );

      const serialized = parser.toJSON(BigInt(5));
      expect(typeof serialized).not.toEqual("bigint");

      const parsed = parser.fromJSON(serialized);
      expect(parsed).toEqual(BigInt(5));
    });
  });
  describe("registerNominalClass", () => {
    it("should pass serialized values to the constructor", function () {
      const parser = new XJSON();
      class Example {
        constructor(public foo: string) {}
      }
      parser.registerNominalClass(Example, (a): [string] => [a.foo], "Example");

      const serialized = parser.toJSON(new Example("a"));
      expect(typeof serialized).not.toBeInstanceOf(Example);

      const parsed = parser.fromJSON(serialized);
      expect(parsed).toBeInstanceOf(Example);
      expect(parsed).toEqual(new Example("a"));
    });
  });
  describe("builtin types", () => {
    it('should support UInt8Array', () => {
      const original = new Uint8Array([0, 0, 0]);
      const serialized = defaultInstance.toJSON(original);
      const parsed = defaultInstance.fromJSON(serialized);
      expect(parsed).toEqual(original);
      
      const stringified = defaultInstance.stringify(original);
      const stringParsed = defaultInstance.parse(stringified);
      expect(stringParsed).toEqual(original);
    })
    it("should support RegExp", () => {
      expect(new RegExp("foo", "g")).toEqual(new RegExp("foo", "g"));
      expect(new RegExp("foo")).not.toEqual(new RegExp("foo", "g"));
      expect(
        defaultInstance.fromJSON(defaultInstance.toJSON(new RegExp("foo", "g")))
      ).toEqual(new RegExp("foo", "g"));
    });
    it("should support Map", () => {
      expect(
        defaultInstance.fromJSON(defaultInstance.toJSON(new Map()))
      ).toBeInstanceOf(Map);

      const original = new Map([["a", 1]]);
      const serialized = defaultInstance.toJSON(original);
      const parsed = defaultInstance.fromJSON(serialized);
      expect(parsed).toEqual(original);
      
      const stringified = defaultInstance.stringify(original);
      const stringParsed = defaultInstance.parse(stringified);
      expect(stringParsed).toEqual(original);
    });
    it("should support Set", () => {
      expect(
        defaultInstance.fromJSON(defaultInstance.toJSON(new Set()))
      ).toBeInstanceOf(Set);

      const original = new Set(["a"]);
      const serialized = defaultInstance.toJSON(original);
      const parsed = defaultInstance.fromJSON(serialized);
      expect(parsed).toEqual(original);
      
      const stringified = defaultInstance.stringify(original);
      const stringParsed = defaultInstance.parse(stringified);
      expect(stringParsed).toEqual(original);
    });
    it("should support Date", () => {
      const original = new Date(100);
      const serialized = defaultInstance.toJSON(original);
      const parsed = defaultInstance.fromJSON(serialized);
      expect(parsed).toEqual(original);
      
      const stringified = defaultInstance.stringify(original);
      const stringParsed = defaultInstance.parse(stringified);
      expect(stringParsed).toEqual(original);

    });
    it("should support Error", () => {
      const original = new Error('foo');
      const serialized = defaultInstance.toJSON(original);
      
      const parsed = defaultInstance.fromJSON(serialized);
      expect(parsed).toEqual(original);

    });
    it('should support TypeError', () => {
      const original = new TypeError('foo');
      const serialized = defaultInstance.toJSON(original);
      
      const parsed = defaultInstance.fromJSON(serialized);
      expect(parsed).toEqual(original);
    })
    it('should support BigInt', () => {
      const original = BigInt(5);
      const serialized = defaultInstance.toJSON(original);
      const parsed = defaultInstance.fromJSON(serialized);
      expect(parsed).toEqual(original);
      
      const stringified = defaultInstance.stringify(original);
      const stringParsed = defaultInstance.parse(stringified);
      expect(stringParsed).toEqual(original);
    })
    it('should support NaN', () => {
      const original = NaN;
      const serialized = defaultInstance.toJSON(original);
      const parsed = defaultInstance.fromJSON(serialized);
      expect(parsed).toEqual(original);
      
      const stringified = defaultInstance.stringify(original);
      const stringParsed = defaultInstance.parse(stringified);
      expect(stringParsed).toEqual(original);
    })
    it('should support Positive Infinity', () => {
      const original = Infinity;
      const serialized = defaultInstance.toJSON(original);
      const parsed = defaultInstance.fromJSON(serialized);
      expect(parsed).toEqual(original);
      
      const stringified = defaultInstance.stringify(original);
      const stringParsed = defaultInstance.parse(stringified);
      expect(stringParsed).toEqual(original);
    })
    it('should support Negatitive Infinity', () => {
      const original = -Infinity;
      const serialized = defaultInstance.toJSON(original);
      const parsed = defaultInstance.fromJSON(serialized);
      expect(parsed).toEqual(original);
      
      const stringified = defaultInstance.stringify(original);
      const stringParsed = defaultInstance.parse(stringified);
      expect(stringParsed).toEqual(original);
    })
  });
  describe("builtin duplicate instance handler", () => {
    it("should serialize & parse circular objects", () => {
      const value: { me?: any } = {};
      value.me = value;

      const rehydrated = defaultInstance.fromJSON(defaultInstance.toJSON(value)) as typeof value;
      expect(rehydrated).toBeInstanceOf(Object);
      expect(rehydrated.me).toBeInstanceOf(Object);
    })
    it("should rehydrate all child instances", () => {
      const value: { me?: any } = {};
      value.me = value;

      const rehydrated = defaultInstance.fromJSON(defaultInstance.toJSON(value)) as typeof value;
      expect(rehydrated).toBeInstanceOf(Object);
      expect(rehydrated.me).toBe(rehydrated);
    })
    it("should rehydrate sibling instances", () => {
      const child = {};
      const value = { a: child, b: child };

      const rehydrated = defaultInstance.fromJSON(defaultInstance.toJSON(value)) as typeof value;
      expect(rehydrated).toBeInstanceOf(Object);
      expect(rehydrated.a).toBe(rehydrated.b);
    })
    it("should rehydrate multiple instances", () => {
      const a = {};
      const b = {};
      const value = { left: { a, b}, right: {a,b} };

      const rehydrated = defaultInstance.fromJSON(defaultInstance.toJSON(value)) as typeof value;
      expect(rehydrated).toBeInstanceOf(Object);
      expect(rehydrated.left.a).toBe(rehydrated.right.a);
      expect(rehydrated.left.b).toBe(rehydrated.right.b);

      console.log(defaultInstance.toJSON(value));
    })
  })
});
