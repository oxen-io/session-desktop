import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { PropsForExpirationTimer } from '../../state/ducks/conversations';

import { isLegacyDisappearingModeEnabled } from '../../session/disappearing_messages/legacy';
import { UserUtils } from '../../session/utils';
import {
  useSelectedConversationDisappearingMode,
  useSelectedConversationKey,
  useSelectedExpireTimer,
  useSelectedIsGroupOrCommunity,
  useSelectedIsGroupV2,
  useSelectedIsLegacyGroup,
  useSelectedIsPrivateFriend,
  useSelectedIsPublic,
} from '../../state/selectors/selectedConversation';
import { ReleasedFeatures } from '../../util/releaseFeature';
import { Flex } from '../basic/Flex';
import { SpacerMD, TextWithChildren } from '../basic/Text';
import { ExpirableReadableMessage } from './message/message-item/ExpirableReadableMessage';
// eslint-disable-next-line import/order
import { ConversationInteraction } from '../../interactions';
import { getConversationController } from '../../session/conversations';
import { updateConfirmModal } from '../../state/ducks/modalDialog';
import type { LocalizerComponentProps, LocalizerToken } from '../../types/localizer';
import { Localizer } from '../basic/Localizer';
import { SessionButtonColor } from '../basic/SessionButton';
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

    const i18nMessage: LocalizerComponentProps<LocalizerToken> = props.disabled
      ? {
          token: 'disappearingMessagesFollowSettingOff',
        }
      : {
          token: 'disappearingMessagesFollowSettingOn',
          args: {
            time: props.timespanText,
            disappearing_messages_type: localizedMode,
          },
        };

    const okText = window.i18n('confirm');

    dispatch(
      updateConfirmModal({
        title: window.i18n('disappearingMessagesFollowSetting'),
        i18nMessage,
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

function useTextToRenderI18nProps(
  props: PropsForExpirationTimer
): LocalizerComponentProps<LocalizerToken> {
  const { pubkey: authorPk, profileName, expirationMode, timespanText: time, disabled } = props;

  const isLegacyGroup = useSelectedIsLegacyGroup();

  const authorIsUs = authorPk === UserUtils.getOurPubKeyStrFromCache();

  const name = profileName ?? authorPk;

  // TODO: legacy messages support will be removed in a future release
  if (isLegacyDisappearingModeEnabled(expirationMode)) {
    return {
      token: 'deleteAfterLegacyDisappearingMessagesTheyChangedTimer',
      args: {
        name: authorIsUs ? window.i18n('you') : name,
        time,
      },
    };
  }

  const disappearing_messages_type =
    expirationMode === 'deleteAfterRead'
      ? window.i18n('disappearingMessagesTypeRead')
      : window.i18n('disappearingMessagesTypeSent');

  if (isLegacyGroup) {
    if (disabled) {
      return authorIsUs
        ? {
            token: 'disappearingMessagesTurnedOffYouGroup',
          }
        : {
            token: 'disappearingMessagesTurnedOffGroup',
            args: {
              name,
            },
          };
    }
  }

  if (disabled) {
    return authorIsUs
      ? {
          token: isLegacyGroup
            ? 'disappearingMessagesTurnedOffYouGroup'
            : 'disappearingMessagesTurnedOffYou',
        }
      : {
          token: isLegacyGroup
            ? 'disappearingMessagesTurnedOffGroup'
            : 'disappearingMessagesTurnedOff',
          args: {
            name,
          },
        };
  }

  return authorIsUs
    ? {
        token: 'disappearingMessagesSetYou',
        args: {
          time,
          disappearing_messages_type,
        },
      }
    : {
        token: 'disappearingMessagesSet',
        args: {
          time,
          disappearing_messages_type,
          name,
        },
      };
}

export const TimerNotification = (props: PropsForExpirationTimer) => {
  const { messageId } = props;

  const i18nProps = useTextToRenderI18nProps(props);
  const isGroupOrCommunity = useSelectedIsGroupOrCommunity();
  const isGroupV2 = useSelectedIsGroupV2();
  const isPublic = useSelectedIsPublic();
  // renderOff is true when the update is put to off, or when we have a legacy group control message (as they are not expiring at all)
  const renderOffIcon = props.disabled || (isGroupOrCommunity && isPublic && !isGroupV2);

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
          <Localizer {...i18nProps} />
        </TextWithChildren>
        <FollowSettingsButton {...props} />
      </Flex>
    </ExpirableReadableMessage>
  );
};
