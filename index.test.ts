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
    it('should preserve object proto when deserializing', () => {
      const parser = new XJSON();
      class Example {};

      parser.registerClass(
        Example,
        "Example"
      );

      expect(parser.fromJSON(parser.toJSON(new Example))).toBeInstanceOf(Example)
    })
  })
  describe("registerNominal", () => {
    it("should pass serialized values to the factory")
  })
  describe("registerNominalClass", () => {
    it("should pass serialized values to the constructor")
  })
  describe("builtin types", () => {
    // it('should support UInt8Array', () => {
    //   expect(defaultInstance.fromJSON(defaultInstance.toJSON(new UInt8Array()))).toBeInstanceOf(UInt8Array)
    // })
    it('should support RegExp', () => {
      expect(new RegExp("foo", "g")).toEqual(new RegExp("foo", "g"))
      expect(new RegExp("foo")).not.toEqual(new RegExp("foo", "g"))
      expect(defaultInstance.fromJSON(defaultInstance.toJSON(new RegExp("foo", "g")))).toEqual(new RegExp("foo", "g"))
    })
    it('should support Map', () => {
      expect(defaultInstance.fromJSON(defaultInstance.toJSON(new Map()))).toBeInstanceOf(Map)
    })
    it('should support Set', () => {
      expect(defaultInstance.fromJSON(defaultInstance.toJSON(new Set()))).toBeInstanceOf(Set)
    })
    it('should support Date', () => {
      expect(defaultInstance.fromJSON(defaultInstance.toJSON(new Date()))).toBeInstanceOf(Date)
    })
    it('should support Error', () => {
      expect(defaultInstance.fromJSON(defaultInstance.toJSON(new Error()))).toBeInstanceOf(Error)
    })
    // it('should support BigInt', () => {
    //   expect(defaultInstance.fromJSON(defaultInstance.toJSON(new BigInt()))).toBeInstanceOf(BigInt)
    // })
    // it('should support NaN', () => {

    // })
    // it('should support Positive Infinity')
    // it('should support Negatitive Infinity')
  })
});
