import { ipcRenderer, shell } from 'electron';
import React from 'react';
import { SessionButtonShape, SessionButtonType } from '../../basic/SessionButton';

import { SessionSettingButtonItem, SessionSettingsTitleWithLink } from '../SessionSettingListItem';

export const SettingsCategoryHelp = (props: { hasPassword: boolean | null }) => {
  if (props.hasPassword !== null) {
    return (
      <>
        <SessionSettingButtonItem
          onClick={() => {
            ipcRenderer.send('show-debug-log');
          }}
          buttonShape={SessionButtonShape.Square}
          buttonType={SessionButtonType.Solid}
          buttonText={window.i18n('helpReportABugExportLogs')}
          title={window.i18n('helpReportABug')}
          description={window.i18n('helpReportABugExportLogsSaveToDesktopDescription')}
        />
        <SessionSettingsTitleWithLink
          title={window.i18n('helpWedLoveYourFeedback')}
          onClick={() => void shell.openExternal('https://getsession.org/survey')}
        />
        <SessionSettingsTitleWithLink
          title={window.i18n('helpHelpUsTranslateSession')}
          onClick={() => void shell.openExternal('https://crowdin.com/project/session-desktop/')}
        />
        <SessionSettingsTitleWithLink
          title={window.i18n('helpFAQ')}
          onClick={() => void shell.openExternal('https://getsession.org/faq')}
        />
        <SessionSettingsTitleWithLink
          title={window.i18n('helpSupport')}
          onClick={() => void shell.openExternal('https://sessionapp.zendesk.com/hc/en-us')}
        />
      </>
    );
  }
  return null;
};
