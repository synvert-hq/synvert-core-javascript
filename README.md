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

By default, you can't run the above snippet directly, synvert-core provides 2 utilities to convert it to sync and async verions.

```javascript
Synvert.evalSnippetSync(snippetSourceCode);

// Then it converts snippet code to the following sync version

const Synvert = require("synvert-core");

new Synvert.Rewriter("jquery", "deprecate-event-shorthand", function () {
  this.description('jQuery event shorthand is deprecated.');

  this.withinFilesSync(Synvert.ALL_FILES, function () {
    // $('#test').click(function(e) { });
    // =>
    // $('#test').on('click', function(e) { });
    this.findNode(`.CallExpression[callee=.MemberExpression[object IN (/^\\$/ /^jQuery/)][property=click]]
                [arguments.length=1][arguments.0.type IN (FunctionExpression ArrowFunctionExpression)]`, () => {
      this.replace("callee.property", { with: "on" });
      this.insert("'click', ", { to: "arguments.0", at: "beginning" });
    });

    // $form.submit();
    // =>
    // $form.trigger('submit');
    this.withNode(
      {
        nodeType: "CallExpression",
        callee: { nodeType: "MemberExpression", object: /^\$/, property: 'submit' },
        arguments: { length: 0 },
      },
      () => {
        this.replace(["callee.property", "arguments"], { with: "trigger('submit')" });
      }
    );
  });
});
```

```javascript
await Synvert.evalSnippet(snippetSourceCode);

// Then it converts snippet code to the following async version

const Synvert = require("synvert-core");

new Synvert.Rewriter("jquery", "deprecate-event-shorthand", async function () {
  this.description('jQuery event shorthand is deprecated.');

  await this.withinFiles(Synvert.ALL_FILES, async function () {
    // $('#test').click(function(e) { });
    // =>
    // $('#test').on('click', function(e) { });
    this.findNode(`.CallExpression[callee=.MemberExpression[object IN (/^\\$/ /^jQuery/)][property=click]]
                [arguments.length=1][arguments.0.type IN (FunctionExpression ArrowFunctionExpression)]`, () => {
      this.replace("callee.property", { with: "on" });
      this.insert("'click', ", { to: "arguments.0", at: "beginning" });
    });

    // $form.submit();
    // =>
    // $form.trigger('submit');
    this.withNode(
      {
        nodeType: "CallExpression",
        callee: { nodeType: "MemberExpression", object: /^\$/, property: 'submit' },
        arguments: { length: 0 },
      },
      () => {
        this.replace(["callee.property", "arguments"], { with: "trigger('submit')" });
      }
    );
  });
});
```

DSL are as follows

* [configure](./Rewriter.html#configure) - configure the rewriter, set sourceTyep and parser
* [description](./Rewriter.html#description) - set description of the rewriter
* [ifNode](./Rewriter.html#ifNode) - check if node version is greater than or equal to the specified node version
* [ifNpm](./Rewriter.html#ifNpm) - check the version of the specifid npm package
* [addFileSync](./Rewriter.html#addFileSync) - sync to add a new file
* [addFile](./Rewriter.html#addFile) - async to add a new file
* [removeFileSync](./Rewriter.html#removeFileSync) - sync to remove a file
* [removeFile](./Rewriter.html#removeFile) - async to remove a file
* [withinFilesSync](./Rewriter.html#withinFiles) - sync to find specified files
* [withinFiles](./Rewriter.html#withinFiles) - async to find specified files
* [withinFileSync](./Rewriter.html#withinFile) - alias to withinFilesSync
* [withinFile](./Rewriter.html#withinFile) - alias to withinFiles
* [addSnippetSync](./Rewriter.html#addSnippetSync) - sync to call another snippet
* [addSnippet](./Rewriter.html#addSnippet) - sync to call another snippet

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

* [callHelperSync](./Instance.html#callHelperSync) - sync to call a helper to run shared code
* [callHelper](./Instance.html#callHelper) - async to call a helper to run shared code
* [mutationAdapter](./Instance.html#mutationAdapter) - get a [mutation adapter](https://github.com/xinminlabs/node-mutation-javascript/blob/main/src/adapter.ts) to get some helpers