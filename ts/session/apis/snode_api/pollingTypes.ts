// That named-tuple syntax breaks prettier linting and formatting on the whole file it is used currently, so we keep it separately.

import { GroupPubkeyType } from 'libsession_util_nodejs';
import { ConversationTypeEnum } from '../../../models/conversationAttributes';

export type PollForUs = [pubkey: string, type: ConversationTypeEnum.PRIVATE];
export type PollForLegacy = [pubkey: string, type: ConversationTypeEnum.GROUP];
export type PollForGroup = [pubkey: GroupPubkeyType, type: ConversationTypeEnum.GROUPV2];
