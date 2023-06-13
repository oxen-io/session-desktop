import AbortController from 'abort-controller';
import { PubKey } from '../../../types';
import { OpenGroupRequestCommonType } from '../opengroupV2/ApiUtil';
import { batchFirstSubIsSuccess, OpenGroupBatchRow, sogsBatchSend } from './sogsV3BatchPoll';

export const sogsV3BanUser = async (
  userToBan: PubKey,
  roomInfos: OpenGroupRequestCommonType,
  deleteAllMessages: boolean
): Promise<boolean> => {
  const sequence: Array<OpenGroupBatchRow> = [
    {
      type: 'banUnbanUser',
      banUnbanUser: {
        sessionId: userToBan.key,
        roomId: roomInfos.roomId,
        type: 'ban',
	isGlobal: false
      },
    },
  ];

  if (deleteAllMessages) {
    sequence.push({
      type: 'deleteAllPosts',
      deleteAllPosts: { sessionId: userToBan.key, roomId: roomInfos.roomId },
    });
    sequence.push({
      type: 'deleteAllReactions',
      deleteAllReactions: { sessionId: userToBan.key, roomId: roomInfos.roomId },
    });
  }

  const batchSendResponse = await sogsBatchSend(
    roomInfos.serverUrl,
    new Set([roomInfos.roomId]),
    new AbortController().signal,
    sequence,
    'sequence'
  );
  return batchFirstSubIsSuccess(batchSendResponse);
};

export const sogsV3UnbanUser = async (
  userToBan: PubKey,
  roomInfos: OpenGroupRequestCommonType
): Promise<boolean> => {
  const batchSendResponse = await sogsBatchSend(
    roomInfos.serverUrl,
    new Set([roomInfos.roomId]),
    new AbortController().signal,
    [
      {
        type: 'banUnbanUser',
        banUnbanUser: {
          sessionId: userToBan.key,
          roomId: roomInfos.roomId,
          type: 'unban',
          isGlobal: false
        },
      },
    ],
    'batch'
  );
  return batchFirstSubIsSuccess(batchSendResponse);
}

export const sogsV3ServerBanUser = async (
  userToBan: PubKey,
  roomInfos: OpenGroupRequestCommonType,
  deleteAllMessages: boolean,
): Promise<boolean> => {
  const sequence: Array<OpenGroupBatchRow> = [
    {
      type: 'banUnbanUser',
      banUnbanUser: {
        sessionId: userToBan.key,
        roomId: roomInfos.roomId,
        type: 'ban',
        isGlobal: true
      },
    },
  ];

  if (deleteAllMessages) {
    sequence.push({
      type: 'deleteAllUserPosts',
      deleteAllUserPosts: { sessionId: userToBan.key },
    });
    sequence.push({
      type: 'deleteAllUserReactions',
      deleteAllUserReactions: { sessionId: userToBan.key },
    });
  }

  const batchSendResponse = await sogsBatchSend(
    roomInfos.serverUrl,
    new Set([roomInfos.roomId]),
    new AbortController().signal,
    sequence,
    'sequence'
  );
  return batchFirstSubIsSuccess(batchSendResponse);
};

export const sogsV3ServerUnbanUser = async (
  userToBan: PubKey,
  roomInfos: OpenGroupRequestCommonType
): Promise<boolean> => {
  const batchSendResponse = await sogsBatchSend(
    roomInfos.serverUrl,
    new Set([roomInfos.roomId]),
    new AbortController().signal,
    [
      {
        type: 'banUnbanUser',
        banUnbanUser: {
          sessionId: userToBan.key,
          roomId: roomInfos.roomId,
          type: 'unban',
          isGlobal: true
        },
      },
    ],
    'batch'
  );
  return batchFirstSubIsSuccess(batchSendResponse);
}
