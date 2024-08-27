import { type BrowserWindow, Menu } from 'electron';
import { sync as osLocaleSync } from 'os-locale';
import type { SetupI18nReturnType } from '../types/Localizer';

export const setup = (browserWindow: BrowserWindow, i18n: SetupI18nReturnType) => {
  const { session } = browserWindow.webContents;
  const userLocale = process.env.LANGUAGE
    ? process.env.LANGUAGE
    : osLocaleSync().replace(/_/g, '-');
  const userLocales = [userLocale, userLocale.split('-')[0]];

  const available = session.availableSpellCheckerLanguages;
  const languages = userLocales.filter(l => available.includes(l));
  console.log(`spellcheck: user locale: ${userLocale}`);
  console.log('spellcheck: available spellchecker languages: ', available);
  console.log('spellcheck: setting languages to: ', languages);
  session.setSpellCheckerLanguages(languages);

  browserWindow.webContents.on('context-menu', (_event: any, params: any) => {
    const { editFlags } = params;
    const isMisspelled = Boolean(params.misspelledWord);
    const showMenu = params.isEditable || editFlags.canCopy;

    // Popup editor menu
    if (showMenu) {
      const template = [];

      if (isMisspelled) {
        if (params.dictionarySuggestions.length > 0) {
          template.push(
            ...params.dictionarySuggestions.map((label: any) => ({
              label,
              click: () => {
                browserWindow.webContents.replaceMisspelling(label);
              },
            }))
          );
        } else {
          template.push({
            label: i18n('noSuggestions'),
            enabled: false,
          });
        }
        template.push({ type: 'separator' });
      }

      if (params.isEditable) {
        if (editFlags.canUndo) {
          template.push({ label: i18n('undo'), role: 'undo' });
        }
        // This is only ever `true` if undo was triggered via the context menu
        // (not ctrl/cmd+z)
        if (editFlags.canRedo) {
          template.push({ label: i18n('redo'), role: 'redo' });
        }
        if (editFlags.canUndo || editFlags.canRedo) {
          template.push({ type: 'separator' });
        }
        if (editFlags.canCut) {
          template.push({ label: i18n('cut'), role: 'cut' });
        }
      }

      if (editFlags.canPaste) {
        template.push({ label: i18n('paste'), role: 'paste' });
      }

      // Only enable select all in editors because select all in non-editors
      // results in all the UI being selected
      if (editFlags.canSelectAll && params.isEditable) {
        template.push({
          label: i18n('selectAll'),
          role: 'selectall',
        });
      }

      const menu = Menu.buildFromTemplate(template);
      menu.popup({ window: browserWindow });
    }
  });
};
