import { GroupPubkeyType } from 'libsession_util_nodejs';
import { SignalService } from '../../../../protobuf';
import { SnodeNamespaces } from '../../../apis/snode_api/namespaces';
import { PubKey } from '../../../types';
import { StringUtils } from '../../../utils';
import { DataMessage } from '../DataMessage';
import {
  ClosedGroupMessage,
  ClosedGroupMessageParams,
} from '../controlMessage/group/ClosedGroupMessage';
import { VisibleMessage } from './VisibleMessage';

interface ClosedGroupVisibleMessageParams
  extends Omit<
    ClosedGroupMessageParams,
    'expireTimer' | 'expirationType' | 'identifier' | 'createAtNetworkTimestamp'
  > {
  groupId: string;
  chatMessage: VisibleMessage;
}

export class ClosedGroupVisibleMessage extends ClosedGroupMessage {
  private readonly chatMessage: VisibleMessage;

  constructor(params: ClosedGroupVisibleMessageParams) {
    super({
      createAtNetworkTimestamp: params.chatMessage.createAtNetworkTimestamp,
      identifier: params.chatMessage.identifier ?? params.chatMessage.identifier,
      groupId: params.groupId,
      expirationType: params.chatMessage.expirationType,
      expireTimer: params.chatMessage.expireTimer,
    });

    this.chatMessage = params.chatMessage;
    if (
      this.chatMessage.expirationType !== 'deleteAfterSend' &&
      this.chatMessage.expirationType !== 'unknown' &&
      this.chatMessage.expirationType !== null
    ) {
      throw new Error('group visible msg only support DaS and off Disappearing options');
    }

    if (!params.groupId) {
      throw new Error('ClosedGroupVisibleMessage: groupId must be set');
    }

    if (PubKey.is03Pubkey(PubKey.cast(params.groupId).key)) {
      throw new Error('GroupContext should not be used anymore with closed group v3');
    }
  }

  public dataProto(): SignalService.DataMessage {
    // expireTimer is set in the dataProto in this call directly
    const dataProto = this.chatMessage.dataProto();

    const groupMessage = new SignalService.GroupContext();

    const groupIdWithPrefix = PubKey.addTextSecurePrefixIfNeeded(this.groupId.key);
    const encoded = StringUtils.encode(groupIdWithPrefix, 'utf8');
    const id = new Uint8Array(encoded);
    groupMessage.id = id;
    groupMessage.type = SignalService.GroupContext.Type.DELIVER;

    dataProto.group = groupMessage;

    return dataProto;
  }
}

type WithDestinationGroupPk = { destination: GroupPubkeyType };

export class ClosedGroupV2VisibleMessage extends DataMessage {
  private readonly chatMessage: VisibleMessage;
  public readonly destination: GroupPubkeyType;
  public readonly namespace = SnodeNamespaces.ClosedGroupMessages;

  constructor(
    params: Pick<ClosedGroupVisibleMessageParams, 'chatMessage'> & WithDestinationGroupPk
  ) {
    super(params.chatMessage);
    this.chatMessage = params.chatMessage;
    if (
      this.chatMessage.expirationType !== 'deleteAfterSend' &&
      this.chatMessage.expirationType !== 'unknown'
    ) {
      throw new Error('groupv2 message only support DaS and off Disappearing options');
    }

    if (!PubKey.is03Pubkey(params.destination)) {
      throw new Error('ClosedGroupV2VisibleMessage only work with 03-groups destination');
    }
    this.destination = params.destination;
  }

  public dataProto(): SignalService.DataMessage {
    // expireTimer is set in the dataProto in this call directly
    const dataProto = this.chatMessage.dataProto();
    return dataProto;
  }
}
