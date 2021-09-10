# CHANGELOG

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

* Ignore node_modues
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
