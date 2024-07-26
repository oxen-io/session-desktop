#!/bin/python3
import os
import sys
import csv
import re
import glob
import argparse

# This allows for importing from the localization and util directories NOTE: Auto importing tools will also prepend the import paths with "tools." this will not work and needs to be removed from import paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from util.time import ExecutionTimer

timer = ExecutionTimer()

from localization.parseDictionary import parse_dictionary
from localization.regex import localization_regex
from util.listUtils import missingFromSet, removeFromSet
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
    "--master-strings",
    type=str,
    default="./tools/localization/input/master_string_list.txt",
    help="Path to the master string list",
)
parser.add_argument(
    "--to-be-removed",
    type=str,
    default="./tools/localization/input/to_be_removed_list.txt",
    help="Path to the list of strings to be removed",
)

args = parser.parse_args()

# Configuration
intentionallyUnusedStrings = []
DEBUG = args.debug

console.enableDebug() if DEBUG else None

OUTPUT_DIR = args.output_dir
FOUND_STRINGS_PATH = os.path.join(OUTPUT_DIR, "found_strings.csv")
NOT_FOUND_STRINGS_PATH = os.path.join(OUTPUT_DIR, "not_found_strings.txt")
POTENTIAL_MATCHES_PATH = os.path.join(OUTPUT_DIR, "potential_matches.csv")
NOT_IN_MASTER_LIST_PATH = os.path.join(OUTPUT_DIR, "not_in_master_list.csv")

EN_PATH = "_locales/en/messages.json"

MASTER_STRINGS_PATH = args.master_strings
TO_BE_REMOVED_PATH = args.to_be_removed

# Remove files that are to be generated if they exist
removeFileIfExists(FOUND_STRINGS_PATH)
removeFileIfExists(NOT_FOUND_STRINGS_PATH)
removeFileIfExists(POTENTIAL_MATCHES_PATH)
removeFileIfExists(NOT_IN_MASTER_LIST_PATH)


def flush():
    sys.stdout.flush() if not DEBUG else None


# File search setup
console.info("Scanning for localized strings...")
files = []
files_to_ignore = ["LocalizerKeys.ts"]
ignore_patterns = [re.compile(pattern) for pattern in files_to_ignore]

console.debug(f"Ignoring files: {", ".join(files_to_ignore)}")


def should_ignore_file(file_path):
    return any(pattern.search(file_path) for pattern in ignore_patterns)


for extension in ("*.ts", "*.tsx"):
    files.extend(
        [
            y
            for x in os.walk("./ts/")
            for y in glob.glob(os.path.join(x[0], extension))
            if not should_ignore_file(y)
        ]
    )

foundStringsAndLocations = {}  # Dictionary to store found strings and their locations
notFoundStrings = set()  # Set to store not found strings
total_files = len(files) * 1.1
bar_length = 25


def progress_bar(current, total, overallCurrent, overalTotal):
    if DEBUG:
        return
    percent = 100.0 * current / total
    percentOverall = 100.0 * overallCurrent / overalTotal
    sys.stdout.write("\r")
    sys.stdout.write(
        "Overall: [{:{}}] {:>3}% ".format(
            "=" * int(percentOverall / (100.0 / bar_length)),
            bar_length,
            int(percentOverall),
        )
    )
    sys.stdout.write(
        "Stage: [{:{}}] {:>3}%".format(
            "=" * int(percent / (100.0 / bar_length)), bar_length, int(percent)
        )
    )
    sys.stdout.flush()


current_line_number = 0
current_file_number = 0
line_count = 0
keys = []


with open(EN_PATH, "r", encoding="utf-8") as messages_file:
    messages_dict = json.load(messages_file)

# Read json file and get all keys
with open(EN_PATH, "r", encoding="utf-8") as messages_file:
    for line in messages_file:
        for match in re.finditer(r'"([^"]+)":', line):
            keys.append(match.group(1))

total_line_numbers = len(keys)
console.debug(f"Total keys: {total_line_numbers}")


def format_vscode_path(file_path):
    return file_path.replace("./", "")


# search
for key in keys:
    if key in intentionallyUnusedStrings:
        continue

    searchedLine = localization_regex(key)

    locations = []
    current_file_number = 0  # To keep track of the current file number for progress bar
    for file_path in files:
        with open(file_path, "r", encoding="utf-8") as file_content:
            content = file_content.read()
            for line_number, line in enumerate(content.split("\n"), start=1):
                if searchedLine.search(line):
                    locations.append(f"{format_vscode_path(file_path)}:{line_number}")

        current_file_number += 1
        progress_bar(
            current_file_number, total_files, current_line_number, total_line_numbers
        )
    current_line_number += 1
    if locations:
        console.debug(f"{key} - Found in {len(locations)}")
        foundStringsAndLocations[key] = locations
    else:
        console.debug(f"{key} - Not Found")
        notFoundStrings.add(key)

progress_bar(1, 1, 1, 1)

flush()

# Writing found strings and their locations to a CSV file
makeDirIfNotExists(FOUND_STRINGS_PATH)
with open(FOUND_STRINGS_PATH, "w", encoding="utf-8", newline="") as csvfile:
    csvwriter = csv.writer(csvfile)
    csvwriter.writerow(["String", "Phrase", "Locations"])  # Header row
    for foundString, locations in foundStringsAndLocations.items():
        # Write each found string and its locations. Locations are joined into a single string for CSV simplicity
        csvwriter.writerow(
            [foundString, messages_dict[foundString], "; ".join(locations)]
        )

# Writing not found strings to a text file as before
makeDirIfNotExists(NOT_FOUND_STRINGS_PATH)
with open(NOT_FOUND_STRINGS_PATH, "w", encoding="utf-8") as not_found_file:
    for notFound in notFoundStrings:
        not_found_file.write(f"{notFound}\n")

sys.stdout.write("\n")
# Print the result statistics and file paths (linkable)
console.info(f"Found {len(foundStringsAndLocations)} strings in {len(files)} files")
console.info(f"Found strings and their locations written to: {FOUND_STRINGS_PATH}")

console.info(
    f"Identified {len(notFoundStrings)} not found strings and written to: {NOT_FOUND_STRINGS_PATH}"
)

# Search for not found strings in any single quotes across all files
console.info("Searching for potential matches for not found strings...")
current_not_found_number = 0
current_file_number = 0
total_not_found_strings = len(notFoundStrings)
potentialMatches = (
    {}
)  # Dictionary to store potential matches: {string: [file1, file2, ...]}
for string in notFoundStrings:
    console.debug(f"Searching for: {string}")
    current_file_number = 0
    quotedStringPattern = re.compile(
        r"'{}'".format(string)
    )  # Pattern to search for 'STRING'
    for file_path in files:
        with open(file_path, "r", encoding="utf-8") as file_content:
            if quotedStringPattern.search(file_content.read()):
                console.debug(f"Potential match found: {string} in {file_path}")
                if string not in potentialMatches:
                    potentialMatches[string] = []
                potentialMatches[string].append(file_path)
            current_file_number += 1
        progress_bar(
            current_file_number,
            total_files,
            current_not_found_number,
            total_not_found_strings,
        )
    current_not_found_number += 1


# Function to find the line numbers of matches within a specific file
def find_line_numbers(file_path, pattern):
    line_numbers = []
    with open(file_path, "r", encoding="utf-8") as file:
        for i, line in enumerate(file, start=1):
            if pattern.search(line):
                line_numbers.append(i)
    return line_numbers


# Process the found files to add line numbers
for string, files in potentialMatches.items():
    for file_path in files:
        quotedStringPattern = re.compile(r"'{}'".format(string))
        line_numbers = find_line_numbers(file_path, quotedStringPattern)
        match_details = [f"{file_path}:{line}" for line in line_numbers]
        potentialMatches[string] = match_details  # Update with detailed matches

# Writing potential matches to CSV, now with line numbers
makeDirIfNotExists(POTENTIAL_MATCHES_PATH)
with open(POTENTIAL_MATCHES_PATH, "w", encoding="utf-8", newline="") as csvfile:
    csvwriter = csv.writer(csvfile)
    csvwriter.writerow(["String", "Potential File Matches"])
    for string, matches in potentialMatches.items():
        csvwriter.writerow([string, "; ".join(matches)])

sys.stdout.write("\n")
# Print the result statistics and file paths (linkable)
console.info(
    f"Potential matches found for {len(potentialMatches)}/{len(notFoundStrings)} not found strings "
)
console.info(f"Potential matches written to: {POTENTIAL_MATCHES_PATH}")

# Identify found strings that are not in the master string list
try:
    masterStringList = set()
    with open(MASTER_STRINGS_PATH, "r", encoding="utf-8") as masterListFile:
        for line in masterListFile:
            masterStringList.add(line.strip())

    notInMasterList = missingFromSet(
        set(foundStringsAndLocations.keys()), masterStringList
    )

    try:
        slatedForRemovalList = set()
        with open(TO_BE_REMOVED_PATH, "r", encoding="utf-8") as slatedForRemovalFile:
            for line in slatedForRemovalFile:
                slatedForRemovalList.add(line.strip())
        notInMasterList = removeFromSet(notInMasterList, slatedForRemovalList)
    except FileNotFoundError:
        console.warn(
            f"Strings to be removed list not found at: {TO_BE_REMOVED_PATH}. Skipping comparison."
        )

    # Output the found strings not in the master list to a CSV file
    makeDirIfNotExists(NOT_IN_MASTER_LIST_PATH)
    with open(NOT_IN_MASTER_LIST_PATH, "w", encoding="utf-8", newline="") as csvfile:
        csvwriter = csv.writer(csvfile)
        csvwriter.writerow(["String", "Phrase", "Locations"])  # Header row
        for notInMaster in notInMasterList:
            # Write each found string and its locations. Locations are joined into a single string for CSV simplicity
            csvwriter.writerow(
                [
                    notInMaster,
                    messages_dict[notInMaster],
                    "; ".join(foundStringsAndLocations[notInMaster]),
                ]
            )
    console.info(f"Found {len(notInMasterList)} strings not in the master list")
    console.info(
        f"Found strings not in the master list written to: {NOT_IN_MASTER_LIST_PATH}"
    )
except FileNotFoundError:
    console.warn(
        f"Master string list not found at: {MASTER_STRINGS_PATH}. Skipping comparison."
    )

if DEBUG:
    console.warn(
        "This script ran with debug enabled. Please disable debug mode for a cleaner output and faster execution."
    )

timer.stop()
