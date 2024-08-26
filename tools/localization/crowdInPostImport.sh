#!/bin/sh

echo 'Cleaning up CrowdIn import'

GENERATE_LOCALES_FILE=$PWD/tools/localization/generateLocales.py

# Generate Types and find problems if the python script exists with a non-zero exit code then the build will fail
python3 $GENERATE_LOCALES_FILE --print-problems --error-on-problems --error-old-dynamic-variables --print-old-dynamic-variables
