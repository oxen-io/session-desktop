import { useMemo } from 'react';
import styled from 'styled-components';
import { findAndFormatContact } from '../../../../models/message';
import { PubKey } from '../../../../session/types/PubKey';
import { nativeEmojiData } from '../../../../util/emoji';

export type TipPosition = 'center' | 'left' | 'right';

export const POPUP_WIDTH = 216; // px

export const StyledPopupContainer = styled.div<{ tooltipPosition: TipPosition }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: ${POPUP_WIDTH}px;
  height: 72px;
  z-index: 5;

  background-color: var(--message-bubbles-received-background-color);
  color: var(--message-bubbles-received-text-color);
  box-shadow: 0px 0px 13px rgba(0, 0, 0, 0.51);
  font-size: 12px;
  font-weight: 600;
  overflow-wrap: break-word;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;

  &:after {
    content: '';
    position: absolute;
    top: calc(100% - 19px);
    left: ${props => {
      switch (props.tooltipPosition) {
        case 'left':
          return '24px';
        case 'right':
          return 'calc(100% - 78px)';
        case 'center':
        default:
          return 'calc(100% - 118px)';
      }
    }};
    width: 22px;
    height: 22px;
    background-color: var(--message-bubbles-received-background-color);
    transform: rotate(45deg);
    border-radius: 3px;
    transform: scaleY(1.4) rotate(45deg);
    clip-path: polygon(100% 100%, 7.2px 100%, 100% 7.2px);
  }
`;

const StyledEmoji = styled.span`
  font-size: 36px;
  margin-left: 8px;
`;

const StyledContacts = styled.span`
  word-break: break-all;
  span {
    word-break: keep-all;
  }
`;

const generateContactsString = (
  senders: Array<string>
): { contacts: Array<string>; numberOfReactors: number; hasMe: boolean } => {
  const contacts: Array<string> = [];
  let hasMe = false;
  let numberOfReactors = 0;
  senders.forEach(sender => {
    // TODO - make sure to truncate with ellipsis if too long @will
    const contact = findAndFormatContact(sender);
    if (contact.isMe) {
      hasMe = true;
      numberOfReactors++;
    } else {
      contacts.push(contact?.profileName ?? contact?.name ?? PubKey.shorten(sender));
      numberOfReactors++;
    }
  });
  return { contacts, hasMe, numberOfReactors };
};

const generateReactionString = (
  isYou: boolean,
  contacts: Array<string>,
  numberOfReactors: number
) => {
  const name = contacts[0];
  const other_name = contacts[1];

  switch (numberOfReactors) {
    case 1:
      return isYou
        ? window.i18n('emojiReactsHoverYouDesktop')
        : window.i18n('emojiReactsHoverNameDesktop', { name });
    case 2:
      return isYou
        ? window.i18n('emojiReactsHoverYouNameDesktop', { name })
        : window.i18n('emojiReactsHoverTwoNameDesktop', { name, other_name });
    case 3:
      return isYou
        ? window.i18n('emojiReactsHoverYouNameOneDesktop', { name })
        : window.i18n('emojiReactsHoverTwoNameDesktop', { name, other_name });
    default:
      return isYou
        ? window.i18n('emojiReactsHoverYouNameMultipleDesktop', {
            name,
            count: numberOfReactors - 2,
          })
        : window.i18n('emojiReactsHoverTwoNameMultipleDesktop', {
            name,
            other_name,
            count: numberOfReactors - 2,
          });
  }
};

type Props = {
  messageId: string;
  emoji: string;
  count: number;
  senders: Array<string>;
  tooltipPosition?: TipPosition;
  onClick: (...args: Array<any>) => void;
};

export const ReactionPopup = (props: Props) => {
  const { emoji, count, senders, tooltipPosition = 'center', onClick } = props;

  const { contacts, hasMe, numberOfReactors } = useMemo(
    () => generateContactsString(senders),
    [senders]
  );

  const reactionString = useMemo(
    () => generateReactionString(hasMe, contacts, numberOfReactors),
    [hasMe, contacts, numberOfReactors]
  );

  return (
    <StyledPopupContainer tooltipPosition={tooltipPosition} onClick={onClick}>
      {contacts.length ? <StyledContacts>{Contacts(contacts, count)}</StyledContacts> : null}
      <StyledEmoji role={'img'} aria-label={nativeEmojiData?.ariaLabels?.[emoji]}>
        {emoji}
      </StyledEmoji>
    </StyledPopupContainer>
  );
};
