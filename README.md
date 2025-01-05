<p align="center">
  <a href="https://www.npmjs.com/package/@frsource/frs-replace">
    <img src="https://img.shields.io/npm/v/@frsource/frs-replace" alt="NPM version badge">
  </a>
  <a href="https://bundlejs.com/?q=%40frsource%2Ffrs-replace">
    <img src="https://deno.bundlejs.com/badge?q=@frsource/frs-replace" alt="GZIP size calculated by bundlejs.com">
  </a>
  <a href="https://github.com/semantic-release/semantic-release">
    <img src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg" alt="semantic-release badge">
  </a>
  <a href="https://github.com/FRSOURCE/frs-replace/blob/master/LICENSE">
    <img src="https://img.shields.io/github/license/FRSOURCE/frs-replace" alt="license MIT badge">
  </a>
</p>

<h1 align="center">@frsource/frs-replace - replace content directly in your files/streams with ease (CLI included)! 📝</h1>

<p align="center">
  <a href="https://github.com/FRSOURCE/autoresize-textarea/issues">File an Issue</a>
  ·
  <a href="#questions">Question or an idea?</a>
  ·
  <a href="#chart_with_upwards_trend-benchmarks">Benchmarks</a>
  <br>
</p>

<p align="center"><strong>The fastest</strong> (<a href="#chart_with_upwards_trend-benchmarks">see benchmarks</a>) CLI & Node wrapper around <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace">javascript replace</a> which allows in-file replacing (with possibility to save changed file as a copy), <a href="https://en.wikipedia.org/wiki/Glob_(programming)">globbing</a>, <a href="https://en.wikipedia.org/wiki/Pipeline_(Unix)">piping</a> and many more!</p>

<p align="center">
  <a href="#keyboard-cli">Getting Started (CLI)</a>
  ·
  <a href="#mag_right-examples-and-recipes---cli">Examples and recipes (CLI)</a>
  <br>
  <a href="#books-node-api">Getting Started (Node)</a>
  ·
  <a href="#mag_right-examples-and-recipes---node">Examples and recipes (Node)</a>
  <br>
</p>

## :scroll: Installation

```bash
npm install @frsource/frs-replace
```

or execute it right away:

```bash
npx @frsource/frs-replace
```

## :keyboard: CLI

```bash
frs-replace <regex> <replacement> [flags]
```

Basic usage:

```bash
frs-replace something anything -i foo.js -o foo_replaced.js

# all of the occurences of "something" in `foo.js` will be replaced with "anything" and saved to `foo_replaced.js`
```

More examples [below](#mag_right-examples-and-recipes---cli).

### Arguments

| Argument        | Type   | Description                                                                                                                             |
| --------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| \<regex\>       | string | First parameter to [RegExp constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Syntax) |
| \<replacement\> | string | String or path to replacement function file (see &#8209;&#8209;replace&#8209;fn switch for details)                                     |

### Flags

> Note: Every boolean option can be negated with use of `--no-` prefix, e.g. `--stdout` or `--no-stdout` turn stdout output on or off, respectively.

> Note: Object types can be set using [dot notation](https://github.com/yargs/yargs-parser#dot-notation). So, e.g. if you want to pass `utf8` value under `i-read-opts` `encoding` field you should write `--i-read-opts.encoding utf8`.

| Option                                   | Type                                        | Default                                          | Description                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| &#8209;i, &#8209;&#8209;input            | string or string[]                          | _-_                                              | Path to files or [fast-glob](https://github.com/mrmlnc/fast-glob) pattern pointing to files to be read & replaced from. If multiple files specified results will be joined using `outputJoinString` option's value)                                                                                                               |
| &#8209;&#8209;i-read-opts                | string or object                            | utf8                                             | Options which are passed directly to the [readFileSync method](https://nodejs.org/api/fs.html#fs_fs_readfilesync_path_options) when reading input file                                                                                                                                                                            |
| &#8209;&#8209;i-glob-opts                | object                                      | _undefined_                                      | Options which are passed directly to the [fast-glob package](https://github.com/mrmlnc/fast-glob#options-1) when resolving glob patterns                                                                                                                                                                                          |
| &#8209;&#8209;stdin                      | boolean                                     | _true_                                           | Wait for stdin input (should be set to _false_ when used in non-interactive terminals)                                                                                                                                                                                                                                            |
| &#8209;o, &#8209;&#8209;output           | string                                      | _-_                                              | Output file name/path (replaces the file if it already exists and creates any intermediate directories if they don't already exist)                                                                                                                                                                                               |
| &#8209;&#8209;o-write-opts               | string or object                            | utf8                                             | Passed as options argument of [write's .sync](https://www.npmjs.com/package/write#sync)                                                                                                                                                                                                                                           |
| &#8209;&#8209;o-join-str                 | string                                      | \n                                               | Used when joining multiple files, passed directly to [javascript join](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join#Syntax)                                                                                                                                                        |
| &#8209;c, &#8209;&#8209;content          | string                                      | _-_                                              | Content to be replaced (takes precedence over stream & file input)                                                                                                                                                                                                                                                                |
| &#8209;s, &#8209;&#8209;strategy         | "join" or "flatten" or "preserve-structure" | "join"                                           | Output file generation strategy. _"join"_ - joins all input files and outputs them as a single file using path passed as: _"output"_. _"preserve-structure"_ - saves all files to the _"output"_ directory keeping relative directory structure._"flatten"_ - same as _"preserve-structure"_ but flattens the directory structure |
| &#8209;f, &#8209;&#8209;flags            | string, combination of _gim_ flags          | g                                                | [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Syntax) flags                                                                                                                                                                                                                    |
| &#8209;&#8209;stdout                     | boolean                                     | _true_ if piped input present, _false_ otherwise | Force sending output on stdout                                                                                                                                                                                                                                                                                                    |
| &#8209;r, &#8209;&#8209;replace&#8209;fn | boolean                                     | false                                            | Treat replacement argument as path to file containing replacement function                                                                                                                                                                                                                                                        |
| &#8209;h, &#8209;&#8209;help             | boolean                                     | _-_                                              | Show help                                                                                                                                                                                                                                                                                                                         |
| &#8209;v, &#8209;&#8209;version          | boolean                                     | _-_                                              | Show version number                                                                                                                                                                                                                                                                                                               |

## :mag_right: Examples and recipes - CLI

##### 1. Replace all `a` occurrences with `b` from the `foo.js` file and return the result (using CLI)

```bash
frs-replace a b -i foo.js --stdout
```

##### 2. Replace all `a` occurrences with `b` from `foo.js` and save the result to the `foo_replaced.js` (using CLI)

```bash
frs-replace a b -i foo.js -o foo_replaced.js
```

##### 3. Replace all `a` occurrences with `b` from an array of files and save the result to the `foo_replaced.js` using default `\n` as a result-joining string (using CLI)

```bash
frs-replace a b -i foo.js -i foo2.js -o foo_replaced.js
```

##### 4. Replace all `a` occurrences with `b` from all `.js` files in the `foo` directory and save the result to the `foo_replaced.js` using `\n/////\n` as a result-joining string (using CLI)

```bash
frs-replace a b -i foo/*.js -o foo_replaced.js --o-join-str "\n/////\n"
```

##### 5. Replace all `a` occurrences with `b` in a content string `abcd` and save the result to the `foo_replaced.js` (using CLI)

```bash
frs-replace a b --content abcd -o foo_replaced.js
```

##### 6. Replace all `a` occurrences with `b` from a piped stream and save it to the output file (using CLI)

```bash
<read-file> | frs-replace a b > <output-file-path>
```

##### 7. Replace all `a` occurrences with `b` from a piped stream and pass it through the `stdout` stream to the `<next-command>` (using CLI)

```bash
<read-file> | frs-replace a b | <next-command>
```

## :books: Node API

@frsource/frs-replace package is shipped in 2 flavors: synchronous and asynchronous:

```javascript
import { sync, async } from '@frsource/frs-replace';

sync({
  /* options */
});
await async({
  /* options */
});
```

Where `/* options */` is an object containing:

> Note: one of parameters: **input** or **content** is required

| Option             | Type                                                                                                                      | Default     | Description                                                                                                                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| input              | string or string[]                                                                                                        | _undefined_ | Path to files or [fast-glob](https://github.com/mrmlnc/fast-glob) pattern pointing to files to be read & replaced from. If multiple files specified results will be joined using `outputJoinString` option's value)                                                                                                               |
| inputReadOptions   | string or object                                                                                                          | utf8        | Options which are passed directly to the [readFileSync method](https://nodejs.org/api/fs.html#fs_fs_readfilesync_path_options) when reading input file                                                                                                                                                                            |
| inputGlobOptions   | object                                                                                                                    | _undefined_ | Options which are passed directly to the [fast-glob package](https://github.com/mrmlnc/fast-glob#options-1) when resolving glob patterns                                                                                                                                                                                          |
| content            | string                                                                                                                    | _undefined_ | Content to be replaced (takes precedence over file input)                                                                                                                                                                                                                                                                         |
| strategy           | "join" or "flatten" or "preserve-structure"                                                                               | "join"      | Output file generation strategy. _"join"_ - joins all input files and outputs them as a single file using path passed as: _"output"_. _"preserve-structure"_ - saves all files to the _"output"_ directory keeping relative directory structure._"flatten"_ - same as _"preserve-structure"_ but flattens the directory structure |
| needle             | string or [RegExp Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Syntax) | _-_         | Used as a first argument of [javascript replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Syntax)                                                                                                                                                                          |
| replacement        | string                                                                                                                    | _-_         | Passed as a second argument to [javascript replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Syntax)                                                                                                                                                                       |
| output             | string                                                                                                                    | _undefined_ | Path of an output file                                                                                                                                                                                                                                                                                                            |
| outputWriteOptions | string or object                                                                                                          | "utf8"      | Passed as options argument of [write's .sync](https://www.npmjs.com/package/write#sync)                                                                                                                                                                                                                                           |
| outputJoinString   | string                                                                                                                    | \n          | String used when joining multiple files, passed directly to [javascript join](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join#Syntax)                                                                                                                                                 |

## :mag_right: Examples and recipes - Node

> Note: While all of examples are using synchronous API method in all cases your can use `async` as well.

##### 1. Replace all `a` occurrences with `b` from the `foo.js` file and return the result

```javascript
import { sync } from '@frsource/frs-replace';

const result = sync({
  input: 'foo.js',
  regex: new RegExp('a', 'g'),
  replacement: 'b',
  output: 'foo_replaced.js',
});
```

##### 2. Replace all `a` occurrences with `b` from `foo.js` and save the result to the `foo_replaced.js`

```javascript
import { sync } from '@frsource/frs-replace';
const result = sync({
  input: 'foo.js',
  regex: new RegExp('a', 'g'),
  replacement: 'b',
  output: 'foo_replaced.js',
});
```

##### 3. Replace all `a` occurrences with `b` from an array of files and save the result to the `foo_replaced.js` using default `\n` as a result-joining string

```javascript
import { sync } from '@frsource/frs-replace';
const result = sync({
  input: ['foo.js', 'foo2.js'],
  regex: new RegExp('a', 'g'),
  replacement: 'b',
  output: 'foo_replaced.js',
});
```

##### 4. Replace all `a` occurrences with `b` from all `.js` files in the `foo` directory and save the result to the `foo_replaced.js` using `\n/////\n` as a result-joining string

```javascript
import { sync } from '@frsource/frs-replace';
const result = sync({
  input: 'foo/*.js',
  regex: new RegExp('a', 'g'),
  replacement: 'b',
  outputJoinString: '\n/////\n',
  output: 'foo_replaced.js',
});
```

##### 5. Replace all `a` occurrences with `b` in a content string `abcd` and save the result to the `foo_replaced.js`

```javascript
import { sync } from '@frsource/frs-replace';
const result = sync({
  content: 'abcd',
  regex: new RegExp('a', 'g'),
  replacement: 'b',
  output: 'foo_replaced.js',
});
```

## :chart_with_upwards_trend: Benchmarks

> Tested on Node v20.18.1.

### input as glob pattern [40 files]

| Rank | Library                       | Average latency [ms] | Difference percentage (comparing&nbsp;to&nbsp;best&nbsp;average&nbsp;latency) |
| ---- | ----------------------------- | -------------------- | ----------------------------------------------------------------------------- |
| 1    | @frsource/frs-replace (sync)  | 0.47 ± 1.08%         | +0.00%                                                                        |
| 2    | replace-in-file (sync)        | 0.82 ± 1.28%         | +75.36%                                                                       |
| 3    | @frsource/frs-replace (async) | 1.85 ± 1.28%         | +295.23%                                                                      |
| 4    | replace-in-file (async)       | 3.14 ± 1.09%         | +572.34%                                                                      |

### input & replacement as strings

| Rank | Library                       | Average latency [ms] | Difference percentage (comparing&nbsp;to&nbsp;best&nbsp;average&nbsp;latency) |
| ---- | ----------------------------- | -------------------- | ----------------------------------------------------------------------------- |
| 1    | @frsource/frs-replace (sync)  | 0.01 ± 0.27%         | +0.00%                                                                        |
| 2    | @frsource/frs-replace (async) | 0.01 ± 0.26%         | +11.65%                                                                       |
| 3    | replaceString                 | 0.18 ± 0.91%         | +2270.19%                                                                     |
