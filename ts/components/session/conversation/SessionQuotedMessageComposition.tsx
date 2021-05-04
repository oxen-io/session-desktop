import React, { useContext } from 'react';
import { Flex } from '../Flex';
import { SessionIconButton, SessionIconSize, SessionIconType } from '../icon';
import { ReplyingToMessageProps } from './SessionCompositionBox';
import styled, { DefaultTheme, ThemeContext } from 'styled-components';
import { getAlt, isImageAttachment, isVideoAttachment } from '../../../types/Attachment';
import { Image } from '../../conversation/Image';

// tslint:disable: react-unused-props-and-state
interface Props {
  quotedMessageProps: ReplyingToMessageProps;
  removeQuotedMessage: any;
}

const QuotedMessageComposition = styled.div`
  width: 100%;
  padding-inline-end: ${props => props.theme.common.margins.md};
  padding-inline-start: ${props => props.theme.common.margins.md};
`;

const QuotedMessageCompositionReply = styled.div`
  background: ${props => props.theme.colors.quoteBottomBarBackground};
  border-radius: ${props => props.theme.common.margins.sm};
  padding: ${props => props.theme.common.margins.xs};
  box-shadow: ${props => props.theme.colors.sessionShadow};
  margin: ${props => props.theme.common.margins.xs};
  display: flex;
  flex-direction: row;
  justify-content: space-between;
`;

const Subtle = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  display: -webkit-box;
  color: ${props => props.theme.colors.textColor};
`;

const ReplyingTo = styled.div`
  color: ${props => props.theme.colors.textColor};
`;

export const SessionQuotedMessageComposition = (props: Props) => {
  const { quotedMessageProps, removeQuotedMessage } = props;
  const theme = useContext(ThemeContext);

  const { text: body, attachments } = quotedMessageProps;
  const hasAttachments = attachments && attachments.length > 0;
  return (
    <QuotedMessageComposition theme={theme}>
      <Flex
        container={true}
        justifyContent="space-between"
        flexGrow={1}
        margin={theme.common.margins.xs}
      >
        <ReplyingTo>{window.i18n('replyingToMessage')}</ReplyingTo>
        <SessionIconButton
          iconType={SessionIconType.Exit}
          iconSize={SessionIconSize.Small}
          onClick={removeQuotedMessage}
          theme={theme}
        />
      </Flex>
      <QuotedMessageCompositionReply>
        <Subtle>
          {(hasAttachments && window.i18n('mediaMessage')) || body}
        </Subtle>

        {(hasAttachments && attachments && attachments.length > 0 && isImageAttachment(attachments[0])) && (
          <Image
            alt={getAlt(attachments[0], window.i18n)}
            i18n={window.i18n}
            attachment={attachments[0]}
            height={100}
            width={100}
            curveTopLeft={true}
            curveTopRight={true}
            curveBottomLeft={true}
            curveBottomRight={true}
            url={attachments[0].thumbnail.objectUrl}
          />
        )}
      </QuotedMessageCompositionReply>
    </QuotedMessageComposition>
  );
};
