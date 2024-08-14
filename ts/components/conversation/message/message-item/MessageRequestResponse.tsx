import { useNicknameOrProfileNameOrShortenedPubkey } from '../../../../hooks/useParamSelector';
import { PropsForMessageRequestResponse } from '../../../../models/messageType';
import { UserUtils } from '../../../../session/utils';
import { Flex } from '../../../basic/Flex';
import { I18n } from '../../../basic/I18n';
import { SpacerSM, TextWithChildren } from '../../../basic/Text';
import { ReadableMessage } from './ReadableMessage';

// Note this should not respond to the disappearing message conversation setting so we use the ReadableMessage
export const MessageRequestResponse = (props: PropsForMessageRequestResponse) => {
  const { messageId, isUnread, receivedAt, conversationId } = props;

  const profileName = useNicknameOrProfileNameOrShortenedPubkey(conversationId);
  const isFromSync = props.source === UserUtils.getOurPubKeyStrFromCache();

  return (
    <ReadableMessage
      messageId={messageId}
      receivedAt={receivedAt}
      isUnread={isUnread}
      dataTestId="message-request-response-message"
      key={`readable-message-${messageId}`}
    >
      <Flex
        container={true}
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        margin={'var(--margins-sm)'}
        id={`msg-${messageId}`}
      >
        <SpacerSM />
        <TextWithChildren subtle={true} ellipsisOverflow={false} textAlign="center">
          {isFromSync ? (
            <I18n
              token="messageRequestYouHaveAccepted"
              args={{
                name: profileName || window.i18n('unknown'),
              }}
            />
          ) : (
            <I18n token="messageRequestsAccepted" />
          )}
        </TextWithChildren>
      </Flex>
    </ReadableMessage>
  );
};
