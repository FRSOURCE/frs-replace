#!/usr/bin/env node

require('get-stdin')().then((stdin) => {
  const isPiped = !!stdin

  if (isPiped) {
    process.argv.push('-c')
    process.argv.push(stdin) // threat piped data as value for --content option
  }

  const isContentPresent = ~process.argv.indexOf('--content') || ~process.argv.indexOf('-c')
  const isHelpPresent = ~process.argv.indexOf('--help') || ~process.argv.indexOf('-h')

  const argv = require('yargs')
    .parserConfiguration({
      'camel-case-expansion': false
    })
    .scriptName('FRS-replace')
    .usage('$0 <regex> <replacement> [options]', 'Replace matching parts of string with replacement string/function', (yargs) => {
      yargs
        .positional('regex', {
          describe: 'String which is passed as a first parameter to RegExp constructor',
          type: 'string',
          demand: true
        })
        .positional('replacement', {
          describe: 'String or path to replacement function file (see --replace-fn switch for details)',
          type: 'string',
          demand: true
        })
        .example('$0 a b -i foo.js -o foo_replaced.js',
          'Replaces all "a" occurences with "b" from given foo.js and save result to foo_replaced.js')
        .example('<read file> | $0 a b > <output-file-path>',
          'Replaces all "a" occurences with "b" from stream and save it to output file')
        .example('<read file> | $0 a b | <next-command>',
          'Replaces all "a" occurences with "b" from stream and pass it through the stream to next command')
        .example('$0 a b -i foo.js | <next-command>',
          'Both pipe & options styles can be mixed together, here - getting input from "i" argument and passing output down the stream to next command')
        .example('$0 a b --content abcd -o foo_replaced.js',
          'Replace all "a" occurences with "b" in given "abcd" and save result (which is "bbcd") to foo_replaced.js')
    })

    .option('i', { demandOption: !isContentPresent && !isHelpPresent })
    .alias('i', 'input')
    .describe('i', 'File to read & replace from')
    .array('i')

    .option('i-read-opts')
    .describe('i-read-opts', 'Passed to fs.readFileSync when reading input file')
    .default('i-read-opts', undefined, 'utf8') // will use node's default value
    .implies('i-read-opts', 'i')

    .option('i-glob-opts')
    .describe('i-glob-opts', 'Passed to fast-glob.sync when resolving glob patterns')
    .implies('i-glob-opts', 'i')

    .option('i-join-str')
    .describe('i-join-str', 'Used when joining multiple files')
    .default('i-join-str', undefined, 'newline (\\n)') // will use node's default value
    .implies('i-join-str', 'i')

    .option('o')
    .alias('o', 'output')
    .describe('o', 'Output file name/path (replaces the file if it already exists and creates any intermediate directories if they don\'t already exist)')
    .string('o')
    .nargs('o', 1)

    .option('o-write-opts')
    .describe('o-write-opts', 'Passed as options argument of write\'s .sync method')
    .default('o-write-opts', undefined, 'utf8') // will use node's default value
    .implies('o-write-opts', 'o')

    .option('f')
    .alias('f', 'flags')
    .describe('f', 'RegExp flags (supporting gim)')
    .nargs('f', 1)
    .choices('f', ['', 'g', 'm', 'i', 'gm', 'gi', 'mi', 'mg', 'ig', 'im', 'gmi', 'gim', 'mig', 'mgi', 'igm', 'img'])
    .default('f', 'g')
    .coerce('f', arg => arg.trim())

    .option('c', { demandOption: isContentPresent })
    .alias('c', 'content')
    .describe('c', 'Content to be replaced (takes precedence over stream & file input)')
    .string('c')
    .nargs('c', 1)

    .option('stdout')
    .describe('stdout', 'Force sending output on stdout')
    .boolean('stdout')
    .default('stdout', isPiped, 'true when piped input present, false otherwise')

    .option('r')
    .alias('r', 'replace-fn')
    .describe('r', 'Treat replacement argument as path to file containing replacement function')
    .boolean('r')

    .help('h')
    .alias('h', 'help')

    .version('v')
    .alias('v', 'version')

    .epilog('Brought to you with open-source love by FRSource')
    .argv

  try {
    const result = require('../src/replace').sync({
      content: argv.c,
      input: argv.i,
      inputReadOptions: argv['i-read-opts'],
      inputGlobOptions: argv['i-glob-opts'],
      inputJoinString: argv['i-join-str'],
      regex: new RegExp(argv.regex, argv.f),
      replacement: argv.r ? require(argv.replacement) : argv.replacement,
      output: argv.o,
      outputWriteOptions: argv['o-write-opts']
    })

    if (argv.stdout) {
      process.stdout.write(result)
    }

    return process.exit()
  } catch (e) /* istanbul ignore next */ {
    process.stderr.write(e.toString())
    return process.exit(1)
  }
})
