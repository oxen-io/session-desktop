#!/bin/python3
import json
import argparse


# Create the parser
parser = argparse.ArgumentParser(description="Sort a JSON file.")

# Add the arguments
parser.add_argument(
    "InputFile", metavar="inputfile", type=str, help="the input JSON file"
)
parser.add_argument(
    "-o",
    metavar="outputfile",
    type=str,
    nargs="?",
    default="",
    help="the output JSON file (optional)",
)

# Parse the arguments
args = parser.parse_args()

INPUT_FILE = args.InputFile
OUTPUT_FILE = args.o if args.o else INPUT_FILE

# Load the JSON data from the input file
with open(INPUT_FILE, "r") as f:
    data = json.load(f)

# Sort the JSON data
sorted_data = json.dumps(data, sort_keys=True, indent=2)

with open(OUTPUT_FILE, "w") as f:
    f.write(sorted_data)

print(f"Sorted JSON data written to {OUTPUT_FILE}")
