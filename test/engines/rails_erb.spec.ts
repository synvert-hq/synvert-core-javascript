import * as RailsErb from "../../src/engines/rails_erb";

describe("RailsErb", () => {
  describe("encode", () => {
    it("encodes erb", () => {
      const erb = `
        <html>
          <head>
            <script src="foobar.js"></script>
          </head>
          <body>
            <%= javascript_tag do %>
              var foo = "bar";
            <% end %>
            <script>
              var bar = "foo";
            </script>
          </body>
        </html>
      `;
      const encodedErb = RailsErb.encode(erb);
      expect(encodedErb).toContain('var foo = "bar";');
      expect(encodedErb).toContain('var bar = "foo";');
      expect(encodedErb).not.toContain("javascript_tag");
      expect(encodedErb).not.toContain("script");
      expect(erb.indexOf("var foo")).toEqual(encodedErb.indexOf("var foo"));
      expect(erb.indexOf("var bar")).toEqual(encodedErb.indexOf("var bar"));
    });
  });
});
