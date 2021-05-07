import { EnvelopePlus } from '../../../receiver/types';
import { SessionProtos } from '../../../protobuf';

import uuid from 'uuid';
import { fromHexToArray } from '../../../session/utils/String';

export function generateEnvelopePlusClosedGroup(groupId: string, sender: string): EnvelopePlus {
  const envelope: EnvelopePlus = {
    senderIdentity: sender,
    receivedAt: Date.now(),
    timestamp: Date.now() - 2000,
    id: uuid(),
    type: SessionProtos.Envelope.Type.CLOSED_GROUP_MESSAGE,
    source: groupId,
    content: new Uint8Array(),
    toJSON: () => ['fake'],
  };

  return envelope;
}

export function generateEnvelopePlus(sender: string): EnvelopePlus {
  const envelope: EnvelopePlus = {
    receivedAt: Date.now(),
    timestamp: Date.now() - 2000,
    id: uuid(),
    type: SessionProtos.Envelope.Type.SESSION_MESSAGE,
    source: sender,
    senderIdentity: sender,
    content: new Uint8Array(),
    toJSON: () => ['fake'],
  };

  return envelope;
}

export function generateGroupUpdateNameChange(
  groupId: string
): SessionProtos.DataMessage.ClosedGroupControlMessage {
  const update: SessionProtos.DataMessage.ClosedGroupControlMessage = {
    type: SessionProtos.DataMessage.ClosedGroupControlMessage.Type.NAME_CHANGE,
    toJSON: () => ['fake'],
    publicKey: fromHexToArray(groupId),
    name: 'fakeNewName',
    members: [],
    admins: [],
    wrappers: [],
  };

  return update;
}
