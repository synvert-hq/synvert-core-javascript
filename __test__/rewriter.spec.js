const Rewriter = require('../lib/rewriter');

describe('static register', () => {
  it('registers and fetches', () => {
    rewriter = new Rewriter('group', 'rewriter', () => {});
    expect(Rewriter.fetch('group', 'rewriter')).toBe(rewriter);
  });
});