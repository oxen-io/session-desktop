import { ipcRenderer } from 'electron';
import { isEmpty } from 'lodash';

import styled from 'styled-components';
import { MessageFrom } from '.';
import {
  useMessageDirection,
  useMessageExpirationDurationMs,
  useMessageExpirationTimestamp,
  useMessageExpirationType,
  useMessageHash,
  useMessageReceivedAt,
  useMessageSender,
  useMessageSenderIsAdmin,
  useMessageServerId,
  useMessageServerTimestamp,
  useMessageTimestamp,
} from '../../../../../../state/selectors';

import { isDevProd } from '../../../../../../shared/env_vars';
import { useSelectedConversationKey } from '../../../../../../state/selectors/selectedConversation';
import {
  formatTimeDuration,
  formatTimeDistanceToNow,
  formatWithLocale,
} from '../../../../../../util/i18n';
import { Flex } from '../../../../../basic/Flex';
import { SpacerSM } from '../../../../../basic/Text';
import { CopyToClipboardIcon } from '../../../../../buttons';

export const MessageInfoLabel = styled.label<{ color?: string }>`
  font-size: var(--font-size-lg);
  font-weight: bold;
  ${props => props.color && `color: ${props.color};`}
`;

const MessageInfoData = styled.div<{ color?: string }>`
  font-size: var(--font-size-md);
  user-select: text;
  ${props => props.color && `color: ${props.color};`}
`;

const LabelWithInfoContainer = styled.div`
  margin-bottom: var(--margins-md);
  ${props => props.onClick && 'cursor: pointer;'}
`;

type LabelWithInfoProps = {
  label: string;
  info: string;
  labelColor?: string;
  dataColor?: string;
  title?: string;
  onClick?: () => void;
};

const isDev = isDevProd();

export const LabelWithInfo = (props: LabelWithInfoProps) => {
  return (
    <LabelWithInfoContainer title={props.title || undefined} onClick={props.onClick}>
      <MessageInfoLabel color={props.labelColor}>{props.label}</MessageInfoLabel>
      <Flex container={true} justifyContent="flex-start" alignItems="flex-start">
        <MessageInfoData color={props.dataColor}>{props.info}</MessageInfoData>
        {isDev ? (
          <CopyToClipboardIcon
            iconSize={'medium'}
            copyContent={props.info}
            margin={'0 0 0 var(--margins-xs)'}
          />
        ) : null}
      </Flex>
    </LabelWithInfoContainer>
  );
};

const formatTimestampStr = 'hh:mm d LLL, yyyy' as const;

const showDebugLog = () => {
  ipcRenderer.send('show-debug-log');
};

const DebugMessageInfo = ({ messageId }: { messageId: string }) => {
  const convoId = useSelectedConversationKey();
  const messageHash = useMessageHash(messageId);
  const serverId = useMessageServerId(messageId);
  const expirationType = useMessageExpirationType(messageId);
  const expirationDurationMs = useMessageExpirationDurationMs(messageId);
  const expirationTimestamp = useMessageExpirationTimestamp(messageId);

  if (!isDevProd()) {
    return null;
  }
  // Note: the strings here are hardcoded because we do not share them with other platforms through crowdin
  return (
    <>
      {convoId ? <LabelWithInfo label={`Conversation ID:`} info={convoId} /> : null}
      {messageHash ? <LabelWithInfo label={`Message Hash:`} info={messageHash} /> : null}
      {serverId ? <LabelWithInfo label={`Server ID:`} info={`${serverId}`} /> : null}
      {expirationType ? <LabelWithInfo label={`Expiration Type:`} info={expirationType} /> : null}
      {expirationDurationMs ? (
        <LabelWithInfo
          label={`Expiration Duration:`}
          info={formatTimeDuration(Math.floor(expirationDurationMs))}
        />
      ) : null}
      {expirationTimestamp ? (
        <LabelWithInfo
          label={`Disappears:`}
          info={formatTimeDistanceToNow(expirationTimestamp * 1000)}
        />
      ) : null}
    </>
  );
};

export const MessageInfo = ({ messageId, errors }: { messageId: string; errors: Array<Error> }) => {
  const sender = useMessageSender(messageId);
  const direction = useMessageDirection(messageId);
  const sentAt = useMessageTimestamp(messageId);
  const serverTimestamp = useMessageServerTimestamp(messageId);
  const receivedAt = useMessageReceivedAt(messageId);
  const isSenderAdmin = useMessageSenderIsAdmin(messageId);

  if (!messageId || !sender) {
    return null;
  }

  const sentAtStr = formatWithLocale({
    date: new Date(serverTimestamp || sentAt || 0),
    formatStr: formatTimestampStr,
  });
  const receivedAtStr = formatWithLocale({
    date: new Date(receivedAt || 0),
    formatStr: formatTimestampStr,
  });

  const hasError = !isEmpty(errors);
  const errorString = hasError
    ? errors?.reduce((previous, current, currentIndex) => {
        return `${previous}${current.message}${
          errors.length > 1 && currentIndex < errors.length - 1 ? ', ' : ''
        }`;
      }, '')
    : null;

  return (
    <Flex container={true} flexDirection="column">
      <LabelWithInfo label={`${window.i18n('sent')}:`} info={sentAtStr} />
      <DebugMessageInfo messageId={messageId} />

      {direction === 'incoming' ? (
        <LabelWithInfo label={`${window.i18n('received')}:`} info={receivedAtStr} />
      ) : null}
      <SpacerSM />
      <MessageFrom sender={sender} isSenderAdmin={isSenderAdmin} />
      {hasError && (
        <>
          <SpacerSM />
          <LabelWithInfo
            title={window.i18n('helpReportABugExportLogsSaveToDesktopDescription')}
            label={`${window.i18n('theError')}:`}
            info={errorString || window.i18n('errorUnknown')}
            dataColor={'var(--danger-color)'}
            onClick={showDebugLog}
          />
        </>
      )}
    </Flex>
  );
};
