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

* [configure](https://xinminlabs.github.io/synvert-core-javascript/Rewriter.html#configure) - configure the rewriter, set sourceTyep and parser
* [description](https://xinminlabs.github.io/synvert-core-javascript/Rewriter.html#description) - set description of the rewriter
* [ifNode](https://xinminlabs.github.io/synvert-core-javascript/Rewriter.html#ifNode) - check if node version is greater than or equal to the specified node version
* [ifNpm](https://xinminlabs.github.io/synvert-core-javascript/Rewriter.html#ifNpm) - check the version of the specifid npm package
* [addFile](https://xinminlabs.github.io/synvert-core-javascript/Rewriter.html#addFile) - add a new file
* [addFileSync](https://xinminlabs.github.io/synvert-core-javascript/Rewriter.html#addFileSync) - add a new file
* [removeFile](https://xinminlabs.github.io/synvert-core-javascript/Rewriter.html#removeFile) - remove a file
* [removeFileSync](https://xinminlabs.github.io/synvert-core-javascript/Rewriter.html#removeFileSync) - remove a file
* [withinFiles](https://xinminlabs.github.io/synvert-core-javascript/Rewriter.html#withinFiles) - find specified files
* [withinFilesSync](https://xinminlabs.github.io/synvert-core-javascript/Rewriter.html#withinFilesSync) - find specified files
* [withinFile](https://xinminlabs.github.io/synvert-core-javascript/Rewriter.html#withinFile) - alias to withinFiles
* [withinFileSync](https://xinminlabs.github.io/synvert-core-javascript/Rewriter.html#withinFileSync) - alias to withinFilesSync
* [addSnippet](https://xinminlabs.github.io/synvert-core-javascript/Rewriter.html#addSnippet) - call another snippet
* [addSnippetSync](https://xinminlabs.github.io/synvert-core-javascript/Rewriter.html#addSnippetSync) - call another snippet

Scopes:

* [withinNode](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#withinNode) - recursively find matching ast nodes
* [withinNodeSync](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#withinNodeSync) - recursively find matching ast nodes
* [withNode](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#withNode) - alias to withNode
* [withNodeSync](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#withNodeSync) - alias to withNodeSync
* [findNode](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#findNode) - alias to withNode
* [findNodeSync](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#findNodeSync) - alias to withNodeSync
* [gotoNode](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#gotoNode) - go to a child node
* [gotoNodeSync](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#gotoNodeSync) - go to a child node

Conditions:

* [ifExistNode](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#ifExistNode) - check if matching node exist in the child nodes
* [ifExistNodeSync](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#ifExistNodeSync) - check if matching node exist in the child nodes
* [unlessExistNode](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#unlessExistNode) - check if matching node does not exist in the child nodes
* [unlessExistNodeSync](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#unlessExistNodeSync) - check if matching node does not exist in the child nodes
* [ifOnlyExistNode](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#ifOnlyExistNode) - check if current node has only one child node and the child node matches
* [ifOnlyExistNodeSync](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#ifOnlyExistNodeSync) - check if current node has only one child node and the child node matches
* [ifAllNodes](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#ifAlNodes) - check if all nodes match or not
* [ifAllNodesSync](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#ifAlNodesSync) - check if all nodes match or not

Actions:

* [append](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#append) - append the code to the bottom of the current node body
* [prepend](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#prepend) - prepend the code to the top of the current node body
* [insert](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#insert) - insert code
* [insertAfter](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#insertAfter) - insert the code next to the current node
* [insertBefore](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#insertBefore) - insert the code previous to the current node
* [replace](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#replace) - replace the code of specified child nodes
* [deleteNode](https://xinminlabs.github.io/synvert-core-javascript/Instance#deleteNode) - delete code the code of specified child nodes
* [remove](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#remove) - remove the whole code of current node
* [replaceWith](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#replaceWith) - replace the whole code of current node
* [noop](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#noop) - no operation

Others:

* [callHelper](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#callHelper) - call a helper to run shared code
* [callHelperSync](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#callHelperSync) - call a helper to run shared code
* [wrapWithQuotes](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#wrapWithQuotes) - wrap string code with single or double quotes
* [indent](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#indent) - set proper indent of a string code

Properties:
* [filePath](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#filePath) - get the file path
* [currentNode](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#currentNode) - current ast node
* [mutationAdapter](https://xinminlabs.github.io/synvert-core-javascript/Instance.html#mutationAdapter) - get a [mutation adapter](https://github.com/xinminlabs/node-mutation-javascript/blob/main/src/adapter.ts) to get some helper methods