#!/usr/bin/env node
const replaceSync = require('../sync')

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
    .scriptName('frs-replace')
    .usage('$0 <needle> <replacement> [options]', 'Replace matching parts of string with replacement string/function', (yargs) => {
      yargs
        .positional('needle', {
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

    .option('f')
    .alias('f', 'flags')
    .describe('f', 'RegExp flags used together with `needle` positional (supporting g, i & m)')
    .nargs('f', 1)
    .choices('f', ['', 'g', 'm', 'i', 'gm', 'gi', 'mi', 'mg', 'ig', 'im', 'gmi', 'gim', 'mig', 'mgi', 'igm', 'img'])
    .default('f', 'g')
    .coerce('f', arg => arg.trim())

    .option('i', { demandOption: !isContentPresent && !isHelpPresent })
    .alias('i', 'input')
    .describe('i', 'Path to files or fast-glob pattern pointing to files to read & replace from')
    .array('i')

    .option('i-read-opts')
    .describe('i-read-opts', 'Passed to fs.readFileSync when reading input file')
    .default('i-read-opts', undefined, 'utf8') // will use node's default value
    .implies('i-read-opts', 'i')

    .option('i-glob-opts')
    .describe('i-glob-opts', 'Passed to fast-glob.sync when resolving glob patterns')
    .implies('i-glob-opts', 'i')

    .option('c', { demandOption: isContentPresent })
    .alias('c', 'content')
    .describe('c', 'Content to be replaced (takes precedence over stream & file input)')
    .string('c')
    .nargs('c', 1)

    .option('s')
    .alias('s', 'strategy')
    .describe('s', `output file generation strategy.
\`join\` - join all input files and saves single file using "output" option as it's path,
\`preserve-structure\` - when replacing files content copies them over to the directory specified by "output" option.
\`flatten\` - same as \`preserve-structure\` but flattens the directory structure`)
    .nargs('s', 1)
    .choices('s', ['join', 'flatten', 'preserve-structure'])
    .default('s', 'join')
    .coerce('s', arg => arg.trim())

    .option('o')
    .alias('o', 'output')
    .describe('o', 'Output file name/path (replaces the file if it already exists and creates any intermediate directories if they don\'t already exist) or (when used together with `strategy` = `flatten` or `preserve-structure`) path to the output directory')
    .string('o')
    .nargs('o', 1)

    .option('o-write-opts')
    .describe('o-write-opts', 'Passed as options argument of write\'s .sync method')
    .default('o-write-opts', undefined, 'utf8') // will use node's default value
    .implies('o-write-opts', 'o')

    .option('o-join-str')
    .describe('o-join-str', 'String used when joining multiple files (use it together with either `output` or `stdout` option)')
    .default('o-join-str', undefined, 'newline (\\n)') // will use node's default value

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
    const result = replaceSync({
      input: argv.i,
      inputReadOptions: argv['i-read-opts'],
      inputGlobOptions: argv['i-glob-opts'],
      content: argv.c,
      strategy: argv.strategy,
      output: argv.o,
      outputWriteOptions: argv['o-write-opts'],
      outputJoinString: argv['o-join-str'],
      needle: new RegExp(argv.needle, argv.f),
      replacement: argv.r ? require(require('path').resolve(argv.replacement)) : argv.replacement
    })

    if (argv.stdout) {
      process.stdout.write(result[0][1])
    }

    return process.exit()
  } catch (e) /* istanbul ignore next */ {
    process.stderr.write(e.toString())
    return process.exit(1)
  }
})
