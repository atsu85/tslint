/// <reference path='../typescript/src/compiler/typescript.ts' />
/// <reference path='../typescript/src/compiler/syntax/positionTrackingWalker.ts' />
/// <reference path=../typescript/src/services/classifier.ts' />
/// <reference path=../typescript/src/services/coreServices.ts' />
/// <reference path='../typescript/src/services/typescriptServices.ts' />
/// <reference path=../typescript/src/services/pullLanguageService.ts' />

/// <reference path='configuration.ts' />
/// <reference path='formatters/formatters.ts' />
/// <reference path='language/languageServiceHost.ts' />

var fs = require("fs");
var path = require("path");
var argv = require("optimist")
  .usage("usage: $0")
  .demand("f")
  .options({
    "c": {
        alias: "config",
        describe: "configuration file"
    },
    "f": {
        alias: "file",
        describe: "file to lint"
    },
    "o": {
        alias: "out",
        describe: "output file",
    },
    "t": {
        alias: "format",
        describe: "output format (prose, json)",
        default: "prose"
    }
  })
  .check(validateArguments)
  .argv;

function validateArguments(args) {
    Lint.Rules.createAllRules();
    Lint.Formatters.createAllFormatters();

    if (Lint.Formatters.getFormatterForName(args.t) === undefined) {
        throw new Error("invalid option for 'format'");
    }

    return true;
}

var configuration = Lint.Configuration.findConfiguration(argv.c);
if (configuration === undefined) {
    console.error("unable to find .tslintrc configuration");
    process.exit(1);
}

var file = argv.f;
var contents = fs.readFileSync(file, "utf8");

var languageServiceHost = new Lint.LanguageServiceHost(file, contents);
var languageService = new Services.LanguageService(languageServiceHost);
var syntaxTree = languageService.getSyntaxTree(file);

var i, failures = [];
var configuredRules = Lint.Configuration.getConfiguredRules(configuration);
for (i = 0; i < configuredRules.length; ++i) {
    var rule = configuredRules[i];
    if (rule.isEnabled()) {
        failures = failures.concat(rule.apply(syntaxTree));
    }
}

var formatter = Lint.Formatters.getFormatterForName(argv.t);
var outputText = formatter.format(failures);

var outputStream;
if (argv.o !== undefined) {
    outputStream = fs.createWriteStream(argv.o, {
        end: false,
        flags: "w+",
        mode: 0644
    });
} else {
    outputStream = process.stdout;
}

if (failures.length > 0) {
    outputStream.write(outputText, () => {
        process.exit(2);
    });
}
