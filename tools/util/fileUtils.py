import json
import os
import sys


# This allows for importing from the localization and util directories NOTE: Auto importing tools will also prepend the import paths with "tools." this will not work and needs to be removed from import paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from localization.parseDictionary import parse_dictionary


def createMappedJsonFileDictionary(inputDir, fileName):
    """
    This function creates a dictionary that maps sub-directory names to their corresponding JSON file data.

    Args:
      inputDir (str): The path to the input directory containing sub-directories.
      fileName (str): The name of the JSON file to be read for each sub-directory.

    Returns:
      tuple: A tuple containing two dictionaries:
        - The first dictionary maps sub-directory names (with hyphens replaced by underscores) to their JSON data.
        - The second dictionary maps sub-directory names (with hyphens replaced by underscores) to the file paths of their JSON files.
    """

    # Get a list of all directories in the input directory
    files = [
        name
        for name in os.listdir(inputDir)
        if os.path.isdir(os.path.join(inputDir, name))
    ]

    # Initialize dictionaries to hold JSON data and file paths
    dictionary = dict()
    dictionaryKeyFiles = dict()

    # Iterate over each sub-directory
    for filePath in files:
        # Replace hyphens in the directory name with underscores to create the dictionary key
        key = filePath.replace("-", "_")

        # Construct the full path to the JSON file in this sub-directory
        filePath = os.path.join(inputDir, filePath, fileName)

        # Store the file path in the dictionaryKeyFiles dictionary
        dictionaryKeyFiles[key] = filePath

        # Open the JSON file and load the data into the dictionary
        localDict = parse_dictionary(filePath)

        if localDict is not None:
            dictionary[key] = localDict

    # Return the dictionaries containing the JSON data and file paths
    return dictionary, dictionaryKeyFiles


def makeDirIfNotExists(filePath):
    """
    This function creates a directory if it does not already exist.

    Args:
      dirPath (str): The path to the directory to create.
    """
    os.makedirs(os.path.dirname(filePath), exist_ok=True)


def writeFile(filePath, data):
    """
    This function writes data to a file. Creating its parent directories if they do not exist.

    Args:
      filePath (str): The path to the file to write the data to.
      data (str): The data to write to the file.
    """
    makeDirIfNotExists(filePath)
    with open(filePath, "w", encoding='utf-8') as file:
        file.write(data)


def removeFileIfExists(filePath):
    """
    This function removes a file if it exists.

    Args:
      filePath (str): The path to the file to remove.
    """
    if os.path.exists(filePath) and os.path.isfile(filePath):
        os.remove(filePath)
