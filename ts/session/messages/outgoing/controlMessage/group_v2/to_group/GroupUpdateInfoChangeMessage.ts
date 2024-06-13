import { isEmpty, isFinite } from 'lodash';
import { SignalService } from '../../../../../../protobuf';
import { SnodeNamespaces } from '../../../../../apis/snode_api/namespaces';
import { LibSodiumWrappers } from '../../../../../crypto';
import { stringToUint8Array } from '../../../../../utils/String';
import {
  AdminSigDetails,
  GroupUpdateMessage,
  GroupUpdateMessageParams,
} from '../GroupUpdateMessage';

type NameChangeParams = GroupUpdateMessageParams &
  AdminSigDetails & {
    typeOfChange: SignalService.GroupUpdateInfoChangeMessage.Type.NAME;
    updatedName: string;
  };

type AvatarChangeParams = GroupUpdateMessageParams &
  AdminSigDetails & {
    typeOfChange: SignalService.GroupUpdateInfoChangeMessage.Type.AVATAR;
  };

type DisappearingMessageChangeParams = GroupUpdateMessageParams &
  AdminSigDetails & {
    typeOfChange: SignalService.GroupUpdateInfoChangeMessage.Type.DISAPPEARING_MESSAGES;
    updatedExpirationSeconds: number;
  };

/**
 * GroupUpdateInfoChangeMessage is sent as a message to group's swarm.
 */
export class GroupUpdateInfoChangeMessage extends GroupUpdateMessage {
  public readonly typeOfChange: SignalService.GroupUpdateInfoChangeMessage.Type;
  public readonly updatedName: string = '';
  public readonly updatedExpirationSeconds: number = 0;
  public readonly namespace = SnodeNamespaces.ClosedGroupMessages;
  private readonly secretKey: Uint8Array; // not sent, only used for signing content as part of the message
  private readonly sodium: LibSodiumWrappers;

  constructor(params: NameChangeParams | AvatarChangeParams | DisappearingMessageChangeParams) {
    super(params);
    const types = SignalService.GroupUpdateInfoChangeMessage.Type;

    this.typeOfChange = params.typeOfChange;
    this.secretKey = params.secretKey;
    this.sodium = params.sodium;

    switch (params.typeOfChange) {
      case types.NAME: {
        if (isEmpty(params.updatedName)) {
          throw new Error('A group needs a name');
        }
        this.updatedName = params.updatedName;
        break;
      }
      case types.AVATAR:
        // nothing to do for avatar
        break;
      case types.DISAPPEARING_MESSAGES: {
        if (!isFinite(params.updatedExpirationSeconds) || params.updatedExpirationSeconds < 0) {
          throw new Error('Invalid disappearing message timer. Must be finite and >=0');
        }
        this.updatedExpirationSeconds = params.updatedExpirationSeconds;
        break;
      }
      default:
        break;
    }
  }

  public dataProto(): SignalService.DataMessage {
    const infoChangeMessage = new SignalService.GroupUpdateInfoChangeMessage({
      type: this.typeOfChange,
      adminSignature: this.sodium.crypto_sign_detached(
        stringToUint8Array(`INFO_CHANGE${this.typeOfChange}${this.createAtNetworkTimestamp}`),
        this.secretKey
      ),
    });
    switch (this.typeOfChange) {
      case SignalService.GroupUpdateInfoChangeMessage.Type.NAME:
        infoChangeMessage.updatedName = this.updatedName;

        break;
      case SignalService.GroupUpdateInfoChangeMessage.Type.DISAPPEARING_MESSAGES:
        infoChangeMessage.updatedExpiration = this.updatedExpirationSeconds;

        break;

      case SignalService.GroupUpdateInfoChangeMessage.Type.AVATAR:
        // nothing to do for the avatar case
        break;
      default:
        break;
    }

    return new SignalService.DataMessage({ groupUpdateMessage: { infoChangeMessage } });
  }

  public isForGroupSwarm(): boolean {
    return true;
  }
  public isFor1o1Swarm(): boolean {
    return false;
  }
}
