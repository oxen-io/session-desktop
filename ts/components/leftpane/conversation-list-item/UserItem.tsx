import React from 'react';
import { useSelector } from 'react-redux';
import { isEmpty } from 'lodash';
import { useConvoIdFromContext } from '../../../contexts/ConvoIdContext';
import {
  useConversationRealName,
  useConversationUsername,
  useHasNickname,
  useIsMe,
} from '../../../hooks/useParamSelector';
import { PubKey } from '../../../session/types';
import { isSearching } from '../../../state/selectors/search';
import { ContactName } from '../../conversation/ContactName';

export const UserItem = () => {
  const conversationId = useConvoIdFromContext();

  // we want to show the nickname in brackets if a nickname is set for search results
  const isSearchResultsMode = useSelector(isSearching);

  const shortenedPubkey = PubKey.shorten(conversationId);
  const username = useConversationUsername(conversationId);
  const isMe = useIsMe(conversationId);
  const realName = useConversationRealName(conversationId);
  const hasNickname = useHasNickname(conversationId);

  const displayedPubkey = username ? shortenedPubkey : conversationId;
  const displayName = isMe
    ? window.i18n('noteToSelf')
    : isSearchResultsMode && hasNickname && realName
      ? `${realName} (${username})`
      : username;

  let shouldShowPubkey = false;
  if (isEmpty(username) && isEmpty(displayName)) {
    shouldShowPubkey = true;
  }

  return (
    <ContactName
      pubkey={displayedPubkey}
      name={username}
      profileName={displayName}
      module="module-conversation__user"
      boldProfileName={true}
      shouldShowPubkey={shouldShowPubkey}
    />
  );
};
