import { PubkeyType, WithGroupPubkey } from 'libsession_util_nodejs';

type PrArrayMsgIds = Promise<Array<string>>;

export type DataCallArgs<T extends (args: any) => any> = Parameters<T>[0];

export type DeleteAllMessageFromSendersInConversationType = (
  args: WithGroupPubkey & {
    toRemove: Array<PubkeyType>;
    signatureTimestamp: number;
  }
) => PrArrayMsgIds;

export type DeleteAllMessageHashesInConversationType = (
  args: WithGroupPubkey & {
    messageHashes: Array<string>;
    signatureTimestamp: number;
  }
) => PrArrayMsgIds;

export type DeleteAllMessageHashesInConversationMatchingAuthorType = (
  args: WithGroupPubkey & {
    messageHashes: Array<string>;
    author: PubkeyType;
    signatureTimestamp: number;
  }
) => Promise<{ msgIdsDeleted: Array<string>; msgHashesDeleted: Array<string> }>;
