# @frsource/frs-replace

[![NPM version](https://img.shields.io/npm/v/@frsource/frs-replace.svg?style=flat)](https://www.npmjs.com/package/@frsource/frs-replace)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Build Status](https://travis-ci.org/FRSource/frs-replace.svg?branch=master)](https://travis-ci.org/FRSource/frs-replace)
[![Coverage Status](https://coveralls.io/repos/github/FRSource/frs-replace/badge.svg?branch=master)](https://coveralls.io/github/FRSource/frs-replace?branch=master)
[![Dependabot badge](https://api.dependabot.com/badges/status?host=github&repo=FRSource/frs-replace)](https://dependabot.com/)
[![Dependencies status](https://david-dm.org/frsource/frs-replace.svg)](https://david-dm.org/frsource/frs-replace)
[![Dev dependencies status](https://david-dm.org/frsource/frs-replace/dev-status.svg)](https://david-dm.org/frsource/frs-replace?type=dev)
[![codebeat badge](https://codebeat.co/badges/5496a006-a13d-48cc-baeb-37c79a1f6444)](https://codebeat.co/projects/github-com-frsource-frs-replace-master)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

The fastest ([see benchmarks](#chart_with_upwards_trend-benchmarks)) CLI & Node wrapper around [javascript replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) which allows on-the-fly replacing (with or without changing input files), [globbing](https://en.wikipedia.org/wiki/Glob_(programming)), [piping](https://en.wikipedia.org/wiki/Pipeline_(Unix)) and many more!

* [:scroll: Installation](#scroll-installation)
* [:books: Node API](#books-node-api)
* [:keyboard: CLI API](#keyboard-cli-api)
* [:mag_right: Example usage](#mag_right-example-usage)
  * [1. Replace all `a` occurences with `b` from given `foo.js` file and return result / write result to the console](#1-replace-all-a-occurences-with-b-from-given-foojs-file-and-return-result--write-result-to-the-console)
  * [2. Replace all `a` occurences with `b` from given `foo.js` and save result to the `foo_replaced.js`](#2-replace-all-a-occurences-with-b-from-given-foojs-and-save-result-to-the-foo_replacedjs)
  * [3. Replace all `a` occurences with `b` from given array of files and save result to the `foo_replaced.js` using default `\n` as result-joining string](#3-replace-all-a-occurences-with-b-from-given-array-of-files-and-save-result-to-the-foo_replacedjs-using-default-n-as-result-joining-string)
  * [4. Replace all `a` occurences with `b` from all `.js` files in `foo` directory and save result to the `foo_replaced.js` using `\n/////\n` as result-joining string](#4-replace-all-a-occurences-with-b-from-all-js-files-in-foo-directory-and-save-result-to-the-foo_replacedjs-using-nn-as-result-joining-string)
  * [5. Replace all `a` occurences with `b` in given content string `abcd` and save result to the `foo_replaced.js`](#5-replace-all-a-occurences-with-b-in-given-content-string-abcd-and-save-result-to-the-foo_replacedjs)
  * [6. Replace all `a` occurences with `b` from piped stream and save it to the output file](#6-replace-all-a-occurences-with-b-from-piped-stream-and-save-it-to-the-output-file)
  * [7. Replace all `a` occurences with `b` from piped stream and pass it through `stdout` stream to the `<next-command>`](#7-replace-all-a-occurences-with-b-from-piped-stream-and-pass-it-through-stdout-stream-to-the-next-command)
  * [8. Both pipe & options styles can be mixed together, here - getting input from `-i` argument and passing output down the stream to the `<next-command>`](#8-both-pipe--options-styles-can-be-mixed-together-here---getting-input-from--i-argument-and-passing-output-down-the-stream-to-the-next-command)
* [:chart_with_upwards_trend: Benchmarks](#chart_with_upwards_trend-benchmarks)

## :scroll: Installation

```bash
yarn add @frsource/frs-replace
```

or

```bash
npm install @frsource/frs-replace
```

or download
[zipped from `@frsource/frs-replace` releases](https://github.com/FRSource/frs-replace/releases)

## :books: Node API

@frsource/frs-replace package provides 2 methods: for synchronous or for asynchronous (with promise and ES6 `async`/`await` syntax support) usage:

```javascript
const FRSReplace = require('@frsource/frs-replace');
// or
import * as FRSReplace from '@frsource/frs-replace';

FRSReplace.sync({/* options */})
FRSReplace.async({/* options */})

// you might also want to import methods separately (e.g. import only one of them):
const FRSReplaceSync = require('@frsource/frs-replace/sync');
const FRSReplaceAsync = require('@frsource/frs-replace/async');
// or
import { sync, async } from '@frsource/frs-replace';
```

Where `/* options */` is an object containing:
> Note: remember that you need to provide some input for @frsource/frs-replace to work, so **one of parameters: input or content is required**

| Option | Type | Default | Description |
  | --- | --- | --- | --- |
  | input | string or string[] | *undefined* | Path to files or [fast-glob](https://github.com/mrmlnc/fast-glob) pattern pointing to files to be read & replaced from. If multiple files specified results will be joined using `outputJoinString` option's value) |
  | inputReadOptions | string or object | utf8 | Options which are passed directly to the [readFileSync method](https://nodejs.org/api/fs.html#fs_fs_readfilesync_path_options) when reading input file |
  | inputGlobOptions | object | *undefined* | Options which are passed directly to the [fast-glob package](https://github.com/mrmlnc/fast-glob#options-1) when resolving glob patterns |
  | content    | string | *undefined* | Content to be replaced (takes precedence over file input) |
  | strategy   | "join" or "flatten" or "preserve-structure" | "join" | Output file generation strategy. *"join"* - joins all input files and outputs them as a single file using path passed as: *"output"*. *"preserve-structure"* - saves all files to the *"output"* directory keeping relative directory structure.*"flatten"* - same as *"preserve-structure"* but flattens the directory structure  |
  | needle    | string or [RegExp Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Syntax)| *-* | Used as a first argument of [javascript replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Syntax) |
  | replacement  | string | *-* | Passed as a second argument to [javascript replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Syntax) |
  | output | string | *undefined* | Path of an output file |
  | outputWriteOptions  | string or object | "utf8" | Passed as options argument of [write's .sync](https://www.npmjs.com/package/write#sync) |
  | outputJoinString | string | \n | String used when joining multiple files, passed directly to [javascript join](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join#Syntax) |

## :keyboard: CLI API

```bash
frs-replace <regex> <replacement> [options]
```

### Positionals

  | Option | Type | Description |
  | --- | --- | --- |
  | \<regex\> | string | First parameter to [RegExp constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Syntax) |
  | \<replacement\> | string | String or path to replacement function file (see &#8209;&#8209;replace&#8209;fn switch for details) |

### Options

> Note: Every boolean option can be negated with use of `--no-` prefix, e.g. `--stdout` or `--no-stdout` turn stdout output on or off, respectively.

> Note: Object types can be set using [dot notation](https://github.com/yargs/yargs-parser#dot-notation). So, e.g. if you want to pass `utf8` value under `i-read-opts` `encoding` field you should write `--i-read-opts.encoding utf8`.

  | Option | Type | Default | Description |
  | --- | --- | --- | --- |
  |&#8209;i, &#8209;&#8209;input       | string or string[] | *-* | Path to files or [fast-glob](https://github.com/mrmlnc/fast-glob) pattern pointing to files to be read & replaced from. If multiple files specified results will be joined using `outputJoinString` option's value) |
  | &#8209;&#8209;i-read-opts | string or object | utf8 | Options which are passed directly to the [readFileSync method](https://nodejs.org/api/fs.html#fs_fs_readfilesync_path_options) when reading input file |
  | &#8209;&#8209;i-glob-opts | object | *undefined* | Options which are passed directly to the [fast-glob package](https://github.com/mrmlnc/fast-glob#options-1) when resolving glob patterns |
  | &#8209;o, &#8209;&#8209;output     | string | *-* | Output file name/path (replaces the file if it already exists and creates any intermediate directories if they don't already exist) |
  | &#8209;&#8209;o-write-opts | string or object | utf8 | Passed as options argument of [write's .sync](https://www.npmjs.com/package/write#sync) |
  | &#8209;&#8209;o-join-str | string | \n | Used when joining multiple files, passed directly to [javascript join](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join#Syntax) |
  | &#8209;c, &#8209;&#8209;content    | string | *-* | Content to be replaced (takes precedence over stream & file input) |
  | &#8209;s, &#8209;&#8209;strategy   | "join" or "flatten" or "preserve-structure" | "join" | Output file generation strategy. *"join"* - joins all input files and outputs them as a single file using path passed as: *"output"*. *"preserve-structure"* - saves all files to the *"output"* directory keeping relative directory structure.*"flatten"* - same as *"preserve-structure"* but flattens the directory structure  |
  | &#8209;f, &#8209;&#8209;flags | combination of *gim* flags | g | [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Syntax) flags |
  | &#8209;&#8209;stdout  | boolean | *true* if piped input present, *false* otherwise | Force sending output on stdout |
  | &#8209;r, &#8209;&#8209;replace&#8209;fn | boolean | false | Treat replacement argument as path to file containing replacement function |
  | &#8209;h, &#8209;&#8209;help  | boolean | *-* | Show help |
  | &#8209;v, &#8209;&#8209;version  | boolean | *-* | Show version number |

## :mag_right: Example usage

> Note: While most of examples are using synchronous API method in all cases `.async` is applicable as well.

### 1. Replace all `a` occurences with `b` from given `foo.js` file and return result / write result to the console

<details><summary>Click to expand</summary>

#### 1.1 API

```javascript
const FRSReplace = require('@frsource/frs-replace')

/* synchronously */
const resultSync = FRSReplace.sync({
  input       : 'foo.js',
  regex       : new RegExp('a', 'g'),
  replacement : 'b',
  output      : 'foo_replaced.js'
})
// work with result here
  
/* asynchronously */
FRSReplace.async({
  input       : 'foo.js',
  regex       : new RegExp('a', 'g'),
  replacement : 'b'
})
.then(resultAsync => {
  // work with result here */
})

/* asynchronously ES6 syntax (must be runned inside async function) */
const resultAsync = await FRSReplace.async({
  input       : 'foo.js',
  regex       : new RegExp('a', 'g'),
  replacement : 'b'
})
// work with result here */

```

#### 1.2 CLI

```bash
frs-replace a b -i foo.js --stdout
```

</details>

### 2. Replace all `a` occurences with `b` from given `foo.js` and save result to the `foo_replaced.js`

<details><summary>Click to expand</summary>

#### 2.1 API

```javascript
const result = require('@frsource/frs-replace').sync({
  input       : 'foo.js',
  regex       : new RegExp('a', 'g'),
  replacement : 'b',
  output      : 'foo_replaced.js'
})
```

#### 2.2 CLI

```bash
frs-replace a b -i foo.js -o foo_replaced.js
```

</details>

### 3. Replace all `a` occurences with `b` from given array of files and save result to the `foo_replaced.js` using default `\n` as result-joining string

<details><summary>Click to expand</summary>

#### 3.1 API

```javascript
const result = require('@frsource/frs-replace').sync({
  input       : ['foo.js', 'foo2.js'],
  regex       : new RegExp('a', 'g'),
  replacement : 'b',
  output      : 'foo_replaced.js'
})
```

#### 3.2 CLI

```bash
frs-replace a b -i foo.js foo2.js -o foo_replaced.js
```

or

```bash
frs-replace a b -i foo.js -i foo2.js -o foo_replaced.js
```

> Note: Arrays can be passed under single flag-entry as a space-separated list *or* under same flag repeated multiple times (all values will be concatenated into single array using, details - [yargs array notation](https://github.com/yargs/yargs/blob/master/docs/tricks.md#arrays)).

</details>

### 4. Replace all `a` occurences with `b` from all `.js` files in `foo` directory and save result to the `foo_replaced.js` using `\n/////\n` as result-joining string

<details><summary>Click to expand</summary>

#### 4.1 API

```javascript
const result = require('@frsource/frs-replace').sync({
  input           : 'foo/*.js',
  regex           : new RegExp('a', 'g'),
  replacement     : 'b',
  outputJoinString : '\n/////\n',
  output          : 'foo_replaced.js'
})
```

#### 4.2 CLI

```bash
frs-replace a b -i foo/*.js -o foo_replaced.js --o-join-str "\n/////\n"
```

</details>

### 5. Replace all `a` occurences with `b` in given content string `abcd` and save result to the `foo_replaced.js`

<details><summary>Click to expand</summary>

#### 5.1 API

```javascript
const result = require('@frsource/frs-replace').sync({
  content     : 'abcd',
  regex       : new RegExp('a', 'g'),
  replacement : 'b',
  output      : 'foo_replaced.js'
})
```

#### 5.2 CLI

```bash
frs-replace a b --content abcd -o foo_replaced.js
```

</details>

### 6. Replace all `a` occurences with `b` from piped stream and save it to the output file

#### 6.1 CLI

```bash
<read-file> | frs-replace a b > <output-file-path>
```

### 7. Replace all `a` occurences with `b` from piped stream and pass it through `stdout` stream to the `<next-command>`

#### 7.1 CLI

```bash
<read-file> | frs-replace a b | <next-command>
```

### 8. Both pipe & options styles can be mixed together, here - getting input from `-i` argument and passing output down the stream to the `<next-command>`

#### 8.1 CLI

```bash
frs-replace a b -i foo.js | <next-command>
```

## :chart_with_upwards_trend: Benchmarks

> Tested on Node v15.0.1.

### input as glob pattern [40 files x 1000 iterations x 100 repetitions]

| Library (best&nbsp;bolded) | Execution time [s] | Difference percentage (comparing&nbsp;to&nbsp;best&nbsp;time) |
| --- | --- | --- |
| frs-replace async | 0.01959564 | 57.5020% |
| **frs-replace sync** | 0.01244152 | 0.0000% |
| replace-in-file | 0.02223758 | 78.7368% |
| replace async | *N/A* | *N/A* |
| replace sync | 0.06111267 | 391.1992% |
| replace-string | *N/A* | *N/A* |

### input & replacement as strings [1000 iterations x 100 repetitions]

| Library (best&nbsp;bolded) | Execution time [s] | Difference percentage (comparing&nbsp;to&nbsp;best&nbsp;time) |
| --- | --- | --- |
| frs-replace async | 0.00020093 | 516.9883% |
| **frs-replace sync** | 0.00003257 | 0.0000% |
| replace-in-file | *N/A* | *N/A* |
| replace async | *N/A* | *N/A* |
| replace sync | *N/A* | *N/A* |
| replace-string | 0.00003438 | 5.5692% |
