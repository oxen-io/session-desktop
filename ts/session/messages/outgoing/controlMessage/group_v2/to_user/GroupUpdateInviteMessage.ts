import { SignalService } from '../../../../../../protobuf';
import { UserUtils } from '../../../../../utils';
import { Preconditions } from '../../../preconditions';
import { GroupUpdateMessage, GroupUpdateMessageParams } from '../GroupUpdateMessage';

interface Params extends GroupUpdateMessageParams {
  groupName: string;
  adminSignature: Uint8Array; // this is a signature of `"INVITE" || inviteeSessionId || timestamp`
  memberAuthData: Uint8Array;
}

/**
 * GroupUpdateInviteMessage is sent as a 1o1 message to the recipient, not through the group's swarm.
 */
export class GroupUpdateInviteMessage extends GroupUpdateMessage {
  public readonly groupName: Params['groupName'];
  public readonly adminSignature: Params['adminSignature'];
  public readonly memberAuthData: Params['memberAuthData'];

  constructor({ adminSignature, groupName, memberAuthData, ...others }: Params) {
    super({
      ...others,
    });

    this.groupName = groupName; // not sure if getting an invite with an empty group name should make us drop an incoming group invite (and the keys associated to it too)
    this.adminSignature = adminSignature;
    this.memberAuthData = memberAuthData;

    Preconditions.checkUin8tArrayOrThrow({
      data: adminSignature,
      expectedLength: 64,
      varName: 'adminSignature',
      context: this.constructor.toString(),
    });
    Preconditions.checkUin8tArrayOrThrow({
      data: memberAuthData,
      expectedLength: 100,
      varName: 'memberAuthData',
      context: this.constructor.toString(),
    });
  }

  public dataProto(): SignalService.DataMessage {
    const ourProfile = UserUtils.getOurProfile();
    const inviteMessage = new SignalService.GroupUpdateInviteMessage({
      groupSessionId: this.destination,
      name: this.groupName,
      adminSignature: this.adminSignature,
      memberAuthData: this.memberAuthData,
    });

    return new SignalService.DataMessage({
      profile: ourProfile
        ? { displayName: ourProfile.displayName, profilePicture: ourProfile.avatarPointer }
        : undefined,
      profileKey: ourProfile?.profileKey,
      groupUpdateMessage: { inviteMessage },
    });
  }

  public isForGroupSwarm(): boolean {
    return false;
  }

  public isFor1o1Swarm(): boolean {
    return true;
  }
}
