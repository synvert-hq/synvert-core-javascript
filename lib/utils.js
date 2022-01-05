const dedent = require("dedent");

const indent = (str, count) => str.split("\n").map(line => {
  if (/^\s*$/.test(line)) {
    return line;
  }
  return " ".repeat(count) + line;
}).join("\n");

module.exports = { indent, dedent }