 # synvert-core-javascript

<img src="https://synvert.net/img/logo_96.png" alt="logo" width="32" height="32" />

![Main workflow](https://github.com/xinminlabs/synvert-core-javascript/actions/workflows/main.yml/badge.svg)
[![AwesomeCode Status for xinminlabs/synvert-core-javascript](https://awesomecode.io/projects/24366d99-29b2-407f-a7b8-9773e59f8cd0/status)](https://awesomecode.io/repos/xinminlabs/synvert-core-javascript)

Synvert core provides a set of DSLs to rewrite javascript code. e.g.

```javascript
const Synvert = require("synvert-core");

new Synvert.Rewriter("jquery", "deprecate-event-shorthand", () => {
  description('jQuery event shorthand is deprecated.');

  withinFiles(Synvert.ALL_FILES, function () {
    // $('#test').click(function(e) { });
    // =>
    // $('#test').on('click', function(e) { });
    findNode(`.CallExpression[callee=.MemberExpression[object IN (/^\\$/ /^jQuery/)][property=click]]
                [arguments.length=1][arguments.0.type IN (FunctionExpression ArrowFunctionExpression)]`, () => {
      replace("callee.property", { with: "on" });
      insert("'click', ", { to: "arguments.0", at: "beginning" });
    });

    // $form.submit();
    // =>
    // $form.trigger('submit');
    withNode(
      {
        nodeType: "CallExpression",
        callee: { nodeType: "MemberExpression", object: /^\$/, property: 'submit' },
        arguments: { length: 0 },
      },
      () => {
        replace(["callee.property", "arguments"], { with: "trigger('submit')" });
      }
    );
  });
});
```

Want to see more examples, check out [synvert-snippets-javascript](https://github.com/xinminlabs/synvert-snippets-javascript).

Want to use the CLI, check out [synvert-javascript](https://github.com/xinminlabs/synvert-javascript).

DSL are as follows

* [configure](./Rewriter.html#configure) - configure the rewriter, set sourceTyep and parser
* [description](./Rewriter.html#description) - set description of the rewriter
* [ifNode](./Rewriter.html#ifNode) - check if node version is greater than or equal to the specified node version
* [ifNpm](./Rewriter.html#ifNpm) - check the version of the specifid npm package
* [addFile](./Rewriter.html#addFile) - add a new file
* [removeFile](./Rewriter.html#removeFile) - remove a file
* [withinFiles](./Rewriter.html#withinFiles) - find specified files
* [withinFile](./Rewriter.html#withinFile) - alias to withinFiles
* [addSnippet](./Rewriter.html#addSnippet) - call another snippet

Scopes:

* [withNodes](./Instance.html#withNodes) - recursively find matching ast nodes
* [withNode](./Instance.html#withNode) - alias to withNode
* [findNode](./Instance.html#findNode) - alias to withNode
* [gotoNode](./Instance.html#gotoNode) - go to a child node

Conditions:

* [ifExistNode](./Instance.html#ifExistNode) - check if matching node exist in the child nodes
* [unlessExistNode](./Instance.html#unlessExistNode) - check if matching node does not exist in the child nodes
* [ifOnlyExistNode](./Instance.html#ifOnlyExistNode) - check if current node has only one child node and the child node matches
* [ifAllNodes](./Instance.html#ifAlNodes) - check if all nodes match or not

Actions:

* [append](./Instance.html#append) - append the code to the bottom of the current node body
* [prepend](./Instance.html#prepend) - prepend the code to the top of the current node body
* [insert](./Instance.html#insert) - insert code
* [insertAfter](./Instance.html#insertAfter) - insert the code next to the current node
* [insertBefore](./Instance.html#insertBefore) - insert the code previous to the current node
* [replace](./Instance.html#replace) - replace the code of specified child nodes
* [deleteNode](./Instance#deleteNode) - delete code the code of specified child nodes
* [remove](./Instance.html#remove) - remove the whole code of current node
* [replaceWith](./Instance.html#replaceWith) - replace the whole code of current node
* [noop](./Instance.html#noop) - no operation

Others:

* [callHelper](./Instance.html#callHelper) - call a helper to run shared code
* [queryAdapter](./Instance.html#queryAdapter) - get a [query adapter](https://github.com/xinminlabs/node-query-javascript/blob/main/src/adapter.ts) to get some helper methods
* [mutationAdapter](./Instance.html#mutationAdapter) - get a [mutation adapter](https://github.com/xinminlabs/node-mutation-javascript/blob/main/src/adapter.ts) to get some helper methods