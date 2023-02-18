import * as Html from "../../src/engines/html";

describe("Html", () => {
  describe("encode", () => {
    it("encodes html", () => {
      const html = `
        <html>
          <head>
            <script src="foobar.js"></script>
          </head>
          <body>
            <script type="text/javascript">
              var foo = "bar";
            </script>
            <script>
              var bar = "foo";
            </script>
          </body>
        </html>
      `;
      const encodedHtml = Html.encode(html);
      expect(encodedHtml).toContain('var foo = "bar";');
      expect(encodedHtml).toContain('var bar = "foo";');
      expect(encodedHtml).not.toContain('script');
      expect(html.indexOf("var foo")).toEqual(encodedHtml.indexOf("var foo"))
      expect(html.indexOf("var bar")).toEqual(encodedHtml.indexOf("var bar"))
    });
  });
});