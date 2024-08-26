import { useMemo } from 'react';
import styled from 'styled-components';
import { findAndFormatContact } from '../../../../models/message';
import { PubKey } from '../../../../session/types/PubKey';

import { I18n } from '../../../basic/I18n';

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

const generateContactsString = (
  senders: Array<string>
): { contacts: Array<string>; numberOfReactors: number; hasMe: boolean } => {
  const contacts: Array<string> = [];
  let hasMe = false;
  let numberOfReactors = 0;
  senders.forEach(sender => {
    // TODO truncate with ellipsis if too long?
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

const getI18nComponent = (
  isYou: boolean,
  contacts: Array<string>,
  numberOfReactors: number,
  emoji: string
) => {
  const name = contacts[0];
  const other_name = contacts[1];

  switch (numberOfReactors) {
    case 1:
      return isYou ? (
        <I18n token="emojiReactsHoverYouDesktop" endTagProps={{ emoji }} />
      ) : (
        <I18n token="emojiReactsHoverNameDesktop" args={{ name }} endTagProps={{ emoji }} />
      );
    case 2:
      return isYou ? (
        <I18n token="emojiReactsHoverYouNameDesktop" args={{ name }} endTagProps={{ emoji }} />
      ) : (
        <I18n
          token="emojiReactsHoverTwoNameDesktop"
          args={{ name, other_name }}
          endTagProps={{ emoji }}
        />
      );
    case 3:
      return isYou ? (
        <I18n token="emojiReactsHoverYouNameOneDesktop" args={{ name }} endTagProps={{ emoji }} />
      ) : (
        <I18n
          token="emojiReactsHoverTwoNameOneDesktop"
          args={{ name, other_name }}
          endTagProps={{ emoji }}
        />
      );
    default:
      return isYou ? (
        <I18n
          token="emojiReactsHoverYouNameMultipleDesktop"
          args={{ name, count: numberOfReactors - 2 }}
          endTagProps={{ emoji }}
        />
      ) : (
        <I18n
          token="emojiReactsHoverTwoNameMultipleDesktop"
          args={{ name, other_name, count: numberOfReactors - 2 }}
          endTagProps={{ emoji }}
        />
      );
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
  const { emoji, senders, tooltipPosition = 'center', onClick } = props;

  const { contacts, hasMe, numberOfReactors } = useMemo(
    () => generateContactsString(senders),
    [senders]
  );

  const content = useMemo(
    () => getI18nComponent(hasMe, contacts, numberOfReactors, emoji),
    [hasMe, contacts, numberOfReactors, emoji]
  );

  return (
    <StyledPopupContainer tooltipPosition={tooltipPosition} onClick={onClick}>
      {content}
    </StyledPopupContainer>
  );
};
