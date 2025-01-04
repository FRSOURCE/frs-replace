#!/usr/bin/env node
import { resolve } from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { sync } from '../dist/index.mjs';

(process.env.CI || ~process.argv.indexOf('--no-stdin')
  ? Promise.resolve()
  : (await import('get-stdin')).default()
).then(async (stdin) => {
  const isPiped = !!stdin;

  if (isPiped) {
    process.argv.push('-c');
    process.argv.push(stdin); // threat piped data as value for --content option
  }

  const isContentPresent = !!(
    ~process.argv.indexOf('--content') || ~process.argv.indexOf('-c')
  );
  const isHelpPresent = !!(
    ~process.argv.indexOf('--help') || ~process.argv.indexOf('-h')
  );

  const argv = await yargs(hideBin(process.argv))
    .parserConfiguration({
      'camel-case-expansion': false,
    })
    .scriptName('frs-replace')
    .usage(
      '$0 <needle> <replacement> [options]',
      'Replace matching parts of string with replacement string/function',
      (yargs) =>
        yargs
          .positional('needle', {
            describe:
              'String which is passed as a first parameter to RegExp constructor',
            type: 'string',
            demand: true,
          })
          .positional('replacement', {
            describe:
              'String or path to replacement function file (see --replace-fn switch for details)',
            type: 'string',
            demand: true,
          })
          .example(
            '$0 a b -i foo.js -o foo_replaced.js',
            'Replaces all "a" occurences with "b" from given foo.js and save result to foo_replaced.js',
          )
          .example(
            '<read file> | $0 a b > <output-file-path>',
            'Replaces all "a" occurences with "b" from stream and save it to output file',
          )
          .example(
            '<read file> | $0 a b | <next-command>',
            'Replaces all "a" occurences with "b" from stream and pass it through the stream to next command',
          )
          .example(
            '$0 a b -i foo.js | <next-command>',
            'Both pipe & options styles can be mixed together, here - getting input from "i" argument and passing output down the stream to next command',
          )
          .example(
            '$0 a b --content abcd -o foo_replaced.js',
            'Replace all "a" occurences with "b" in given "abcd" and save result (which is "bbcd") to foo_replaced.js',
          ),
    )

    .option('f', {
      alias: 'flags',
      describe:
        'RegExp flags used together with `needle` positional (supporting g, i & m)',
      nargs: 1,
      default: 'g',

      choices: /** @type {const} */ ([
        '',
        'g',
        'm',
        'i',
        'gm',
        'gi',
        'mi',
        'mg',
        'ig',
        'im',
        'gmi',
        'gim',
        'mig',
        'mgi',
        'igm',
        'img',
      ]),
      coerce: (arg) => arg.trim(),
    })
    .option('i', {
      demandOption: !isContentPresent && !isHelpPresent,
      alias: 'input',
      describe:
        'Path to files or fast-glob pattern pointing to files to read & replace from',
      array: true,
      string: true,
    })

    .option('i-read-opts', {
      implies: 'i',
      describe: 'Passed to fs.readFileSync when reading input file',
      defaultDescription: 'utf8', // will use node's default value
    })

    .option('i-glob-opts', {
      describe: 'Passed to fast-glob.sync when resolving glob patterns',
      implies: 'i',
    })

    .option('stdin', {
      describe:
        'Wait for stdin input (should be set to false when used in non-interactive terminals)',
      boolean: true,
      default: true,
    })

    .option('c', {
      demandOption: isContentPresent,
      alias: 'content',
      describe:
        'Content to be replaced (takes precedence over stream & file input)',
      string: true,
      nargs: 1,
    })

    .option('s', {
      alias: 'strategy',
      describe: `output file generation strategy.
    \`join\` - join all input files and saves single file using "output" option as it's path,
    \`preserve-structure\` - when replacing files content copies them over to the directory specified by "output" option.
    \`flatten\` - same as \`preserve-structure\` but flattens the directory structure`,
      nargs: 1,
      choices: /** @type {const} */ (['join', 'flatten', 'preserve-structure']),
      default: 'join',
      coerce: (arg) => arg.trim(),
    })

    .option('o', {
      alias: 'output',
      describe:
        "Output file name/path (replaces the file if it already exists and creates any intermediate directories if they don't already exist) or (when used together with `strategy` = `flatten` or `preserve-structure`) path to the output directory",
      string: true,
      nargs: 1,
    })

    .option('o-write-opts', {
      describe: "Passed as options argument of write's .sync method",
      defaultDescription: 'utf8', // will use node's default value
      implies: 'o',
    })

    .option('o-join-str', {
      describe:
        'String used when joining multiple files (use it together with either `output` or `stdout` option)',
      default: undefined,
      defaultDescription: 'newline (\\n)', // will use node's default value
    })

    .option('stdout', {
      describe: 'Force sending output on stdout',
      boolean: true,
      default: isPiped,
      defaultDescription: 'true when piped input present, false otherwise',
    })

    .option('r', {
      alias: 'replace-fn',
      describe:
        'Treat replacement argument as path to file containing replacement function',
      boolean: true,
    })

    .help('h')
    .alias('h', 'help')

    .version('v')
    .alias('v', 'version')

    .epilog('Brought to you with open-source love by FRSOURCE').argv;

  try {
    const result = sync({
      input: argv.i,
      inputReadOptions: argv['i-read-opts'],
      inputGlobOptions:
        /** @type import('fast-glob').Options */ argv['i-glob-opts'],
      content: argv.c,
      strategy: argv.s,
      output: argv.o,
      outputWriteOptions: argv['o-write-opts'],
      outputJoinString: argv['o-join-str'],
      needle: new RegExp(argv.needle, argv.f),
      replacement: argv.r
        ? (await import(resolve(argv.replacement))).default
        : argv.replacement,
    });

    if (argv.stdout) {
      process.stdout.write(result[0][1]);
    }

    return process.exit();
  } catch (e) /* c8 ignore next */ {
    process.stderr.write(e.toString());
    return process.exit(1);
  }
});
