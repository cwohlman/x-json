import { XJSON } from "./index";

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

      expect(parser.toJSON("foo")).toEqual({ $string: "foo" })
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

      expect(parser.fromJSON({ $string: "foo" })).toEqual("foo")
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

      expect(parser.fromJSON(parser.toJSON("foo"))).toEqual("foo")
    })
  });
});
