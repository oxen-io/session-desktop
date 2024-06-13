import { SignalService } from '../../../../../../protobuf';
import { SnodeNamespaces } from '../../../../../apis/snode_api/namespaces';
import { GroupUpdateMessage } from '../GroupUpdateMessage';

/**
 * GroupUpdateMemberLeftNotificationMessage is sent to the group's swarm.
 * Our pubkey, as the leaving member is part of the encryption of libsession for the new groups
 *
 */
export class GroupUpdateMemberLeftNotificationMessage extends GroupUpdateMessage {
  public readonly namespace = SnodeNamespaces.ClosedGroupMessages;

  public dataProto(): SignalService.DataMessage {
    const memberLeftNotificationMessage =
      new SignalService.GroupUpdateMemberLeftNotificationMessage({});

    return new SignalService.DataMessage({ groupUpdateMessage: { memberLeftNotificationMessage } });
  }

  public isForGroupSwarm(): boolean {
    return true;
  }
  public isFor1o1Swarm(): boolean {
    return false;
  }
}
