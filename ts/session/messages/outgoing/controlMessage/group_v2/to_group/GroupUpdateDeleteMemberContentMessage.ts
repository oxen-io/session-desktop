import { PubkeyType } from 'libsession_util_nodejs';
import _, { isEmpty } from 'lodash';
import { SignalService } from '../../../../../../protobuf';
import { SnodeNamespaces } from '../../../../../apis/snode_api/namespaces';
import { stringToUint8Array } from '../../../../../utils/String';
import { Preconditions } from '../../../preconditions';
import {
  AdminSigDetails,
  GroupUpdateMessage,
  GroupUpdateMessageParams,
} from '../GroupUpdateMessage';

// Note: `Partial<AdminSigDetails>` because that message can also be sent as a non-admin and we always give sodium but not always the secretKey
type Params = GroupUpdateMessageParams &
  Partial<Omit<AdminSigDetails, 'sodium'>> &
  Omit<AdminSigDetails, 'secretKey'> & {
    memberSessionIds: Array<PubkeyType>;
    messageHashes: Array<string>;
  };

/**
 * GroupUpdateDeleteMemberContentMessage is sent as a message to group's swarm.
 */
export class GroupUpdateDeleteMemberContentMessage extends GroupUpdateMessage {
  public readonly createAtNetworkTimestamp: Params['createAtNetworkTimestamp'];
  public readonly memberSessionIds: Params['memberSessionIds'];
  public readonly messageHashes: Params['messageHashes'];
  public readonly secretKey: Params['secretKey'];
  public readonly sodium: Params['sodium'];
  public readonly namespace = SnodeNamespaces.ClosedGroupMessages;

  constructor(params: Params) {
    super(params);

    this.memberSessionIds = params.memberSessionIds;
    this.messageHashes = params.messageHashes;
    this.secretKey = params.secretKey;
    this.createAtNetworkTimestamp = params.createAtNetworkTimestamp;
    this.sodium = params.sodium;

    if (isEmpty(this.memberSessionIds) && isEmpty(this.messageHashes)) {
      throw new Error(
        'GroupUpdateDeleteMemberContentMessage needs members or messageHashes to be filled'
      );
    }

    Preconditions.checkArrayHaveOnly05Pubkeys({
      arr: this.memberSessionIds,
      context: this.constructor.toString(),
      varName: 'memberSessionIds',
    });
  }

  public dataProto(): SignalService.DataMessage {
    // If we have the secretKey, we can delete it for anyone `"DELETE_CONTENT" || timestamp || sessionId[0] || ... || messageHashes[0] || ...`

    let adminSignature = new Uint8Array();
    if (this.secretKey && !_.isEmpty(this.secretKey) && this.sodium) {
      adminSignature = this.sodium.crypto_sign_detached(
        stringToUint8Array(
          `DELETE_CONTENT${this.createAtNetworkTimestamp}${this.memberSessionIds.join('')}${this.messageHashes.join('')}`
        ),
        this.secretKey
      );
    }
    const deleteMemberContent = new SignalService.GroupUpdateDeleteMemberContentMessage({
      adminSignature,
      memberSessionIds: this.memberSessionIds,
      messageHashes: this.messageHashes,
    });

    return new SignalService.DataMessage({ groupUpdateMessage: { deleteMemberContent } });
  }

  public isForGroupSwarm(): boolean {
    return true;
  }
  public isFor1o1Swarm(): boolean {
    return false;
  }
}
