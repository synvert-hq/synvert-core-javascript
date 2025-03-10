 # synvert-core-javascript

<img src="https://synvert.net/img/logo_96.png" alt="logo" width="32" height="32" />

![Main workflow](https://github.com/synvert-hq/synvert-core-javascript/actions/workflows/main.yml/badge.svg)
[![AwesomeCode Status for synvert-hq/synvert-core-javascript](https://awesomecode.io/projects/24366d99-29b2-407f-a7b8-9773e59f8cd0/status)](https://awesomecode.io/repos/synvert-hq/synvert-core-javascript)

Synvert core provides a set of DSLs to rewrite javascript code. e.g.

```javascript
const Synvert = require("@synvert-hq/synvert-core");

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

Want to see more examples, check out [synvert-snippets-javascript](https://github.com/synvert-hq/synvert-snippets-javascript).

Want to use the CLI, check out [synvert-javascript](https://github.com/synvert-hq/synvert-javascript).

DSL are as follows

* [configure](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#configure) - configure the rewriter, set sourceTyep and parser
* [description](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#description) - set description of the rewriter
* [ifNode](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#ifNode) - check if node version is greater than or equal to the specified node version
* [ifNpm](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#ifNpm) - check the version of the specifid npm package
* [addFile](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#addFile) - add a new file
* [addFileSync](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#addFileSync) - add a new file
* [removeFile](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#removeFile) - remove a file
* [removeFileSync](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#removeFileSync) - remove a file
* [renameFile](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#renameFile) - rename filepath to new filepath
* [renameFileSync](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#renameFileSync) - rename filepath to new filepath
* [withinFiles](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#withinFiles) - find specified files
* [withinFilesSync](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#withinFilesSync) - find specified files
* [withinFile](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#withinFile) - alias to withinFiles
* [withinFileSync](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#withinFileSync) - alias to withinFilesSync
* [addSnippet](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#addSnippet) - call another snippet
* [addSnippetSync](https://synvert-hq.github.io/synvert-core-javascript/Rewriter.html#addSnippetSync) - call another snippet

Scopes:

* [withinNode](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#withinNode) - recursively find matching ast nodes
* [withinNodeSync](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#withinNodeSync) - recursively find matching ast nodes
* [withNode](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#withNode) - alias to withNode
* [withNodeSync](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#withNodeSync) - alias to withNodeSync
* [findNode](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#findNode) - alias to withNode
* [findNodeSync](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#findNodeSync) - alias to withNodeSync
* [gotoNode](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#gotoNode) - go to a child node
* [gotoNodeSync](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#gotoNodeSync) - go to a child node

Conditions:

* [ifExistNode](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#ifExistNode) - check if matching node exist in the child nodes
* [ifExistNodeSync](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#ifExistNodeSync) - check if matching node exist in the child nodes
* [unlessExistNode](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#unlessExistNode) - check if matching node does not exist in the child nodes
* [unlessExistNodeSync](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#unlessExistNodeSync) - check if matching node does not exist in the child nodes
* [ifOnlyExistNode](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#ifOnlyExistNode) - check if current node has only one child node and the child node matches
* [ifOnlyExistNodeSync](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#ifOnlyExistNodeSync) - check if current node has only one child node and the child node matches
* [ifAllNodes](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#ifAlNodes) - check if all nodes match or not
* [ifAllNodesSync](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#ifAlNodesSync) - check if all nodes match or not

Actions:

* [append](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#append) - append the code to the bottom of the current node body
* [prepend](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#prepend) - prepend the code to the top of the current node body
* [insert](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#insert) - insert code
* [insertAfter](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#insertAfter) - insert the code next to the current node
* [insertBefore](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#insertBefore) - insert the code previous to the current node
* [replace](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#replace) - replace the code of specified child nodes
* [delete](https://synvert-hq.github.io/synvert-core-javascript/Instance#delete) - delete code the code of specified child nodes
* [remove](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#remove) - remove the whole code of current node
* [replaceWith](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#replaceWith) - replace the whole code of current node
* [indent](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#indent) - indent the code of current node
* [noop](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#noop) - no operation
* [group](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#group) - group actions

Others:

* [callHelper](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#callHelper) - call a helper to run shared code
* [callHelperSync](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#callHelperSync) - call a helper to run shared code
* [wrapWithQuotes](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#wrapWithQuotes) - wrap string code with single or double quotes
* [appendSemicolon](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#appendSemicolon) - append semicolon to the end of the code
* [addLeadingSpaces](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#addLeadingSpaces) - add leading spaces to the code
* [indentCode](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#indentCode) - indent each line in a string code

Properties:
* [filePath](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#filePath) - get the file path
* [currentNode](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#currentNode) - current ast node
* [mutationAdapter](https://synvert-hq.github.io/synvert-core-javascript/Instance.html#mutationAdapter) - get a [mutation adapter](https://github.com/synvert-hq/node-mutation-javascript/blob/main/src/adapter.ts) to get some helper methods