import csv
import json
import os
import sys

# This allows for importing from the localization and util directories NOTE: Auto importing tools will also prepend the import paths with "tools." this will not work and needs to be removed from import paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from util.listUtils import missingFromSet


def edit_strings(json_file, json_file_new, csv_file, for_export):

    # Delete new file if it exists
    if os.path.exists(json_file_new):
        os.remove(json_file_new)
    # Load the JSON file
    with open(json_file, "r") as f:
        data = json.load(f)

    all_keys = set(data.keys())

    remove_keys = set()
    add_keys = set()
    keep_keys = set()

    # Open the CSV file
    with open(csv_file, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:

            execute = row["EXECUTE"]
            if execute != "TRUE":
                continue

            action = row["ACTION"]
            existing_key = row["EXISTING_STRING"].strip()
            new_key = row["NEW_STRING"].strip()
            done = row["DONE"]

            if done == "FALSE":
                continue

            # Perform the action
            if action == "remove":
                if existing_key in data:
                    del data[existing_key]
                    remove_keys.add(existing_key)
                else:
                    print(f"Key '{existing_key}' not found in JSON file")

            elif action == "add":
                if new_key not in data:
                    data[new_key] = row["NEW_PHRASE"]
                    add_keys.add(new_key)
                else:
                    print(f"Key '{new_key}' already exists in JSON file")

            elif action == "replace":
                if existing_key in data:
                    del data[existing_key]
                    remove_keys.add(existing_key)
                else:
                    print(f"Key '{existing_key}' not found in JSON file")
                data[new_key] = row["NEW_PHRASE"]
                add_keys.add(new_key)

            elif action == "keep":
                if new_key not in data:
                    print(f"Key '{new_key}' not found in JSON file")
                data[new_key] = row["NEW_PHRASE"]
                keep_keys.add(new_key)

    touched_keys = remove_keys.union(add_keys).union(keep_keys)
    untouched_keys = missingFromSet(all_keys, touched_keys)
    if untouched_keys:
        print(
            "The following keys were not touched by the CSV file and will be removed:"
        )
        for key in untouched_keys:
            print(key)
            # del data[key]

    for_export_keys = set()

    # Open the CSV file for export
    with open(for_export, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = row["STRING"]
            phrase = row["ENGLISH"]

            # If the key is not in data add it with the phrase
            if key not in data:
                data[key] = phrase
                for_export_keys.add(key)
            # If the key is in data and the phrase is different, update the phrase
            elif data[key] != phrase:
                print(
                    f"Key '{key}' already exists in JSON file with a different phrase"
                )

    # Save the JSON file
    with open(json_file_new, "w") as f:
        # remove empty lines
        data = {k: v for k, v in data.items() if v}
        json.dump(data, f, indent=2, sort_keys=True)


# Call the function
edit_strings(
    "./_locales/en/messages-old.json",
    "./_locales/en/messages.json",
    "./tools/localization/masterdoc.csv",
    "./tools/localization/forexport.csv",
)
