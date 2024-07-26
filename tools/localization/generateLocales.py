#!/bin/python3
import argparse
import json
import os
import sys


# This allows for importing from the localization and util directories NOTE: Auto importing tools will also prepend the import paths with "tools." this will not work and needs to be removed from import paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from util.time import ExecutionTimer;

timer = ExecutionTimer()

from dynamicVariables import (
    extractVariablesFromDict,
    identifyLocaleDyanmicVariableDifferences,
    prettyPrintIssuesTable,
    identifyAndPrintOldDynamicVariables,
)
from localization.localeTypes import generateLocalesType
from util.logger import console
from util.fileUtils import createMappedJsonFileDictionary, writeFile


# If the --throw-error-on-missing flag is passed, the script will exit with an error if there are any missing keys or dynamic variables
# This is useful for CI/CD pipelines to ensure that all translations are consistent
parser = argparse.ArgumentParser(description="Generate locale files")
parser.add_argument(
    "--error-on-problems",
    action="store_true",
    help="Exit with an error if there are any missing keys or dynamic variables",
)
parser.add_argument(
    "--error-old-dynamic-variables",
    action="store_true",
    help="Exit with an error if there are any old dynamic variables",
)
parser.add_argument(
    "--print-problems",
    action="store_true",
    help="Print the problems table",
)
parser.add_argument(
    "--write-problems", action="store_true", help="Write the problems to a file"
)
parser.add_argument(
    "--problems-file",
    default="./tools/localization/output/problems.json",
    help="The file to write the problems to",
)
parser.add_argument(
    "--print-old-dynamic-variables",
    action="store_true",
    help="The file to write the problems to",
)
parser.add_argument("--en-only", action="store_true", help="Only check the en locale")
parser.add_argument("--debug", action="store_true", help="Enable debug mode")
parser.add_argument(
    "--dict-dir",
    type=str,
    default="./_locales"
)
parser.add_argument(
    "--dict-file-name",
    type=str,
    default="messages.json",
)
parser.add_argument(
    "--en-file-path",
    type=str,
    default="./_locales/en/messages.json",
)
parser.add_argument(
    "--generate-types",
    action="store_true",
    help="Generate the types file",
)

args = parser.parse_args()

if args.debug:
    console.enableDebug()

GENERATE_TYPES = args.generate_types
OUTPUT_DIR = "./ts/localization"
EN_FILE = args.en_file_path
INPUT_DIR = args.dict_dir

# Create a dictionary that maps locale names to their corresponding JSON file data
locales, localeFiles = createMappedJsonFileDictionary(INPUT_DIR, args.dict_file_name)

if args.en_only:
    locales = {"en": locales["en"]}

# Generate the locales type and write it to a file
if GENERATE_TYPES:
  generateTypesOutputMessage = generateLocalesType(locales["en"])
  console.info(generateTypesOutputMessage)

localeVariables = dict()
localeVariablesOld = dict()

# Extract the dynamic variables from each locale and store them in a dictionary
for locale, data in locales.items():
    console.debug(f"Extracting dynamic variables for {locale}")
    (
        localeVariables[locale],
        localeVariablesOld[locale],
    ) = extractVariablesFromDict(data)


problems = identifyLocaleDyanmicVariableDifferences(localeVariables)


found_old_dynamic_variables = identifyAndPrintOldDynamicVariables(
    localeVariablesOld, args.print_old_dynamic_variables
)

# Wrapping up the script and printing out the results

if problems:
    message = "There are issues with the locales."
    if args.print_problems:
        prettyPrintIssuesTable(problems)
        message += " See above for details."

    if args.write_problems:
        writeFile(args.problems_file, json.dumps(problems, indent=2))
        console.info(f"Problems written to {args.problems_file}")
        message += f" Problems written to {args.problems_file}"

    if not args.print_problems and not args.write_problems:
        message += " Run the script with --print-problems or --write-problems to see the problems."

    console.warn(message)

if found_old_dynamic_variables:
    console.warn(
        f"Old dynamic variables were found in the locales. Please update the locales to use the new dynamic variables. {f"See above for details{' (before the problems table).'if args.print_problems else '.'}" if args.print_old_dynamic_variables else 'Run the script with --print-old-dynamic-variables to see the old dynamic variables.'}"
    )

console.debug("Locales generation complete")

timer.stop()

if (args.error_on_problems and problems) or (
    args.error_old_dynamic_variables and found_old_dynamic_variables
):
    sys.exit(1)
