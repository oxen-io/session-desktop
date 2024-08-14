import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { PropsForExpirationTimer } from '../../state/ducks/conversations';
import { assertUnreachable } from '../../types/sqlSharedTypes';

import { isLegacyDisappearingModeEnabled } from '../../session/disappearing_messages/legacy';
import { UserUtils } from '../../session/utils';
import {
  useSelectedConversationDisappearingMode,
  useSelectedConversationKey,
  useSelectedExpireTimer,
  useSelectedIsGroupOrCommunity,
  useSelectedIsGroupV2,
  useSelectedIsNoteToSelf,
  useSelectedIsPrivate,
  useSelectedIsPrivateFriend,
} from '../../state/selectors/selectedConversation';
import { ReleasedFeatures } from '../../util/releaseFeature';
import { Flex } from '../basic/Flex';
import { SpacerMD, TextWithChildren } from '../basic/Text';
import { ExpirableReadableMessage } from './message/message-item/ExpirableReadableMessage';
// eslint-disable-next-line import/order
import { ConversationInteraction } from '../../interactions';
import { getConversationController } from '../../session/conversations';
import { updateConfirmModal } from '../../state/ducks/modalDialog';
import { SessionButtonColor } from '../basic/SessionButton';
import { SessionHtmlRenderer } from '../basic/SessionHTMLRenderer';
import { SessionIcon } from '../icon';

const FollowSettingButton = styled.button`
  color: var(--primary-color);
`;

function useFollowSettingsButtonClick(
  props: Pick<
    PropsForExpirationTimer,
    'disabled' | 'expirationMode' | 'timespanText' | 'timespanSeconds'
  >
) {
  const selectedConvoKey = useSelectedConversationKey();
  const dispatch = useDispatch();
  const onExit = () => dispatch(updateConfirmModal(null));

  const doIt = () => {
    const localizedMode =
      props.expirationMode === 'deleteAfterRead'
        ? window.i18n('disappearingMessagesTypeRead')
        : window.i18n('disappearingMessagesTypeSent');
    const message = props.disabled
      ? window.i18n('disappearingMessagesFollowSettingOff')
      : window.i18n('disappearingMessagesFollowSettingOn', {
          time: props.timespanText,
          disappearing_messages_type: localizedMode,
        });
    const okText = props.disabled ? window.i18n('yes') : window.i18n('set');
    dispatch(
      updateConfirmModal({
        title: window.i18n('disappearingMessagesFollowSetting'),
        message,
        okText,
        okTheme: SessionButtonColor.Danger,
        onClickOk: async () => {
          if (!selectedConvoKey) {
            throw new Error('no selected convokey');
          }
          const convo = getConversationController().get(selectedConvoKey);
          if (!convo) {
            throw new Error('no selected convo');
          }
          if (!convo.isPrivate()) {
            throw new Error('follow settings only work for private chats');
          }
          if (props.expirationMode === 'legacy') {
            throw new Error('follow setting does not apply with legacy');
          }
          if (props.expirationMode !== 'off' && !props.timespanSeconds) {
            throw new Error('non-off mode requires seconds arg to be given');
          }
          await ConversationInteraction.setDisappearingMessagesByConvoId(
            selectedConvoKey,
            props.expirationMode,
            props.timespanSeconds ?? undefined
          );
        },
        showExitIcon: false,
        onClickClose: onExit,
      })
    );
  };
  return { doIt };
}

function useAreSameThanOurSide(
  props: Pick<PropsForExpirationTimer, 'disabled' | 'expirationMode' | 'timespanSeconds'>
) {
  const selectedMode = useSelectedConversationDisappearingMode();
  const selectedTimestan = useSelectedExpireTimer();
  if (props.disabled && (selectedMode === 'off' || selectedMode === undefined)) {
    return true;
  }

  if (props.expirationMode === selectedMode && props.timespanSeconds === selectedTimestan) {
    return true;
  }
  return false;
}

const FollowSettingsButton = (props: PropsForExpirationTimer) => {
  const v2Released = ReleasedFeatures.isUserConfigFeatureReleasedCached();
  const isPrivateAndFriend = useSelectedIsPrivateFriend();
  const click = useFollowSettingsButtonClick(props);
  const areSameThanOurs = useAreSameThanOurSide(props);

  if (!v2Released || !isPrivateAndFriend) {
    return null;
  }
  if (
    props.type === 'fromMe' ||
    props.type === 'fromSync' ||
    props.pubkey === UserUtils.getOurPubKeyStrFromCache() ||
    areSameThanOurs ||
    props.expirationMode === 'legacy' // we cannot follow settings with legacy mode
  ) {
    return null;
  }

  return (
    <FollowSettingButton
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      onClick={() => click.doIt()}
    >
      {window.i18n('disappearingMessagesFollowSetting')}
    </FollowSettingButton>
  );
};

function useTextToRender(props: PropsForExpirationTimer) {
  const { pubkey, profileName, expirationMode, timespanText, type, disabled } = props;

  const isPrivate = useSelectedIsPrivate();
  const isMe = useSelectedIsNoteToSelf();
  // when in a 1o1 not NTS, we have a setting per side of the conversation
  const ownSideOnly = isPrivate && !isMe;

  const contact = profileName || pubkey;
  // TODO legacy messages support will be removed in a future release
  const mode = isLegacyDisappearingModeEnabled(expirationMode)
    ? null
    : expirationMode === 'deleteAfterRead'
      ? window.i18n('disappearingMessagesTypeRead')
      : window.i18n('disappearingMessagesTypeSent');
  switch (type) {
    case 'fromOther':
      if (disabled) {
        return window.i18n('disappearingMessagesTurnedOff', { name: contact });
      }

      if (mode) {
        const localizedMode =
          props.expirationMode === 'deleteAfterRead'
            ? window.i18n('disappearingMessagesTypeRead')
            : window.i18n('disappearingMessagesTypeSent');
        return window.i18n('disappearingMessagesSet', {
          name: contact,
          time: timespanText,
          disappearing_messages_type: localizedMode,
        });
      }

      return window.i18n('deleteAfterLegacyDisappearingMessagesTheyChangedTimer', {
        name: contact,
        time: timespanText,
      });
    case 'fromMe':
    case 'fromSync':
      if (disabled) {
        return ownSideOnly
          ? window.i18n('disappearingMessagesTurnedOffYou')
          : window.i18n('disappearingMessagesTurnedOff', { name: contact });
      }
      if (mode) {
        const localizedMode =
          props.expirationMode === 'deleteAfterRead'
            ? window.i18n('disappearingMessagesTypeRead')
            : window.i18n('disappearingMessagesTypeSent');
        return window.i18n('disappearingMessagesSetYou', {
          time: timespanText,
          disappearing_messages_type: localizedMode,
        });
      }
      return window.i18n('deleteAfterLegacyDisappearingMessagesTheyChangedTimer', {
        name: window.i18n('you'),
        time: timespanText,
      });
    default:
      assertUnreachable(type, `TimerNotification: Missing case error "${type}"`);
  }
  throw new Error('unhandled case');
}

export const TimerNotification = (props: PropsForExpirationTimer) => {
  const { messageId } = props;

  const textToRender = useTextToRender(props);
  const isGroupOrCommunity = useSelectedIsGroupOrCommunity();
  const isGroupV2 = useSelectedIsGroupV2();
  // renderOff is true when the update is put to off, or when we have a legacy group control message (as they are not expiring at all)
  const renderOffIcon = props.disabled || (isGroupOrCommunity && !isGroupV2);

  if (!textToRender || textToRender.length === 0) {
    throw new Error('textToRender invalid key used TimerNotification');
  }

  return (
    <ExpirableReadableMessage
      messageId={messageId}
      isControlMessage={true}
      key={`readable-message-${messageId}`}
      dataTestId={'disappear-control-message'}
    >
      <Flex
        container={true}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        width="90%"
        maxWidth="700px"
        margin="5px auto 10px auto" // top margin is smaller that bottom one to make the stopwatch icon of expirable message closer to its content
        padding="5px 10px"
        style={{ textAlign: 'center' }}
      >
        {renderOffIcon && (
          <>
            <SessionIcon
              iconType="timerFixed"
              iconSize={'tiny'}
              iconColor="var(--text-secondary-color)"
            />
            <SpacerMD />
          </>
        )}
        <TextWithChildren subtle={true}>
          <SessionHtmlRenderer html={textToRender} />
        </TextWithChildren>
        <FollowSettingsButton {...props} />
      </Flex>
    </ExpirableReadableMessage>
  );
};
