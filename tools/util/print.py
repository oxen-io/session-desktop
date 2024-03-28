import json


def print_json(data, sort_keys=False):
    print(json.dumps(data, sort_keys=sort_keys, indent=2))
