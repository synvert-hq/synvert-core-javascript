const { Node } = require("acorn");

Node.prototype.name = function() {
  if (this.type === "ClassDeclaration") {
    return this.id.name;
  }
}