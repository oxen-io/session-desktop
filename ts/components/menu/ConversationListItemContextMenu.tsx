import React from 'react';
import { animation, Menu } from 'react-contexify';
import { isEqual } from 'lodash';

import {
  AcceptMenuItem,
  BlockMenuItem,
  ChangeNicknameMenuItem,
  ClearNicknameMenuItem,
  CopyMenuItem,
  DeclineMenuItem,
  InviteContactMenuItem,
  MarkAllReadMenuItem,
  PinConversationMenuItem,
  ShowUserDetailsMenuItem,
} from './Menu';
import { SessionContextMenuContainer } from '../SessionContextMenuContainer';

export type PropsContextConversationItem = {
  triggerId: string;
};

const ConversationListItemContextMenu = (props: PropsContextConversationItem) => {
  const { triggerId } = props;

  return (
    <SessionContextMenuContainer>
      <Menu id={triggerId} animation={animation.fade}>
        <AcceptMenuItem />
        <DeclineMenuItem />
        <PinConversationMenuItem />
        <BlockMenuItem />
        <CopyMenuItem />
        <MarkAllReadMenuItem />
        <ChangeNicknameMenuItem />
        <ClearNicknameMenuItem />
        <InviteContactMenuItem />
        <ShowUserDetailsMenuItem />
      </Menu>
    </SessionContextMenuContainer>
  );
};

function propsAreEqual(prev: PropsContextConversationItem, next: PropsContextConversationItem) {
  return isEqual(prev, next);
}
export const MemoConversationListItemContextMenu = React.memo(
  ConversationListItemContextMenu,
  propsAreEqual
);
