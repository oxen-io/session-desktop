import re


def localization_regex(string):
    e_str = re.escape(string)

    rex_b = r"i18n\([\r\n]?\s*'{}'|messages.{}|'{}'".format(e_str, e_str, e_str)
    rex_l = r"localizedKey\s*=\s*'{}'".format(e_str)
    res_8n = r"window\.i18n\(\s*'{}'(?:,\s*(?:[^\)]+?))?\s*\)".format(e_str)
    res_comp = r'<I18n\s+[^>]*?token=["\']{}["\'][^>]*?>'.format(e_str)
    res_token = r'token=["\']{}["\']'.format(e_str)
    res_8n_stripped = r"window\.i18n\.stripped\(\s*'{}'(?:,\s*(?:[^\)]+?))?\s*\)".format(e_str)
    res_get_string = r"getString\(\s*'{}'(?:,\s*(?:[^\)]+?))?\s*\)".format(e_str)

    return re.compile(
        f"{rex_b}|{rex_l}|{res_8n}|{res_comp}|{res_token}|{res_get_string}|{res_8n_stripped}",
        re.DOTALL,
    )
