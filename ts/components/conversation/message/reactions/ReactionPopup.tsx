import { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { Data } from '../../../../data/data';
import { findAndFormatContact } from '../../../../models/message';
import { PubKey } from '../../../../session/types/PubKey';
import { useIsDarkTheme } from '../../../../state/selectors/theme';
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

const StyledOthers = styled.span<{ isDarkTheme: boolean }>`
  color: ${props => (props.isDarkTheme ? 'var(--primary-color)' : 'var(--text-primary-color)')};
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
        ? window.i18n('emojiReactsHoverYou')
        : window.i18n('emojiReactsHoverName', { name });
    case 2:
      return isYou
        ? window.i18n('emojiReactsHoverYouName', { name })
        : window.i18n('emojiReactsHoverTwoName', { name, other_name });
    case 3:
      return isYou
        ? window.i18n('emojiReactsHoverYouNameOne', { name })
        : window.i18n('emojiReactsHoverTwoNameOne', { name, other_name });
    default:
      return isYou
        ? window.i18n('emojiReactsHoverYouNameMultiple', {
            name,
            count: numberOfReactors - 2,
          })
        : window.i18n('emojiReactsHoverTwoNameMultiple', {
            name,
            other_name,
            count: numberOfReactors - 2,
          });
  }
};

const Contacts = (contacts: Array<string>, count: number) => {
  const isDarkTheme = useIsDarkTheme();

  const isYou = contacts[0] === window.i18n('you');
  const reactionPopupKey = useMemo(
    () => reactionKey(isYou, contacts.length),
    [isYou, contacts.length]
  );

  return (
    <StyledContacts>
      {window.i18n(reactionPopupKey, {
        name: contacts[0],
        other_name: contacts[1],
        count: contacts.length,
        emoji: '',
      })}{' '}
      {contacts.length > 3 ? (
        <StyledOthers darkMode={darkMode}>
          {window.i18n(contacts.length === 4 ? 'otherSingular' : 'otherPlural', {
            number: `${count - 3}`,
          })}
        </StyledOthers>
      ) : null}
      <span>{window.i18n('reactionPopup')}</span>
    </StyledContacts>
  );
};

type Props = {
  messageId: string;
  emoji: string;
  count: number;
  senders: Array<string>;
  tooltipPosition?: TipPosition;
  onClick: (...args: Array<any>) => void;
};

export const ReactionPopup = (props: Props): ReactElement => {
  const { emoji, count, senders, tooltipPosition = 'center', onClick } = props;
  const darkMode = useSelector(isDarkTheme);

  const { contacts, hasMe, numberOfReactors } = useMemo(
    () => generateContactsString(senders),
    [senders]
  );

  const reactionString = useMemo(
    () => generateReactionString(hasMe, contacts, numberOfReactors),
    [hasMe, contacts.length, numberOfReactors]
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
