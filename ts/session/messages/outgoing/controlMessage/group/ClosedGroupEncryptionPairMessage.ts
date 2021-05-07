import { Constants } from '../../../..';
import { SessionProtos } from '../../../../../protobuf';
import { ClosedGroupMessage, ClosedGroupMessageParams } from './ClosedGroupMessage';

export interface ClosedGroupEncryptionPairMessageParams extends ClosedGroupMessageParams {
  encryptedKeyPairs: Array<SessionProtos.DataMessage.ClosedGroupControlMessage.KeyPairWrapper>;
}

export class ClosedGroupEncryptionPairMessage extends ClosedGroupMessage {
  private readonly encryptedKeyPairs: Array<
    SessionProtos.DataMessage.ClosedGroupControlMessage.KeyPairWrapper
  >;

  constructor(params: ClosedGroupEncryptionPairMessageParams) {
    super({
      timestamp: params.timestamp,
      identifier: params.identifier,
      groupId: params.groupId,
      expireTimer: params.expireTimer,
    });
    this.encryptedKeyPairs = params.encryptedKeyPairs;
    if (this.encryptedKeyPairs.length === 0) {
      throw new Error('EncryptedKeyPairs cannot be empty');
    }
  }

  public dataProto(): SessionProtos.DataMessage {
    const dataMessage = super.dataProto();

    // tslint:disable: no-non-null-assertion
    dataMessage.closedGroupControlMessage!.type =
      SessionProtos.DataMessage.ClosedGroupControlMessage.Type.ENCRYPTION_KEY_PAIR;
    dataMessage.closedGroupControlMessage!.wrappers = this.encryptedKeyPairs.map(w => {
      const { publicKey, encryptedKeyPair } = w;
      return {
        publicKey: publicKey,
        encryptedKeyPair,
      };
    });

    return dataMessage;
  }
}
