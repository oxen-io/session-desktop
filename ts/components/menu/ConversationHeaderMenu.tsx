import React from 'react';
import { animation, Menu } from 'react-contexify';
import {
  BanMenuItem,
  BlockMenuItem,
  ChangeNicknameMenuItem,
  ClearNicknameMenuItem,
  CopyMenuItem,
  DeleteContactMenuItem,
  DeleteMessagesMenuItem,
  LeaveGroupMenuItem,
  MarkAllReadMenuItem,
  UnbanMenuItem,
} from './Menu';
import { ContextConversationId } from '../leftpane/conversation-list-item/ConversationListItem';
import { getSelectedConversationKey } from '../../state/selectors/conversations';
import { useSelector } from 'react-redux';
import { SessionContextMenuContainer } from '../SessionContextMenuContainer';

export type PropsConversationHeaderMenu = {
  triggerId: string;
};

export const ConversationHeaderMenu = (props: PropsConversationHeaderMenu) => {
  const { triggerId } = props;

  const selectedConversation = useSelector(getSelectedConversationKey);

  if (!selectedConversation) {
    throw new Error('selectedConversation must be set for a header to be visible!');
  }

  return (
    <ContextConversationId.Provider value={selectedConversation}>
      <SessionContextMenuContainer>
        <Menu id={triggerId} animation={animation.fade}>
          <BlockMenuItem />
          <CopyMenuItem />
          <MarkAllReadMenuItem />
          <ChangeNicknameMenuItem />
          <ClearNicknameMenuItem />
          <DeleteMessagesMenuItem />
          <BanMenuItem />
          <UnbanMenuItem />
          <LeaveGroupMenuItem />
          <DeleteContactMenuItem />
        </Menu>
      </SessionContextMenuContainer>
    </ContextConversationId.Provider>
  );
};
