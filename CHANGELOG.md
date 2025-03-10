# CHANGELOG

## 2.24.3 (2025-03-09)

* Add type `NewLineInsertOptions`

## 2.24.2 (2025-03-09)

* Add `fixIndent` to `InsertOption`

## 2.24.1 (2025-03-09)

* Add `await` to `helperFn`

## 2.24.0 (2025-02-28)

* Allow passing function to helper

## 2.23.0 (2025-02-28)

* Rename `indent` to `indentCode`
* Add `indent` dsl
* Insert `async` to `callHelper` arguments.-1

## 2.22.0 (2025-01-20)

* Add `evaluateContent` to safely evaluate snippet/helper content

## 2.21.2 (2025-01-20)

* Rewrite `evalHelper` to avoid using `eval`
* Rewrite `evalSnippet` to avoid using `eval`

## 2.21.1 (2024-10-19)

* Support node v22 on github actions

## 2.21.0 (2024-05-24)

* Read node version from `package.json`

## 2.20.1 (2024-04-25)

* Eval snippet on gist.github.com

## 2.20.0 (2024-04-24)

* Add `Configuration.strict`
* Skip NpmVersion match if `Configuration.strict` is false
* Skip NodeVersion match if `Configuration.strict` is false

## 2.19.4 (2024-04-10)

* Use `spawnSync` for git command

## 2.19.3 (2024-04-08)

* Require `@synvert-hq/synvert-core`

## 2.19.2 (2024-04-08)

* Rename package to `@synvert-hq/synvert-core`

## 2.19.1 (2024-04-08)

* Moving from `@xinminlabs` to `@synvert-hq`

## 2.19.0 (2024-02-19)

* Add `Configuration.respectGitignore`
* Glob files with `git check-ignore` if `Configuration.respectIgnore` is true

## 2.18.1 (2023-12-20)

* Update `@xinminlabs/node-mutation` to 1.17.1
* Make `group` dsl work both sync and async

## 2.18.0 (2023-12-01)

* Update `@xinminlabs/node-query` to 1.19.0
* Update `@xinminlabs/node-mutation` to 1.16.0
* Initialize `NodeQuery` and `NodeMutation` with `adapter`

## 2.17.8 (2023-11-24)

* Update `@xinminlabs/node-mutation` to 1.15.11

## 2.17.7 (2023-11-18)

* Update `@xinminlabs/node-mutation` to 1.15.9

## 2.17.6 (2023-10-20)

* Update `@xinminlabs/node-mutation` to 1.15.3
* Fix `insertAfter` to child node

## 2.17.5 (2023-10-18)

* Update `@xinminlabs/node-mutation` to 1.15.1
* Prepare before `processSync`

## 2.17.4 (2023-10-18)

* Update `@xinminlabs/node-mutation` to 1.15.0
* Remove `newLinePosition` option from `insertAfter` dsl

## 2.17.3 (2023-10-15)

* Update `@xinminlabs/node-mutation` to 1.14.1
* Update `insert`, `delete` and `remove` options

## 2.17.2 (2023-10-09)

* Allow `indent` negative value

## 2.17.1 (2023-10-09)

* Add `group` to `ACTION_METHODS`

## 2.17.0 (2023-09-29)

* Update `@xinminlabs/node-mutation` to 1.13.0
* Add `group` dsl

## 2.16.4 (2023-07-16)

* Do not rename file if options `writeToFile` is false

## 2.16.3 (2023-07-09)

* Update `@xinminlabs/node-query` to 1.18.2
* Update `@xinminlabs/node-mutation` to 1.12.0

## 2.16.2 (2023-06-07)

* Fix file path when sync parse code

## 2.16.1 (2023-06-07)

* Fix jsdoc
* Add default value to `insertAfter` and `insertBefore` apis
* Remove `newLinePosition` option for `insertBefore` api

## 2.16.0 (2023-06-06)

* Export `ALL_CSS_FILES`, `ALL_LESS_FILES`, `ALL_SASS_FILES`, and `ALL_SCSS_FILES`
* Drop `renameFileTo` from Instance and add `renameFile` to Rewriter
* Fix `insertAfter` and `insertBefore` code

## 2.15.0 (2023-06-06)

* Remove `ALLOW_INSERT_AT_SAME_POSITION` strategy
* Add `GonzalesPe` to parse css, less, sass, and scss
* Add new api `renameFileTo` and `renameFileToSync`

## 2.14.0 (2023-06-01)

* Add `Helper` for shared snippet
* Rewrite `callHelper`
* Update `@xinminlabs/node-query` to 1.18.0 and `@xinminlabs/node-mutation` to 1.9.0

## 2.13.0 (2023-04-19)

* Add `type` to `Action`
* `addFile` work for test
* `removeFile` work for test
* Update `@xinminlabs/node-mutation` to 1.8.0

## 2.12.2 (2023-03-18)

* Use Generic Type
* Update `@xinminlabs/node-mutation` to 1.17.0 and `@xinminlabs/node-query` to 1.7.0

## 2.12.1 (2023-03-09)

* Add `skipFirstLine` option to `indent` api
* Update `@xinminlabs/node-mutation` to 1.6.2

## 2.12.0 (2023-02-18)

* Support Html files
* Support Rails Erb files

## 2.11.1 (2023-02-09)

* Fix typo `ArrayLiteralExpression`

## 2.11.0 (2023-02-09)

* Add `tabSize` option to `addLeadingSpaces`
* Rename `deleteNode` dsl to `delete`

## 2.10.0 (2023-02-08)

* Add `Configuration#tabWidth`
* Add `Instance#addLeadingSpaces`

## 2.9.0 (2023-02-08)

* Add `Configuration#semi`
* Add `Instance#appendSemicolon`

## 2.8.0 (2023-02-07)

* Add `Instance#wrapWithQuotes`

## 2.7.0 (2023-02-07)

* Add `Configuration#singleQuote`
* Add `quote` util

## 2.6.0 (2023-02-07)

* Insert `require("synvert-core")` if missing in snippet

## 2.5.0 (2023-02-06)

* Remove `Instance#queryAdapter`

## 2.4.4 (2023-01-01)

* Heredoc for `description`

## 2.4.3 (2022-12-30)

* Use Typescript instead of Espree by default

## 2.4.2 (2022-12-29)

* Add `Instance#mutationAdapter` and `Instance#queryAdapter` when test

## 2.4.1 (2022-12-18)

* Fix typo

## 2.4.0 (2022-12-17)

* Rename `largeFileSizeThreshold` Configuration to `maxFileSize`

## 2.3.0 (2022-12-17)

* Add `Configuration#largeFileSizeThreshold`

## 2.2.1 (2022-12-16)

* Update `this.mutationAdapter` and `this.queryAdapter` properly
* Await `Rewriter#process` in `addSnippet`
* Do not add `this.` before queryAdapter and mutationAdapter

## 2.2.0 (2022-12-16)

* Process scopes in serial
* One Instance handles only one file
* Add `Instance#filePath`, `Instance#mutationAdapter` and `Instance#queryAdapter` properties

## 2.1.0 (2022-12-13)

* Move `indent` to be an Instance method
* Add `queryAdapter` method
* Define both sync and async conditions and scopes
* Remove `Instance#currentFilePath` and `Instance#currentFileSource`

## 2.0.5 (2022-12-10)

* Await `callHelper`
* Remove unnecessary async/await

## 2.0.4 (2022-12-10)

* Rewrite snippet twice still gets the same result

## 2.0.3 (2022-12-08)

* Expose `rewriteSnippetToSyncVersion` and `rewriteSnippetToAsyncVersion`

## 2.0.2 (2022-12-08)

* Load snippet will do rewrite internally

## 2.0.1 (2022-12-08)

* Rewrite snippet before eval

## 2.0.0 (2022-12-07)

* Drop global variables
* Add utilities to rewrite snippets to sync and async versions

## 1.25.2 (2022-11-30)

* Fix load file snippet

## 1.25.1 (2022-11-30)

* Format remote snippet url

## 1.25.0 (2022-11-30)

* Load snippet from github
* export `SnippetNotFoundError`

## 1.24.0 (2022-11-25)

* Add `Rewriter#affectedFiles` after processing
* Set `types` in `package.json`

## 1.23.1 (2022-10-30)

* `Condition` `options` is optional

## 1.23.0 (2022-10-29)

* Add `elseFunc` to all conditions

## 1.22.2 (2022-10-28)

* Revert "remove EspreeAdapter#getIndent"
* Use `Adapter#getIndent` for `getSource#indent`

## 1.22.1 (2022-10-28)

* node-mutation `espree` adapter `getSource` supports `fixIndent` option

## 1.22.0 (2022-10-28)

* Add global variable `mutationAdapter`
* Remove `EspreeAdapter#getIndent`
* Remove unused `ast-node-ext` and `array-ext`

## 1.21.1 (2022-10-25)

* Export `Parser` and `Strategy`

## 1.21.0 (2022-10-25)

* Add `allow_insert_at_same_position` strategy
* Uppercase for enum keys

## 1.20.0 (2022-10-24)

* `insertAfter` and `insertBefore` accept `InsertOptions`

## 1.19.0 (2022-10-18)

* Add `callHelper` dsl

## 1.18.0 (2022-10-17)

* Add `insertAfter` dsl
* Add `insertBefore` dsl

## 1.17.0 (2022-10-14)

* Condition accepts both nql and rules
* Make `findNode` as an alias to `withinNode`

## 1.16.1 (2022-10-13)

* Ignore if parse is espree and extname is ts or tsx

## 1.16.0 (2022-10-12)

* Add `addFile` dsl
* Add `removeFile` dsl

## 1.15.0 (2022-10-11)

* Fix eval a snippet
* Export `evalSnippet` function

## 1.14.0 (2022-10-10)

* Add `processWithSandbox`
* Revert "remove runInstance option"
* Remove error.ts
* `Rewriter.fetch` does not raise error if rewriter not found

## 1.13.0 (2022-10-08)

* `addSnippet` supports http url and file path
* Remove `Rewriter.execute`
* Remove `Rewriter.call`
* Remove `runInstance` option

## 1.12.1 (2022-10-07)

* Remove `Configuration.enableEcmaFeaturesJsx`

## 1.12.0 (2022-09-30)

* Add method `Rewriter.clear`

## 1.11.0 (2022-09-20)

* Add `noop` dsl

## 1.10.0 (2022-09-17)

* `QueryScope` and `WithinScope` accept a `QueryOptions`

## 1.9.5 (2022-09-05)

* Always enable jsx

## 1.9.3 (2022-09-02)

* Write absolute path

## 1.9.2 (2022-09-01)

* Export `TestResultExt`

## 1.9.1 (2022-09-01)

* Read absolute path

## 1.9.0 (2022-08-31)

* Return relative path instead of absolute path
* Use `fast-glob` instead of `node-glob`

## 1.8.0 (2022-08-30)

* Add `Configuration.onlyPaths`
* Rename `Configuration.skipFiles` to `Configuration.skipPaths`
* Set `Configuration.skipPaths` to `["**/node_modules/**"]` by default
* Rename `Configuration.path` to `Configuration.rootPath`

## 1.7.0 (2022-08-29)

* Use `NodeMutation#test` method

## 1.6.4 (2022-08-24)

* Do not override default rewriter `options`

## 1.6.3 (2022-08-23)

* Debug `process` and `test` result

## 1.6.2 (2022-08-20)

* Add `ALL_FILES` constant

## 1.6.1 (2022-08-20)

* `testResults` only contain affected results

## 1.6.0 (2022-08-18)

* Rename `sandbox` to `runInstance` option
* Add `writeToFile` option
* Add `Rewriter#test` method

## 1.5.2 (2022-08-10)

* Explicitly set typescript adapter

## 1.5.1 (2022-08-09)

* Fix ``EspreeAdapter#rewrittenSource`` if regex does not match

## 1.5.0 (2022-08-09)

* Rename `type` to `nodeType`
* Use `NodeQuery` to read node rules
* Read target node in EspreeAdapter itself

## 1.4.0 (2022-08-05)

* Add `Rewriter.execute` method.

## 1.3.0 (2022-07-02)

* Use `NodeMutation` new api

## 1.2.1 (2022-06-24)

* Configure NodeMutation `strategy`
* Update `@xinminlabs/node-query` to 1.8.5

## 1.2.0 (2022-06-23)

* Configure `parser`
* Rename `ALL_FILES` to `ALL_JS_FILES`
* Add `ALL_TS_FILES`
* Support both `espree` and `typescript` parsers

## 1.1.0 (2022-06-21)

* Configure `sourceType`
* Add `@xinminlabs/node-mutation` and remove action
* Simplify `ast-node-ext`

## 1.0.1 (2022-06-01)

* Fix `Rewriter#description` signature
* Make `NodeVersion` and `NpmVersion` fields public
* Update `@xinminlabs/node-query` to 1.7.1

## 1.0.0 (2022-05-25)

* Add `findNode` dsl
* Migrate to Typescript

## 0.40.0 (2022-03-05)

* Remove space when removing a property in jsx element.
* Support `ClassDeclaration` `class` in `childNodeRange`.
* Support `arguments.0` for empty argument call in `childNodeRange`.
* Deprecate `fixIndentToSource`, use`toSource({ fixIndent: true })` instead.

## 0.39.0 (2022-02-27)

* Process with sandbox
* Set `Rewriter.current` properly after calling sub snippet

## 0.38.0 (2022-02-06)

* Remove `dedent` util
* Set `in` option for condition

## 0.37.0 (2022-01-28)

* Strict rewritten code regex
* Fix fixIndentToSource when end indent does not match start indent
* Add `commentOut` action
* Set currentFilePath as absolute path
* Add `minimatch` to check path

## 0.36.0 (2022-01-27)

* Process single file
* Set and get rewriter `options`

## 0.35.0 (2022-01-26)

* Use `xinminlabs-espree` instead of `espree`
* Update `eslint-visitor-keys` to 3.2.0
* Match regexp on number and node source

## 0.34.0 (2022-01-14)

* Add `to` option to `InsertAction`
* Add `Instance#currentFilePath`

## 0.33.0 (2022-01-07)

* Remove braces
* Support function name in `Node#childNodeRange`

## 0.32.0 (2022-01-06)

* Match `gt`, `gte`, `lt` and `lte` value.

## 0.31.0 (2022-01-05)

* Add `Array#fixIndentToSource`
* Catch `SyntaxError`
* Add `autoIndent` option to `ReplaceWithAction`
* Add `global.indent` and `global.dedent`

## 0.30.0 (2022-01-01)

* Add `Array#toSource`
* Dedent multiline code
* Use our own fork `eslint-visitor-keys`

## 0.29.0 (2021-10-04)

* Improve remove comma function
* Export `ALL_FILES` constant

## 0.28.0 (2021-10-03)

* Support `Property` `semicolon` in `childNodeRange`
* `options.match` can be function for `ifAll` dsl

## 0.27.0 (2021-10-02)

* Support `ImportDeclaration` specifiers `childNodeRange`

## 0.26.0 (2021-10-02)

* Add `ifAll` dsl

## 0.25.0 (2021-10-01)

* Remove unused comma after delete/remove action

## 0.24.0 (2021-09-29)

* Match `in` and `notIn` array value

## 0.23.0 (2021-09-26)

* Drop `withFiles`, add `withinFile` dsl
* Update espree github url

## 0.22.0 (2021-09-25)

* Export `Synvert.version`
* Return the range of source code in `rewrittenSource`
* Fix `remove` endPos
* Fix `remove` parameter
* Compatible with npm lockfile version 1 and 2

## 0.21.0 (2021-09-19)

* Add `ifNode` dsl
* Add `ifNpm` dsl
* Squeeze spaces and lines
* Handle array child node in `childNodeRange`
* Handle function params in `childNodeRange`

## 0.20.0 (2021-09-12)

* Add `Node#childNodeSource`
* Add `Node#fixIndentToSource`
* Match `super`
* Fix action indent
* Update espree

## 0.19.0 (2021-09-11)

* Add `Configuration.enableEcmaFeaturesJsx`
* Support `MethodDefinition` async `childNodeRange`

## 0.18.0 (2021-09-11)

* Add `Configuration.showRunProcess`
* Check `arrayBody()`

## 0.17.0 (2021-09-10)

* Add `ifOnlyExistNode` dsl
* Fix PrependAction `beginPos`

## 0.16.0 (2021-09-09)

* Add `addSnippet` dsl

## 0.15.0 (2021-09-08)

* Add `remove` dsl

## 0.14.0 (2021-09-07)

* Support .jsx
* Fix `append`/`prepend` without indent for `Program` node

## 0.13.0 (2021-09-01)

* Add `append` dsl
* Add `prepend` dsl

## 0.12.0 (2021-08-30)

* Add global `Configuration`

## 0.11.0 (2021-08-29)

* Ignore node_modules
* Set sourceType to module
* Add `NotSupportedError`
* Add `RewriterNotFoundError`

## 0.10.0 (2021-08-28)

* Call a rewriter

## 0.9.0 (2021-08-28)

* Add node `actualValue` to match rules by function
* Add `gotoNode` dsl
* Add `Array.prototype.first` and `Array.prototype.last`

## 0.8.0 (2021-08-28)

* Add `get`/`set` instance `currentFileSource`
* Match `not`
* Match regexp

## 0.7.0 (2021-08-26)

* Add `unlessExistNode` dsl

## 0.6.0 (2021-08-25)

* Add `ifExistNode` dsl
* Match `this` shorts for match `{ type: 'ThisExpression' }`
* Rename `delete` dsl to `deleteNode`

## 0.5.0 (2021-08-21)

* Add `insert` dsl
* Add `delete` dsl
* `ReplaceAction` supports multiple selectors
* `childNodeRange` supports `MemberExpression` `arguments` and `dot`

## 0.4.0 (2021-08-24)

* Add `replaceWith` dsl
* Add `Rewriter.current`
* Add `Instance.current`
* Fix `Instance#process` for multiple `withNode`
* Get nested `childNodeRange`
* Match value `id.name === id`

## 0.3.0 (2021-08-21)

* Add `ReplaceWithAction`
* Rename `Node#indent` to `Node#column`

## 0.2.0 (2021-08-19)

* Add `description` dsl
* Add github actions

## 0.1.0 (2021-08-18)

* Initial commit
