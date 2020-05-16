# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.1.1](https://github.com/FRSource/frs-replace/compare/v2.1.0...v2.1.1) (2020-05-16)


### Bug Fixes

* cli path for binary command ([2546905](https://github.com/FRSource/frs-replace/commit/254690572e86d31c60aaac5b234fbb6b5d11eabf))

## [2.1.0](https://github.com/FRSource/frs-replace/compare/v2.0.1...v2.1.0) (2020-05-15)


### Features

* change npm package name - add it [@frsource](https://github.com/frsource) scope ([0208a90](https://github.com/FRSource/frs-replace/commit/0208a900c88f29ac167e06524ba583ea62eeb457))
* rename FRS-replace to frs-replace ([#73](https://github.com/FRSource/frs-replace/issues/73)) ([8547685](https://github.com/FRSource/frs-replace/commit/8547685e09e133265ba493b8e5349adf8298b463))

### [2.0.1](https://github.com/FRSource/frs-replace/compare/v2.0.0...v2.0.1) (2019-11-01)

## [2.0.0](https://github.com/FRSource/frs-replace/compare/v1.0.1...v2.0.0) (2019-10-21)


### ⚠ BREAKING CHANGES

* **package:** fast-glob does not support backslashes in glob patterns anymore, always use forward-slashes

### Features

* better parallelization ([4d90537](https://github.com/FRSource/frs-replace/commit/4d905375f0550a097d9464b742d13515e1314c94)), closes [#17](https://github.com/FRSource/frs-replace/issues/17) [#10](https://github.com/FRSource/frs-replace/issues/10) [#19](https://github.com/FRSource/frs-replace/issues/19)


### Bug Fixes

* **package:** update fast-glob to version 3.1.0 ([#44](https://github.com/FRSource/frs-replace/issues/44)) ([735785d](https://github.com/FRSource/frs-replace/commit/735785dfdc99869096cd4c6a3be60fb8f796d54b))
* **package:** update write to version 2.0.0 ([#36](https://github.com/FRSource/frs-replace/issues/36)) ([d0b7ffd](https://github.com/FRSource/frs-replace/commit/d0b7ffdbbd668262860e130551e64b54840ac782))
* **package:** update yargs to version 14.2.0 ([#45](https://github.com/FRSource/frs-replace/issues/45)) ([6df29e4](https://github.com/FRSource/frs-replace/commit/6df29e4e9bda262f9467d85349cd1c61d260c328)), closes [#35](https://github.com/FRSource/frs-replace/issues/35)

## [1.0.1](https://github.com/FRSource/frs-replace/compare/v1.0.0...v1.0.1) (2019-10-18)


### Bug Fixes

* **package:** update yargs to version 13.2.2 ([749b721](https://github.com/FRSource/frs-replace/commit/749b72144049d9c900b04dd2b14473938af963d7)), closes [#20](https://github.com/FRSource/frs-replace/issues/20)



<a name="1.0.0"></a>
# [1.0.0](https://github.com/FRSource/frs-replace/compare/v0.1.2...v1.0.0) (2018-11-14)


### Features

* **input:** add support for globbing matching ([#14](https://github.com/FRSource/frs-replace/issues/14)) ([b289ffe](https://github.com/FRSource/frs-replace/commit/b289ffe)), closes [#3](https://github.com/FRSource/frs-replace/issues/3)
* **sync:** Sync speed improvements ([#18](https://github.com/FRSource/frs-replace/issues/18)) ([4ff2a1e](https://github.com/FRSource/frs-replace/commit/4ff2a1e)), closes [#17](https://github.com/FRSource/frs-replace/issues/17)


### BREAKING CHANGES

* **input:** api options rename: 'inputOptions' to 'inputReadOptions', 'outputOptions' to 'outputWriteOptions'
* **input:** cli options rename: 'in-opts' to 'i-read-opts', 'out-opts' to 'o-write-opts'
Add possibility to set input or output options through cli
Docs - fixes & new example
Turn off camel-case-expansion to speed up yargs a bit



<a name="0.1.2"></a>
## [0.1.2](https://github.com/FRSource/frs-replace/compare/v0.1.1...v0.1.2) (2018-10-19)



<a name="0.1.1"></a>
## [0.1.1](https://github.com/FRSource/frs-replace/compare/v0.1.0...v0.1.1) (2018-10-17)



<a name="0.1.0"></a>
# [0.1.0](https://github.com/FRSource/frs-replace/compare/v0.0.6...v0.1.0) (2018-10-17)


### Features

* **cli:** Input & output options ([06e8363](https://github.com/FRSource/frs-replace/commit/06e8363)), closes [#7](https://github.com/FRSource/frs-replace/issues/7)



<a name="0.0.6"></a>
## [0.0.6](https://github.com/FRSource/frs-replace/compare/v0.0.5...v0.0.6) (2018-10-15)


### Bug Fixes

* **docs:** positionals table ([7168474](https://github.com/FRSource/frs-replace/commit/7168474)), closes [#6](https://github.com/FRSource/frs-replace/issues/6)



<a name="0.0.5"></a>
## [0.0.5](https://github.com/FRSource/frs-replace/compare/v0.0.4...v0.0.5) (2018-10-15)


### Bug Fixes

* **docs:** styling & API usage/examples ([cba85dc](https://github.com/FRSource/frs-replace/commit/cba85dc)), closes [#1](https://github.com/FRSource/frs-replace/issues/1)
* **node:** expose public node API ([c727dff](https://github.com/FRSource/frs-replace/commit/c727dff)), closes [#5](https://github.com/FRSource/frs-replace/issues/5)



<a name="0.0.4"></a>
## [0.0.4](https://github.com/FRSource/frs-replace/compare/v0.0.3...v0.0.4) (2018-10-15)



<a name="0.0.3"></a>
## [0.0.3](https://github.com/FRSource/frs-replace/compare/v0.0.2...v0.0.3) (2018-10-15)



<a name="0.0.2"></a>
## [0.0.2](https://github.com/FRSource/frs-replace/compare/v0.0.1...v0.0.2) (2018-10-15)


### Bug Fixes

* **npm:** lowercase package name to meet npm requirements ([06daa6a](https://github.com/FRSource/frs-replace/commit/06daa6a))



<a name="0.0.1"></a>
## 0.0.1 (2018-10-15)
