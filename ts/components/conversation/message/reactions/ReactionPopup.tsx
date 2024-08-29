import { useMemo } from 'react';
import styled from 'styled-components';
import { findAndFormatContact } from '../../../../models/message';
import { PubKey } from '../../../../session/types/PubKey';

import { I18n } from '../../../basic/I18n';
import { nativeEmojiData } from '../../../../util/emoji';
import { I18nProps, LocalizerToken } from '../../../../types/Localizer';

export type TipPosition = 'center' | 'left' | 'right';

// TODO: Look into adjusting the width to match the new strings better
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
  margin-block-start: 8px;
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

const getI18nComponentProps = (
  isYou: boolean,
  contacts: Array<string>,
  numberOfReactors: number,
  emoji: string,
  emojiName?: string
): I18nProps<LocalizerToken> => {
  const name = contacts[0];
  const other_name = contacts[1];
  const emoji_name = emojiName ? `:${emojiName}:` : emoji;
  const count = numberOfReactors - 1;

  switch (numberOfReactors) {
    case 1:
      return isYou
        ? { token: 'emojiReactsHoverYouNameDesktop', args: { emoji_name } }
        : { token: 'emojiReactsHoverNameDesktop', args: { name, emoji_name } };
    case 2:
      return isYou
        ? { token: 'emojiReactsHoverYouNameTwoDesktop', args: { name, emoji_name } }
        : { token: 'emojiReactsHoverNameTwoDesktop', args: { name, other_name, emoji_name } };
    default:
      return isYou
        ? { token: 'emojiReactsHoverYouNameMultipleDesktop', args: { count, emoji_name } }
        : { token: 'emojiReactsHoverTwoNameMultipleDesktop', args: { name, count, emoji_name } };
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

  const { emojiName, emojiAriaLabel } = useMemo(
    () => ({
      emojiName: nativeEmojiData?.ids?.[emoji],
      emojiAriaLabel: nativeEmojiData?.ariaLabels?.[emoji],
    }),
    [emoji]
  );

  const { contacts, hasMe, numberOfReactors } = useMemo(
    () => generateContactsString(senders),
    [senders]
  );

  const i18nProps = useMemo(
    () => getI18nComponentProps(hasMe, contacts, numberOfReactors, emoji, emojiName),
    [hasMe, contacts, numberOfReactors, emoji, emojiName]
  );

  return (
    <StyledPopupContainer tooltipPosition={tooltipPosition} onClick={onClick}>
      <I18n {...i18nProps} />
      <StyledEmoji role={'img'} aria-label={emojiAriaLabel}>
        {emoji}
      </StyledEmoji>
    </StyledPopupContainer>
  );
};
