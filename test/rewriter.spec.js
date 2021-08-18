const fs = require('fs');
require("../lib/ast-node-ext");

const mock = require('mock-fs');

const Rewriter = require('../lib/rewriter');

describe('static register', () => {
  it('registers and fetches', () => {
    rewriter = new Rewriter('group', 'rewriter', () => {});
    expect(Rewriter.fetch('group', 'rewriter')).toBe(rewriter);
  });

  describe("process", () => {
    test("writes new code to file", () => {
      const rewriter = new Rewriter('group', 'rewriter', function() {
        withFiles('*.js', function() {
          withNode({ type: 'ClassDeclaration', id: { name: 'FooBar' } }, function() {
            replace('id', { with: 'Synvert' });
          });
        });
      });
      const input = `class FooBar {}`
      const output = `class Synvert {}`
      mock({ 'code.js': input })
      rewriter.process()
      expect(fs.readFileSync('code.js', 'utf8')).toEqual(output)
      mock.restore()
    });
  });
});