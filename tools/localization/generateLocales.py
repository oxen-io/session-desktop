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
  identifyLocaleDynamicVariableDifferences,
  prettyPrintIssuesTable,
  identifyAndPrintOldDynamicVariables, extractFormattingTags,
)
from localization.localeTypes import generateLocalesType, generateLocalesMergedType
from util.logger import console
from util.fileUtils import createMappedJsonFileDictionary, writeFile

# These string keys are ignored for formatting tag checks
ignored_strings_formatting = {
  "pl": [
    # disappearingMessagesTurnedOffYouGroup in pl only has one bold word as the word combines both bold words
    "disappearingMessagesTurnedOffYouGroup"],
  "ru": [
    # disappearingMessagesTurnedOffGroup in ru only has one bold word as the word combines both bold words
    "disappearingMessagesTurnedOffGroup"],
  "sr_CS": [
    # disappearingMessagesTurnedOffGroup in sr_CS only has one bold word as the word combines both bold words
    "disappearingMessagesTurnedOffGroup"]
}

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
  "--print-problem-strings",
  action="store_true",
  help="Print the problem strings and which locales they are in",
)
parser.add_argument(
  "--print-problem-formatting-tag-strings",
  action="store_true",
  help="Print the problem strings and which locales they are in",
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
  generateTypesOutputMessage = generateLocalesMergedType(locales)
  console.info(generateTypesOutputMessage)

localeVariables = dict()
localeVariablesOld = dict()
locale_b_tags = dict()
locale_br_tags = dict()
locale_span_tags = dict()
locale_disallowed_tags = dict()
locale_improper_tags = dict()
# Extract the dynamic variables from each locale and store them in a dictionary
for locale, data in locales.items():
  console.debug(f"Extracting dynamic variables for {locale}")
  (
    localeVariables[locale],
    localeVariablesOld[locale],
  ) = extractVariablesFromDict(data)
  (
    locale_b_tags[locale],
    locale_br_tags[locale],
    locale_span_tags[locale],
    locale_disallowed_tags[locale],
    locale_improper_tags[locale],
  ) = extractFormattingTags(data)

problems = identifyLocaleDynamicVariableDifferences(localeVariables, locale_b_tags,
                                                    locale_br_tags,
                                                    locale_span_tags, locale_disallowed_tags, locale_improper_tags)

found_old_dynamic_variables = identifyAndPrintOldDynamicVariables(
  localeVariablesOld, args.print_old_dynamic_variables
)

# Wrapping up the script and printing out the results
number_of_tag_problems = 0

if problems:
  message = "There are issues with the locales."

  if args.print_problem_strings:
    string_to_locales = {}
    for locale, locale_problems in problems.items():
      if "additional_variables" in locale_problems:
        for problem_string in locale_problems["additional_variables"].keys():
          if problem_string not in string_to_locales:
            string_to_locales[problem_string] = [locale]
          else:
            string_to_locales[problem_string].append(locale)
      if "missing_variables" in locale_problems:
        for problem_string in locale_problems["missing_variables"].keys():
          if problem_string not in string_to_locales:
            string_to_locales[problem_string] = [locale]
          else:
            string_to_locales[problem_string].append(locale)
      if "missing_br_tags" in locale_problems:
        for problem_string, tag_issues in locale_problems["missing_br_tags"].items():
          if tag_issues > 0:
            if problem_string not in string_to_locales:
              string_to_locales[problem_string] = [locale]
            else:
              string_to_locales[problem_string].append(locale)
      if "missing_b_tags" in locale_problems:
        for problem_string, tag_issues in locale_problems["missing_b_tags"].items():
          if tag_issues > 0:
            if problem_string not in string_to_locales:
              string_to_locales[problem_string] = [locale]
            else:
              string_to_locales[problem_string].append(locale)
      if "missing_span_tags" in locale_problems:
        for problem_string, tag_issues in locale_problems["missing_span_tags"].items():
          if tag_issues > 0:
            if problem_string not in string_to_locales:
              string_to_locales[problem_string] = [locale]
            else:
              string_to_locales[problem_string].append(locale)
      if "disallowed_tags" in locale_problems:
        for problem_string, tag_issues in locale_problems["disallowed_tags"].items():
          if tag_issues > 0:
            if problem_string not in string_to_locales:
              string_to_locales[problem_string] = [locale]
            else:
              string_to_locales[problem_string].append(locale)
      if "improper_tags" in locale_problems:
        for problem_string, tag_issues in locale_problems["improper_tags"].items():
          if tag_issues > 0:
            if problem_string not in string_to_locales:
              string_to_locales[problem_string] = [locale]
            else:
              string_to_locales[problem_string].append(locale)

    console.debug(f"Problem strings: {json.dumps(string_to_locales, indent=2)}")
    message += " See above for problem strings and which locales they are in."

  if args.print_problem_formatting_tag_strings:
    locales_to_strings = {}
    for locale, locale_problems in problems.items():
      locale_missing_br_tags = set()
      locale_missing_b_tags = set()
      locale_missing_span_tags = set()
      locale_disallowed_tags = set()
      locale_improper_tags = set()
      if "missing_br_tags" in locale_problems:
        for problem_string, tag_issues in locale_problems["missing_br_tags"].items():
          if tag_issues > 0:
            locale_missing_br_tags.add(problem_string)
      if "missing_b_tags" in locale_problems:
        for problem_string, tag_issues in locale_problems["missing_b_tags"].items():
          if tag_issues > 0:
            locale_missing_b_tags.add(problem_string)
      if "missing_span_tags" in locale_problems:
        for problem_string, tag_issues in locale_problems["missing_span_tags"].items():
          if tag_issues > 0:
            locale_missing_span_tags.add(problem_string)
      if "disallowed_tags" in locale_problems:
        for problem_string, tag_issues in locale_problems["disallowed_tags"].items():
          if tag_issues > 0:
            locale_disallowed_tags.add(problem_string)
      if "improper_tags" in locale_problems:
        for problem_string, tag_issues in locale_problems["improper_tags"].items():
          if tag_issues > 0:
            locale_improper_tags.add(problem_string)

      locales_to_strings[locale] = {
        "br": list(locale_missing_br_tags),
        "b": list(locale_missing_b_tags),
        "span": list(locale_missing_span_tags),
        "disallowed_tags": list(locale_disallowed_tags),
        "improper_tags": list(locale_improper_tags),
      }

      if locales_to_strings[locale]["br"] == []:
        del locales_to_strings[locale]["br"]
      if locales_to_strings[locale]["b"] == []:
        del locales_to_strings[locale]["b"]
      if locales_to_strings[locale]["span"] == []:
        del locales_to_strings[locale]["span"]
      if locales_to_strings[locale]["disallowed_tags"] == []:
        del locales_to_strings[locale]["disallowed_tags"]
      if locales_to_strings[locale]["improper_tags"] == []:
        del locales_to_strings[locale]["improper_tags"]

    console.info(f"Problem strings: {json.dumps(locales_to_strings, indent=2)}")
    message += " See above for problem strings and which locales they are in."
    for locale, locale_strings in locales_to_strings.items():
      printed_locale = False
      printed_problem_strings = set()
      for tag_type, tag_strings in locale_strings.items():
        if tag_strings:
          if locale in ignored_strings_formatting and tag_strings == ignored_strings_formatting[locale]:
            continue
          if not printed_locale:
            print(f"{locale}")
            printed_locale = True
          for tag_string in tag_strings:
            if tag_string not in printed_problem_strings:
              printed_problem_strings.add(tag_string)
              number_of_tag_problems += 1
              print(
                f"- [{tag_string}](https://crowdin.com/editor/session-crossplatform-strings/300/en-{locale.replace('-','').replace('_','').lower()}?view=comfortable&filter=basic&value=3#q={tag_string})")
    print(f"Total Problems: {number_of_tag_problems}")

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
  warning_message = (
    "Old dynamic variables were found in the locales. Please update the locales to use the new dynamic variables. "
  )
  if args.print_old_dynamic_variables:
    if args.print_problems:
      warning_message += "See above for details (before the problems table)."
    else:
      warning_message += "See above for details."
  else:
    warning_message += "Run the script with --print-old-dynamic-variables to see the old dynamic variables."
  console.warn(warning_message)

console.debug("Locales generation complete")

timer.stop()

if args.error_on_problems:
  missing_keys_all = 0
  additional_keys_all = 0
  missing_variables_all = 0
  additional_variables_all = 0

  for locale_name, locale_issues in problems.items():
    if locale_name == "en":
      continue

    missing_keys_all += len(locale_issues.get("missing_keys", []))
    additional_keys_all += len(locale_issues.get("additional_keys", []))
    missing_variables_all += sum(
      len(v) for v in locale_issues.get("missing_variables", {}).values()
    )
    additional_variables_all += sum(
      len(v) for v in locale_issues.get("additional_variables", {}).values()
    )

  EXIT_CODE = 0

  if missing_keys_all > 0:
    console.log(f"Missing keys: {missing_keys_all}")

  if additional_keys_all > 0:
    console.log(f"Additional keys: {additional_keys_all}")

  if missing_variables_all > 0:
    console.log(f"Missing variables: {missing_variables_all}")
    EXIT_CODE = 1

  if additional_variables_all > 0:
    console.log(f"Additional variables: {additional_variables_all}")
    EXIT_CODE = 1

  if number_of_tag_problems > 0:
    console.log(f"Formatting issues: {number_of_tag_problems}")
    EXIT_CODE = 1

  sys.exit(EXIT_CODE)

sys.exit(0)
