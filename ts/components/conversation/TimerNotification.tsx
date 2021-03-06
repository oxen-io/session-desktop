import React from 'react';

import { Intl } from '../Intl';

import { missingCaseError } from '../../util/missingCaseError';
import { SessionIcon, SessionIconSize, SessionIconType } from '../session/icon';
import { PropsForExpirationTimer } from '../../state/ducks/conversations';

const TimerNotificationContent = (props: PropsForExpirationTimer) => {
  const { phoneNumber, profileName, timespan, type, disabled } = props;
  const changeKey = disabled ? 'disabledDisappearingMessages' : 'theyChangedTheTimer';

  const contact = (
    <span key={`external-${phoneNumber}`} className="module-timer-notification__contact">
      {profileName || phoneNumber}
    </span>
  );

  switch (type) {
    case 'fromOther':
      return <Intl id={changeKey} components={[contact, timespan]} />;
    case 'fromMe':
      return disabled
        ? window.i18n('youDisabledDisappearingMessages')
        : window.i18n('youChangedTheTimer', [timespan]);
    case 'fromSync':
      return disabled
        ? window.i18n('disappearingMessagesDisabled')
        : window.i18n('timerSetOnSync', [timespan]);
    default:
      throw missingCaseError(type);
  }
};

export const TimerNotification = (props: PropsForExpirationTimer) => {
  return (
    <div className="module-timer-notification" id={props.messageId}>
      <div className="module-timer-notification__message">
        <div>
          <SessionIcon
            iconType={SessionIconType.Stopwatch}
            iconSize={SessionIconSize.Small}
            iconColor={'#ABABAB'}
          />
        </div>

        <div>
          <TimerNotificationContent {...props} />
        </div>
      </div>
    </div>
  );
};
