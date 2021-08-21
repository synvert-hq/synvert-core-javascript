const fs = require('fs');
const mock = require('mock-fs');

const Rewriter = require('../lib/rewriter');

describe('static register', () => {
  it('registers and fetches', () => {
    rewriter = new Rewriter('snippet group', 'snippet name', () => {});
    expect(Rewriter.fetch('snippet group', 'snippet name')).toBe(rewriter);
  });

  describe("process", () => {
    test("writes new code to file", () => {
      const rewriter = new Rewriter('snippet group', 'snippet name', function() {
        description('this is a snippet description.')
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
      expect(rewriter.description()).toEqual(`this is a snippet description.`)
      expect(fs.readFileSync('code.js', 'utf8')).toEqual(output)
      mock.restore()
    });
  });
});