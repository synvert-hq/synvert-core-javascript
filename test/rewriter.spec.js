const fs = require('fs');
const mock = require('mock-fs');

const Rewriter = require('../lib/rewriter');

describe('static register', () => {
  it('registers and fetches', () => {
    const rewriter = new Rewriter('group', 'name', () => {});
    expect(Rewriter.fetch('group', 'name')).toBe(rewriter);

    expect(Rewriter.fetch('new group', 'name')).toBeUndefined();
    expect(Rewriter.fetch('group', 'new name')).toBeUndefined();
  });

  it('calls', () => {
    let run = false
    const rewriter = new Rewriter('group', 'name', () => { run = true });
    Rewriter.call('group', 'name')
    expect(run).toBe(true)
  });

  describe("process", () => {
    test("writes new code to file", () => {
      const rewriter = new Rewriter('snippet group', 'snippet name', () => {
        description('this is a snippet description.')
        withFiles('*.js', function() {
          withNode({ type: 'ClassDeclaration', id: { name: 'FooBar' } }, () => {
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
