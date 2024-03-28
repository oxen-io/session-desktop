#!/bin/sh

echo 'Cleaning up CrowdIn import'

SORT_JSON_FILE=$PWD/tools/util/sortJson.py
GENERATE_LOCALES_FILE=$PWD/tools/localization/generateLocales.py

# Sort all the messages.json files
for dir in $PWD/_locales/*/
do
  dir=${dir%*/}
  file="${dir}/messages.json"
  if [ -f "$file" ]
  then
    python $SORT_JSON_FILE "$file"
  else
    echo "$file not found."

  fi
done

# Generate Types and find problems if the python script exists with a non-zero exit code then the build will fail
python3 $GENERATE_LOCALES_FILE --print-problems --error-on-problems --error-old-dynamic-variables --print-old-dynamic-variables
