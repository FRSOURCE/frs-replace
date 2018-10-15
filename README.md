[![Build Status](https://travis-ci.org/FRSource/FRS-replace.svg?branch=master)](https://travis-ci.org/FRSource/FRS-replace)
[![Coverage Status](https://coveralls.io/repos/github/FRSource/FRS-replace/badge.svg?branch=master)](https://coveralls.io/github/FRSource/FRS-replace?branch=master)
# FRS-replace

CLI & Node wrapper around [javascript replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) which allows on-the-fly replacing (without changing input file), piping and many more!

* [Installation](#installation)
* [Node API usage](#node-api-usage)
* [CLI usage](#cli-usage)
* [Examples](#examples)

## Installation
### yarn
```
$ yarn add frs-replace
```

### npm
```
$ npm install frs-replace
```

### download
[zipped from FRS-replace Releases](https://github.com/FRSource/FRS-replace/releases)

### Node API usage

```javascript
require('FRS-replace')({/* options */})
```

| Option | Type | Default | Description |
  | --- | --- | --- | --- |
  | input | string | *undefined* | Path to file to read & replace from |
  | inputOptions | string or object | utf8 | Options passed to [readFileSync](https://nodejs.org/api/fs.html#fs_fs_readfilesync_path_options) when reading input file |
  | content    | string | *undefined* | Content to be replaced (takes precedence over file input) |
  | regex    | string or [RegExp Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Syntax)| *-* | Used as a first argument of [javascript replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Syntax) |
  | replacement  | string | *-* | Passed as a second argument to [javascript replace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Syntax) |
  | output | string | *undefined* | Path of an output file |
  | outputOptions  | string or object | utf8 | Passed as options argument of [write's .sync](https://www.npmjs.com/package/write#sync) |

### CLI usage

```bash
FRS-replace <regex> <replacement> [options]
```

#### Positionals:                             
  | Option | Type | Description |
    | --- | --- | --- |
    | \<regex\>       | string | First parameter to [RegExp constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Syntax) |
    | \<replacement\> | string | String or path to replacement function file (see &#8209;&#8209;replace&#8209;fn switch for details) 

#### Options:
  | Option | Type | Default | Description |
  | --- | --- | --- | --- |
  |&#8209;i, &#8209;&#8209;input       | string | *-* | File to read & replace from |
  | &#8209;o, &#8209;&#8209;output     | string | *-* | Output file name/path (replaces the file if it already exists and creates any intermediate directories if they don't already exist) |
  | &#8209;f, &#8209;&#8209;flags | combination of *gim* flags | g | [RegExp](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Syntax) flags |
  | &#8209;c, &#8209;&#8209;content    | string | *-* | Content to be replaced (takes precedence over stream & file input) |
  | &#8209;&#8209;stdout  | boolean | true if piped input present, false otherwise | Force sending output on stdout |
  | &#8209;r, &#8209;&#8209;replace&#8209;fn | boolean | false | Treat replacement argument as path to file containing replacement function |
  | &#8209;h, &#8209;&#8209;help  | boolean | *-* | Show help |
  | &#8209;v, &#8209;&#8209;version  | boolean | *-* | Show version number |

### Examples

Replaces all `a` occurences with `b` from given `foo.js` and save result to `foo_replaced.js` :

##### API
```javascript
require('FRS-replace')({
  input       : 'foo.js',
  regex       : new RegExp('a', 'g'),
  replacement : 'b',
  output      : 'foo_replaced.js'
})
```

##### CLI
```bash
FRS-replace a b -i foo.js -o foo_replaced.js
```

Replace all `a` occurences with `b` in given `abcd` and save result to `foo_replaced.js`

##### API
```javascript
require('FRS-replace')({
  content     : 'abcd',
  regex       : new RegExp('a', 'g'),
  replacement : 'b',
  output      : 'foo_replaced.js'
})
```

##### CLI
```bash
FRS-replace a b --content abcd -o foo_replaced.js
```

Replaces all `a` occurences with `b` from piped stream and save it to output file:

##### CLI
```bash
<read-file> | FRS-replace a b > <output file path>
```
 
Replaces all `a` occurences with `b` from piped stream and pass it through `stdout` stream to next command

##### CLI
```bash
<read-file> | FRS-replace a b | <next command>
```

Both pipe & options styles can be mixed together, here - getting input from `i` argument and passing output down the stream to next command

##### CLI
```bash
FRS-replace a b -i foo.js | <next command>
```


