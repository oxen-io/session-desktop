import { setupI18n } from '../../../../../util/i18n';
import { en } from '../../../../../localization/locales';
import type { LocalizerDictionary } from '../../../../../types/Localizer';

export const testDictionary = {
  greeting: 'Hello, {name}!',
  search: '{found_count} of {count} match',
  noArgs: 'No args',
  args: 'Hello, {name}!',
  tag: 'Hello, {name}! <b>Welcome!</b>',
  argInTag: 'Hello, {name}! <b>Welcome, {arg}!</b>',
} as const;

export function initI18n(dictionary: Record<string, string> = en) {
  return setupI18n({ initialLocale: 'en', initialDictionary: dictionary as LocalizerDictionary });
}
