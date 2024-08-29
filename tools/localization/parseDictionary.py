import json

import os
import xml.etree.ElementTree as ET


def parse_json(file_path):
    if not os.path.exists(file_path):
        return None
    with open(file_path, encoding='utf-8') as file:
        data = json.load(file)
    return data


def parse_xml(file_path):
    if not os.path.exists(file_path):
        return None
    tree = ET.parse(file_path)
    root = tree.getroot()
    data = {}
    for child in root:
        key = child.attrib["name"]
        value = child.text
        data[key] = value
    return data


def parse_strings(file_path):
    if not os.path.exists(file_path):
        return None
    data = {}
    with open(file_path, encoding='utf-8') as file:
        for line in file:
            if "=" in line:
                key, value = line.strip().split("=")
                key = key.strip().strip('"')
                value = value.strip().strip(";").strip('"')
                data[key] = value
    return data


def parse_dictionary(file_path):
    if file_path.endswith(".json"):
        return parse_json(file_path)
    elif file_path.endswith(".xml"):
        return parse_xml(file_path)
    elif file_path.endswith(".strings"):
        return parse_strings(file_path)
    else:
        raise ValueError("Unsupported file format")
