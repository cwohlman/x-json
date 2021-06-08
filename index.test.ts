import {XJSON} from './index'

describe("XJSON", () => {
  describe("Unconfigured parser", () => {
    it("should parse plain JSON as objects", () => {
      const parser = new XJSON();
      
      expect(parser.parse("{}")).toEqual(JSON.parse("{}"))
    })
    it("should stringify objects as plain JSON", () => {
      const parser = new XJSON();
      
      expect(parser.stringify({})).toEqual(JSON.stringify({}))
    })
    it("should call fromJSON when parsing", () => {
      const parser = new XJSON();

      parser.toJSON = (a) => {
        return 1;
      }
      
      expect(parser.stringify({})).toEqual(JSON.stringify(1))
    })
  })
})
