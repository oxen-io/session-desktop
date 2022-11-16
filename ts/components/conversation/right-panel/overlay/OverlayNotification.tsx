import React from 'react';
import {
  useIsKickedFromGroup,
  useIsLeft,
  useIsBlocked,
  useIsPrivate,
  useIsRequest,
} from '../../../../hooks/useParamSelector';
import { setNotificationForConvoId } from '../../../../interactions/conversationInteractions';
import {
  ConversationNotificationSetting,
  ConversationNotificationSettingType,
} from '../../../../models/conversationAttributes';

import {  useRightOverlayMode } from '../../../../state/selectors/section';
import {
  useSelectedConversationKey,
  useSelectedNotificationSetting,
} from '../../../../state/selectors/selectedConversation';
import { LocalizerKeys } from '../../../../types/LocalizerKeys';
import { Flex } from '../../../basic/Flex';
import { PanelButtonGroup } from '../../../buttons';
import { PanelRadioButton } from '../../../buttons/PanelRadioButton';
import { StyledScrollContainer } from '../RightPanel';
import { RightOverlayHeader } from './RightOverlayHeader';

function showNotificationConvo(
  isKickedFromGroup: boolean,
  left: boolean,
  isBlocked: boolean,
  isRequest: boolean
): boolean {
  return !left && !isKickedFromGroup && !isBlocked && !isRequest;
}

const NotificationOptions = () => {
  const selectedConvoId = useSelectedConversationKey();
  const isKickedFromGroup = useIsKickedFromGroup(selectedConvoId);
  const left = useIsLeft(selectedConvoId);
  const isBlocked = useIsBlocked(selectedConvoId);
  const isPrivate = useIsPrivate(selectedConvoId);
  const isRequest = useIsRequest(selectedConvoId);
  const selectedConvoSetting = useSelectedNotificationSetting();

  if (!selectedConvoId) {
    return null;
  }

  if (
    showNotificationConvo(Boolean(isKickedFromGroup), Boolean(left), Boolean(isBlocked), isRequest)
  ) {
    // exclude mentions_only settings for private chats as this does not make much sense
    const notificationForConvoOptions = ConversationNotificationSetting.filter(n =>
      isPrivate ? n !== 'mentions_only' : true
    ).map((n: ConversationNotificationSettingType) => {
      // do this separately so typescript's compiler likes it
      const keyToUse: LocalizerKeys =
        n === 'all' || !n
          ? 'notificationForConvo_all'
          : n === 'disabled'
          ? 'notificationForConvo_disabled'
          : 'notificationForConvo_mentions_only';
      return { value: n, name: window.i18n(keyToUse) };
    });

    return (
      // Remove the && false to make context menu work with RTL support
      <>
        {(notificationForConvoOptions || []).map(item => {
          return (
            <PanelRadioButton
              key={item.value}
              text={item.name}
              value={item.name}
              isSelected={
                selectedConvoSetting === item.value ||
                (selectedConvoSetting === undefined && item.value === 'all')
              }
              onSelect={async () => {
                await setNotificationForConvoId(selectedConvoId, item.value);
              }}
              disableBg={true}
            ></PanelRadioButton>
          );
        })}
      </>
    );
  }
  return null;
};

export const OverlayNotification = () => {
  const rightOverlay = useRightOverlayMode();

  if (!rightOverlay || rightOverlay.type !== 'notifications') {
    return null;
  }
  return (
    <StyledScrollContainer>
      <Flex container={true} flexDirection={'column'} alignItems={'center'} width="100%">
        <RightOverlayHeader title={window.i18n('notificationForConvo')} hideBackButton={false} />
        <PanelButtonGroup>
          <NotificationOptions />
        </PanelButtonGroup>
      </Flex>
    </StyledScrollContainer>
  );
};
