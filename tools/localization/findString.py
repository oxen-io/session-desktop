#!/bin/python3
import argparse
import os
import sys

# This allows for importing from the localization and util directories NOTE: Auto importing tools will also prepend the import paths with "tools." this will not work and needs to be removed from import paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from localization.regex import localization_regex


# Create the parser
parser = argparse.ArgumentParser(
    description="Search the codebase and find a localized string."
)

# Add the arguments
parser.add_argument("Token", metavar="token", type=str, help="the token to search for")
parser.add_argument(
    "-o", "--open", action="store_true", help="Open the results in VSCode"
)
parser.add_argument(
    "-l",
    "--limit",
    type=int,
    default=1,
    help="Specify a maximum number of files to open",
)

# Parse the arguments
args = parser.parse_args()

TOKEN = args.Token
EXCLUDE_FILES = ["LocalizerKeys.ts"]
OPEN_IN_VSCODE = args.open
NUMBER_OF_FILES_LIMIT = args.limit


def find_token_uses(token, root_dir="./ts/", exclude_files=EXCLUDE_FILES):
    regex = localization_regex(token)
    matches = []

    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith((".tsx", ".ts")) and file not in exclude_files:
                file_path = os.path.join(root, file)
                with open(file_path, "r", encoding='utf-8') as f:
                    for line_no, line in enumerate(f, start=1):
                        if regex.search(line):
                            matches.append(f"{file_path}:{line_no}")

    return matches


import os

matches = find_token_uses(TOKEN)
if matches:
    print(f"Found {len(matches)} matches for token '{TOKEN}':")
    for match in matches:
        print(match)
else:
    print(f"No matches found for token '{TOKEN}'")

if OPEN_IN_VSCODE:
    if NUMBER_OF_FILES_LIMIT > 0:
        if len(matches) > NUMBER_OF_FILES_LIMIT:
            print(
                f"Opening the first {NUMBER_OF_FILES_LIMIT} files (out of {len(matches)}). Use the -l flag to increase the limit. or -l 0 to open all files."
            )
        matches = matches[:NUMBER_OF_FILES_LIMIT]

    for match in matches:
        os.system(f"code -g {match}")
