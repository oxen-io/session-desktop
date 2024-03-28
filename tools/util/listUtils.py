def missingFromList(list1, list2):
    """
    Returns a new list containing the elements that are present in list1 but not in list2.

    Args:
      list1 (list): The first list.
      list2 (list): The second list.

    Returns:
      list: A new list containing the elements that are present in list1 but not in list2.
    """
    return [item for item in set(list1) if item not in set(list2)]


def missingFromSet(set1, set2):
    """
    Returns a new set containing the elements that are present in set1 but not in set2.

    Args:
      set1 (set): The first set.
      set2 (set): The second set.

    Returns:
      set: A new set containing the elements that are present in set1 but not in set2.
    """
    return {item for item in set1 if item not in set2}


def removeFromSet(set1, set2):
    """
    Removes the elements that are present in set2 from set1.

    Args:
      set1 (set): The first set.
      set2 (set): The second set.

    Returns:
      set: A new set containing the elements of set1 after removing the elements of set2.
    """
    return {item for item in set1 if item not in set2}
