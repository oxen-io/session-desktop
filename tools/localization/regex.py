import re


# The regex statements are designed to shortcut so are ordered from most common to least common. The advanced cases will also detect the same result as the simple cases. This is fine.
def get_localization_regex_list(string):
  key = re.escape(string)
  # Regex is ordered from most common to least common
  return [
    fr"window\.i18n\('{key}'\)",
    fr"window\.i18n\('{key}'(, {{[\S\s.]*}})?\)",
    fr"\{{ token: '{key}'(, args: {{.*}})? \}}",
    # This also captures the same group as `basic_object` but this is fine because basic_object shortcuts before reaching here if found.
    fr"{{\s+token: '{key}',?\s+(\s*args: {{[\S\s.]*}},)?\s+\}}",
    fr"window\.i18n\.(stripped|inEnglish|getRawMessage)\('{key}'(, {{[\S\s.]*}})?\)",
    fr"<I18n[\S\s.]*token=\{{?['\"]{key}['\"]\}}?",
    fr"<I18n[\S\s.]*token=[\S\s.]*{key}[\S\s.]*",
    fr"i18n\('{key}'\)",
    fr"i18n\('{key}'(, {{[\S\s.]*}})?\)",
    fr"i18n\.(stripped|inEnglish|getRawMessage)\('{key}'(, {{[\S\s.]*}})?\)",
    fr"window\?\.i18n\?\.\('{key}'(, {{[\S\s.]*}})?\)",
    fr"<StyledI18nSubText[\S\s.]*token=[\S\s.]*{key}[\S\s.]*"
  ]


def localization_regex_as_list(string):
  regex_ordered = get_localization_regex_list(string)
  regex_compiled_list = []
  for regex in regex_ordered:
    regex_compiled_list.append(
      re.compile(regex, re.DOTALL)
    )

  return regex_compiled_list
