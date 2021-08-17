const fs = require('fs');
require("../lib/ast-node-ext");

const mock = require('mock-fs');

const Instance = require("../lib/instance");

describe("Instance", () => {
  describe("process", () => {
    test("writes new code to file", () => {
      const instance = new Instance({}, '*.js', function() {
        this.withNode({ type: 'ClassDeclaration', id: { name: 'FooBar' } }, function() {
          this.replace('id', { with: 'Synvert' });
        });
      });
      const input = `class FooBar {}`
      const output = `class Synvert {}`
      mock({ 'code.js': input })
      instance.process()
      expect(fs.readFileSync('code.js', 'utf8')).toEqual(output)
      mock.restore()
    });
  });
});