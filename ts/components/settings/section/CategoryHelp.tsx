import { SessionButtonShape, SessionButtonType } from '../../basic/SessionButton';

import { SessionSettingButtonItem, SessionSettingsTitleWithLink } from '../SessionSettingListItem';
import { saveLogToDesktop } from '../../../util/logging';

export const SettingsCategoryHelp = () => {
  return (
    <>
      <SessionSettingButtonItem
        onClick={() => {
          void saveLogToDesktop();
        }}
        buttonShape={SessionButtonShape.Square}
        buttonType={SessionButtonType.Solid}
        buttonText={window.i18n('helpReportABugExportLogs')}
        title={window.i18n('helpReportABug')}
        description={window.i18n('helpReportABugExportLogsSaveToDesktopDescription')}
      />
      <SessionSettingsTitleWithLink
        title={window.i18n('helpWedLoveYourFeedback')}
        link={'https://getsession.org/survey'}
      />
      <SessionSettingsTitleWithLink
        title={window.i18n('helpHelpUsTranslateSession')}
        link={'https://getsession.org/translate'}
      />
      <SessionSettingsTitleWithLink
        title={window.i18n('helpFAQ')}
        link={'https://getsession.org/faq'}
      />
      <SessionSettingsTitleWithLink
        title={window.i18n('helpSupport')}
        link={'https://sessionapp.zendesk.com/hc/en-us'}
      />
    </>
  );
};
