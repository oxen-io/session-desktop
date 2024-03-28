import os
import sys

# This allows for importing from the localization and util directories NOTE: Auto importing tools will also prepend the import paths with "tools." this will not work and needs to be removed from import paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from util.print import print_json

global DEBUG
DEBUG = False


class console:

    def enableDebug():
        global DEBUG
        DEBUG = True
        console.debug("Debug mode enabled")

    def log(msg):
        print(msg)

    def debug(msg):
        if DEBUG:
            print(f"[DEBUG] {msg}")

    def info(msg):
        print(f"[INFO] {msg}")

    def warn(msg):
        print(f"[WARN] {msg}")

    def debug_json(msg, json_data):
        if DEBUG:
            print(msg)
            print_json(json_data, sort_keys=True)

    def info_json(msg, json_data):
        print(f"[INFO] {msg}")
        print_json(json_data, sort_keys=False)
