#!/bin/python3
import os
import sys
import csv
import re
import glob
import argparse
import multiprocessing
import json
from functools import partial

# This allows for importing from the localization and util directories NOTE: Auto importing tools will also prepend the import paths with "tools." this will not work and needs to be removed from import paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from util.time import ExecutionTimer
import time

timer = ExecutionTimer()

from localization.regex import localization_regex_as_list
from util.fileUtils import makeDirIfNotExists, removeFileIfExists
from util.logger import console

parser = argparse.ArgumentParser()
parser.add_argument(
  "--debug", action="store_true", help="Enable debug mode, print debug messages"
)
parser.add_argument(
  "--output-dir",
  type=str,
  default="./tools/localization/analysis",
  help="Output directory for the results",
)
parser.add_argument(
  "--write-found-to-file",
  action="store_true",
  help="Write the found strings to a file",
)
parser.add_argument(
  "--write-not-found-to-file",
  action="store_true",
  help="Write the not found strings to a file",
)
parser.add_argument(
  "--print-not-found",
  action="store_true",
  help="Print the not found strings",
)
parser.add_argument(
  "--identify-found-in-files",
  action="store_true",
  help="Identify line-numbers using regex.",
)
parser.add_argument(
  "--identify-line-numbers",
  action="store_true",
  help="Identify line-numbers using regex.",
)
parser.add_argument(
  "--disable-concurrency",
  action="store_true",
  help="Disable multiprocessing concurrency.",
)
parser.add_argument(
  "--find-potential-matches",
  action="store_true",
  help="Find potential matched strings using very lazy regex.",
)
parser.add_argument(
  "--delete-unused-keys",
  action="store_true",
  help="Delete unused keys."
)

args = parser.parse_args()

# Configuration
DEBUG = args.debug
CONCURRENCY_ENABLED = not args.disable_concurrency

if CONCURRENCY_ENABLED and (args.identify_found_in_files or args.identify_line_numbers):
  CONCURRENCY_ENABLED = False
  console.info(f"Concurrency is disabled when --identify-found-in-files or --identify-line-numbers is used")

if CONCURRENCY_ENABLED:
  console.info(f"Concurrency enabled. Use --disable-concurrency to disable concurrency.")

console.enableDebug() if DEBUG else None

OUTPUT_DIR = args.output_dir
FOUND_STRINGS_PATH = os.path.join(OUTPUT_DIR, "found_strings.csv")
NOT_FOUND_STRINGS_PATH = os.path.join(OUTPUT_DIR, "not_found_strings.txt")
POTENTIAL_MATCHES_PATH = os.path.join(OUTPUT_DIR, "potential_matches.csv")
NOT_IN_MASTER_LIST_PATH = os.path.join(OUTPUT_DIR, "not_in_master_list.csv")

EN_PATH = "_locales/en/messages.json"

# Remove files that are to be generated if they exist
removeFileIfExists(FOUND_STRINGS_PATH)
removeFileIfExists(NOT_FOUND_STRINGS_PATH)
removeFileIfExists(POTENTIAL_MATCHES_PATH)
removeFileIfExists(NOT_IN_MASTER_LIST_PATH)


def flush():
  sys.stdout.flush() if not DEBUG else None


# File search setup
console.info("Scanning for localized strings...")
files_to_ignore = ["./ts/localization/locales.ts"]
ignore_patterns = [re.compile(re.escape(pattern)) for pattern in files_to_ignore]

console.debug(f"Ignoring files: {', '.join(files_to_ignore)}")


def should_ignore_file(path):
  return any(pattern.search(path) for pattern in ignore_patterns)


def find_files_with_extension(root_dir, extensions):
  for entry in os.scandir(root_dir):
    if entry.is_dir():
      yield from find_files_with_extension(entry.path, extensions)
    elif any(entry.name.endswith(ext) for ext in extensions) and not should_ignore_file(entry.path):
      yield entry.path


os_walk_time_start = time.perf_counter()
files = set(find_files_with_extension("./ts/", (".ts", ".tsx")))
files.update(
  [
    y
    for x in os.listdir("./")
    for y in glob.glob(os.path.join(x[0], "*preload.js"))
    if not should_ignore_file(y)
  ]
)
os_walk_time_end = time.perf_counter()

bar_length = 50

PROGRESS_BAR_CURRENT_PERCENTAGE = 0


def progress_bar(current, total):
  global PROGRESS_BAR_CURRENT_PERCENTAGE
  if DEBUG:
    return
  percent_overall = round(100 * current / total)
  if percent_overall <= PROGRESS_BAR_CURRENT_PERCENTAGE:
    return
  PROGRESS_BAR_CURRENT_PERCENTAGE = percent_overall
  sys.stdout.write("\r")
  sys.stdout.write(
    "Progress: [{:{}}] {:>3}% ".format(
      "=" * int(percent_overall / (100 / bar_length)),
      bar_length,
      int(percent_overall),
    )
  )
  sys.stdout.flush()


# Read json file and get all keys
parse_locale_file_time_start = time.perf_counter()
with open(EN_PATH, 'r', encoding='utf-8') as messages_file:
  key_list = json.load(messages_file).keys()
number_of_keys = len(key_list)
console.info(f"Loaded {number_of_keys} keys to search for")
parse_locale_file_time_end = time.perf_counter()


def search_string_in_regex_list(regex_list, file_content):
  return any(matcher.search(file_content) for matcher in regex_list)


def load_file(file_path):
  console.debug(f"Loading {file_path} into memory")
  return open(file_path, "r", encoding="utf-8").read()


read_files_time_start = time.perf_counter()
loaded_files = [load_file(file_path) for file_path in files]
read_files_time_end = time.perf_counter()


def find_key(key):
  regex_list = localization_regex_as_list(key)
  return key if any(search_string_in_regex_list(regex_list, file_content) for file_content in loaded_files) else None


def process_keys_concurrently():
  with multiprocessing.Pool() as pool:
    result = pool.map(find_key, key_list)
    return set(result)


REGEX_TIME_TRACKER = 0.0


def regex_find(regex_list, file_content):
  global REGEX_TIME_TRACKER  # Declare the variable as global
  regex_start = time.perf_counter()
  found = search_string_in_regex_list(regex_list, file_content)
  regex_end = time.perf_counter()
  REGEX_TIME_TRACKER += (regex_end - regex_start)  # Correct time calculation
  return found


def print_search(search_key, search_info=""):
  console.debug(f"{search_key:<{42}} | {search_info}")


def process_keys():
  found_strings_and_locations = {}  # Dictionary to store found strings and their locations
  found_strings_set = set()  # Set to store found strings
  not_found_strings_set = set()  # Set to store not found strings
  for_loop_iterations = {}
  if DEBUG:
    for_loop_iterations["keys"] = 0
    for_loop_iterations["files"] = 0
    for_loop_iterations["lines"] = 0
  i = -1
  for key in key_list:
    i = i + 1
    regex_list = localization_regex_as_list(key)

    progress_bar(
      i, number_of_keys
    )

    if DEBUG:
      for_loop_iterations["keys"] += 1

    print_search(key, f"Searching")

    locations = []
    j = -1
    for file_path in files:
      j += 1

      if DEBUG:
        for_loop_iterations["files"] += 1

      if not regex_find(regex_list, loaded_files[j]):
        continue

      found_strings_set.add(key)

      print_search(key, f"Found string in {file_path}")

      if args.identify_line_numbers:
        for line_number, line in enumerate(loaded_files[j].split("\n"), start=1):
          if DEBUG:
            for_loop_iterations["lines"] += 1

          if regex_find(regex_list, line):
            locations.append(f"./{file_path}:{line_number}")

    if key not in found_strings_set:
      not_found_strings_set.add(key)
      print_search(key, f"Not Found")
    if locations:
      print_search(key, f"Found in {len(locations)} files")
      found_strings_and_locations[key] = locations

  if DEBUG:
    console.debug(for_loop_iterations)
  return found_strings_set, not_found_strings_set, found_strings_and_locations


found_strings_and_locations = None
processing_time_start = time.perf_counter()
if CONCURRENCY_ENABLED:
  results_set = process_keys_concurrently()
  found_keys = set(key_list).intersection(results_set)
  not_found_keys = set(key_list).difference(results_set)
else:
  found_keys, not_found_keys, found_strings_and_locations = process_keys()
processing_time_end = time.perf_counter()

progress_bar(1, 1)
flush()

# Writing found strings and their locations to a CSV file
if args.write_found_to_file and found_strings_and_locations is not None:
  makeDirIfNotExists(FOUND_STRINGS_PATH)
  with open(FOUND_STRINGS_PATH, "w", encoding="utf-8", newline="") as csvfile:
    csvwriter = csv.writer(csvfile)
    csvwriter.writerow(["String", "Locations"])  # Header row
    for foundString, locations in found_strings_and_locations.items():
      # Write each found string and its locations. Locations are joined into a single string for CSV simplicity
      csvwriter.writerow(
        [foundString, "; ".join(locations)]
      )

# Writing not found strings to a text file as before
if args.write_not_found_to_file:
  makeDirIfNotExists(NOT_FOUND_STRINGS_PATH)
  with open(NOT_FOUND_STRINGS_PATH, "w", encoding="utf-8") as not_found_file:
    for notFound in not_found_keys:
      not_found_file.write(f"{notFound}\n")

num_found = len(found_keys)
num_not_found = len(not_found_keys)

sys.stdout.write("\n")
# Print the result statistics and file paths (linkable)

if args.print_not_found:
  [print(key) for key in sorted(not_found_keys)]


def find_key_lazy(key):
  i = -1
  regex = re.compile(fr"['\"]{re.escape(key)}['\"]")
  for file_path in files:
    i += 1
    if regex.search(loaded_files[i]):
      return key, file_path
  return None, None


def find_lazy_matches_for_not_found():
  with multiprocessing.Pool() as pool:
    result = pool.map(find_key_lazy, not_found_keys)
    return set(result)


potential_matches = set()
if args.find_potential_matches:
  potential_matches = find_lazy_matches_for_not_found()
  potential_matches.discard((None, None))
  [console.info(f"{key:<{42}} | Potential Match: {file_name}") for key, file_name in potential_matches]
  console.info(f"Found {len(potential_matches)} potential matches")

console.info(
  f"Found {num_found}/{number_of_keys} ({(num_found / number_of_keys):.0%}) strings in {len(files)} files")

if args.find_potential_matches and len(potential_matches) > 0:
  console.info(
    f"(Including all potential matches) Found {num_found + len(potential_matches)}/{number_of_keys} ({((num_found + len(potential_matches)) / number_of_keys):.0%}) strings in {len(files)} files")

if args.write_found_to_file:
  console.info(f"Found strings and their locations written to: {FOUND_STRINGS_PATH}")

if args.write_not_found_to_file:
  console.info(
    f"Identified {num_not_found} not found strings and written to: {NOT_FOUND_STRINGS_PATH}"
  )
else:
  console.info(f"Identified {num_not_found} not found strings")

if DEBUG and REGEX_TIME_TRACKER > 0:
  console.debug(f"Time spend in regex land: {REGEX_TIME_TRACKER:0.4f} seconds")

if DEBUG:
  os_walk_time = os_walk_time_end - os_walk_time_start
  parse_locale_time = parse_locale_file_time_end - parse_locale_file_time_start
  read_files_time = read_files_time_end - read_files_time_start
  processing_time = processing_time_end - processing_time_start
  console.debug(f"OS Walk reading time: {os_walk_time:0.4f} seconds")
  console.debug(f"Locale File parse time: {parse_locale_time:0.4f} seconds")
  console.debug(f"File reading time: {read_files_time:0.4f} seconds")
  console.debug(f"Processing time: {processing_time:0.4f} seconds")
  console.debug(
    f"Total Elapsed Tracked Time: {os_walk_time + parse_locale_time + read_files_time + processing_time:0.4f} seconds")

timer.stop()


def remove_keys_from_json(json_file_path, keys_to_remove):
  # Load the JSON data from the file
  with open(json_file_path, 'r', encoding='utf-8') as json_file:
    data = json.load(json_file)

  # Remove the specified keys from the JSON data
  data = {key: value for key, value in data.items() if key not in keys_to_remove}

  # Write the updated data back to the original JSON file
  with open(json_file_path, 'w', encoding='utf-8') as json_file:
    json.dump(data, json_file, ensure_ascii=False, indent=4)
  print(f"Keys removed and JSON file updated: {json_file_path}")


if args.delete_unused_keys:
  locale_files = find_files_with_extension("./_locales", "message.json")
  for locale_file in locale_files:
    remove_keys_from_json(locale_file, not_found_keys)
