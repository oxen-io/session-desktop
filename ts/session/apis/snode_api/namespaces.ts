import { last, orderBy } from 'lodash';
import { PickEnum } from '../../../types/Enums';
import { assertUnreachable } from '../../../types/sqlSharedTypes';

export enum SnodeNamespaces {
  /**
   * The messages sent to a closed group are sent and polled from this namespace
   */
  LegacyClosedGroup = -10,

  /**
   * This is the namespace anyone can deposit a message for us
   */
  Default = 0,

  /**
   * This is the namespace used to sync our profile
   */
  UserProfile = 2,
  /**
   * This is the namespace used to sync our contacts
   */
  UserContacts = 3,
  /**
   * This is the namespace used to sync our volatile info (currently read status only)
   */
  ConvoInfoVolatile = 4,

  /**
   *  This is the namespace used to sync our user groups and communities
   */
  UserGroups = 5,

  /**
   * This is the namespace that revoked members can still poll messages from
   */
  ClosedGroupRevokedRetrievableMessages = -11,

  /**
   * This is the namespace used to sync the closed group messages for each closed group
   */
  ClosedGroupMessages = 11,

  /**
   * This is the namespace used to sync the closed group details for each closed group
   */
  ClosedGroupKeys = 12,

  /**
   * This is the namespace used to sync the members for each closed group
   */
  ClosedGroupInfo = 13,

  /**
   * This is the namespace used to sync the keys for each closed group
   */
  ClosedGroupMembers = 14,
}

export type SnodeNamespacesLegacyGroup = PickEnum<
  SnodeNamespaces,
  SnodeNamespaces.LegacyClosedGroup
>;

export type SnodeNamespacesGroupConfig = PickEnum<
  SnodeNamespaces,
  | SnodeNamespaces.ClosedGroupInfo
  | SnodeNamespaces.ClosedGroupMembers
  | SnodeNamespaces.ClosedGroupKeys
>;

/**
 * the namespaces to which a 03-group can store/retrieve messages from/to
 */
export type SnodeNamespacesGroup =
  | SnodeNamespacesGroupConfig
  | PickEnum<SnodeNamespaces, SnodeNamespaces.ClosedGroupMessages>
  | PickEnum<SnodeNamespaces, SnodeNamespaces.ClosedGroupRevokedRetrievableMessages>;

export type SnodeNamespacesUser = PickEnum<SnodeNamespaces, SnodeNamespaces.Default>;

export type SnodeNamespacesUserConfig = PickEnum<
  SnodeNamespaces,
  | SnodeNamespaces.UserProfile
  | SnodeNamespaces.UserContacts
  | SnodeNamespaces.UserGroups
  | SnodeNamespaces.ConvoInfoVolatile
>;

/**
 * Returns true if that namespace is associated with the config of a user (not his messages, only configs)
 */
// eslint-disable-next-line consistent-return
function isUserConfigNamespace(namespace: SnodeNamespaces): namespace is SnodeNamespacesUserConfig {
  switch (namespace) {
    case SnodeNamespaces.UserProfile:
    case SnodeNamespaces.UserContacts:
    case SnodeNamespaces.UserGroups:
    case SnodeNamespaces.ConvoInfoVolatile:
      return true;
    case SnodeNamespaces.ClosedGroupInfo:
    case SnodeNamespaces.ClosedGroupKeys:
    case SnodeNamespaces.ClosedGroupMembers:
    case SnodeNamespaces.ClosedGroupMessages:
    case SnodeNamespaces.LegacyClosedGroup:
    case SnodeNamespaces.ClosedGroupRevokedRetrievableMessages:
    case SnodeNamespaces.Default:
      // user messages is not hosting config based messages
      return false;

    default:
      try {
        assertUnreachable(namespace, `isUserConfigNamespace case not handled: ${namespace}`);
      } catch (e) {
        window.log.warn(`isUserConfigNamespace case not handled: ${namespace}: ${e.message}`);
        return false;
      }
  }
}

/**
 * Returns true if that namespace is one of the namespace used for the 03-group config messages
 */
function isGroupConfigNamespace(
  namespace: SnodeNamespaces
): namespace is SnodeNamespacesGroupConfig {
  switch (namespace) {
    case SnodeNamespaces.Default:
    case SnodeNamespaces.UserContacts:
    case SnodeNamespaces.UserProfile:
    case SnodeNamespaces.UserGroups:
    case SnodeNamespaces.ConvoInfoVolatile:
    case SnodeNamespaces.LegacyClosedGroup:
    case SnodeNamespaces.ClosedGroupMessages:
    case SnodeNamespaces.ClosedGroupRevokedRetrievableMessages:
      return false;
    case SnodeNamespaces.ClosedGroupInfo:
    case SnodeNamespaces.ClosedGroupKeys:
    case SnodeNamespaces.ClosedGroupMembers:
      return true;

    default:
      try {
        assertUnreachable(namespace, `isGroupConfigNamespace case not handled: ${namespace}`);
      } catch (e) {
        window.log.warn(`isGroupConfigNamespace case not handled: ${namespace}: ${e.message}`);
      }
  }
  return false;
}

/**
 *
 * @param namespace the namespace to check
 * @returns true if that namespace is a valid namespace for a 03 group (either a config namespace or a message namespace)
 */
function isGroupNamespace(namespace: SnodeNamespaces): namespace is SnodeNamespacesGroup {
  if (isGroupConfigNamespace(namespace)) {
    return true;
  }
  if (namespace === SnodeNamespaces.ClosedGroupMessages) {
    return true;
  }
  if (namespace === SnodeNamespaces.ClosedGroupRevokedRetrievableMessages) {
    return true;
  }
  switch (namespace) {
    case SnodeNamespaces.Default:
    case SnodeNamespaces.UserContacts:
    case SnodeNamespaces.UserProfile:
    case SnodeNamespaces.UserGroups:
    case SnodeNamespaces.ConvoInfoVolatile:
    case SnodeNamespaces.LegacyClosedGroup:
      return false;
    default:
      try {
        assertUnreachable(namespace, `isGroupNamespace case not handled: ${namespace}`);
      } catch (e) {
        window.log.warn(`isGroupNamespace case not handled: ${namespace}: ${e.message}`);
        return false;
      }
  }
  return false;
}

function namespacePriority(namespace: SnodeNamespaces): 10 | 1 {
  switch (namespace) {
    case SnodeNamespaces.Default:
    case SnodeNamespaces.ClosedGroupMessages:
      return 10;
    case SnodeNamespaces.UserGroups:
    case SnodeNamespaces.ConvoInfoVolatile:
    case SnodeNamespaces.UserProfile:
    case SnodeNamespaces.UserContacts:
    case SnodeNamespaces.LegacyClosedGroup:
    case SnodeNamespaces.ClosedGroupInfo:
    case SnodeNamespaces.ClosedGroupMembers:
    case SnodeNamespaces.ClosedGroupKeys:
    case SnodeNamespaces.ClosedGroupRevokedRetrievableMessages:
      return 1;

    default:
      try {
        assertUnreachable(namespace, `namespacePriority case not handled: ${namespace}`);
      } catch (e) {
        window.log.warn(`namespacePriority case not handled: ${namespace}: ${e.message}`);
        return 1;
      }
  }
  return 1;
}

function maxSizeMap(namespaces: Array<SnodeNamespaces>) {
  let lastSplit = 1;
  const withPriorities = namespaces.map(namespace => {
    return { namespace, priority: namespacePriority(namespace) };
  });
  const groupedByPriorities: Array<{ priority: number; namespaces: Array<SnodeNamespaces> }> = [];
  withPriorities.forEach(item => {
    if (!groupedByPriorities.find(p => p.priority === item.priority)) {
      groupedByPriorities.push({ priority: item.priority, namespaces: [] });
    }
    groupedByPriorities.find(p => p.priority === item.priority)?.namespaces.push(item.namespace);
  });

  const sortedDescPriorities = orderBy(groupedByPriorities, ['priority'], ['desc']);
  const lowestPriority = last(sortedDescPriorities)?.priority || 1;
  const sizeMap = sortedDescPriorities.flatMap(m => {
    const paddingForLowerPriority = m.priority === lowestPriority ? 0 : 1;
    const splitsForPriority = paddingForLowerPriority + m.namespaces.length;
    lastSplit *= splitsForPriority;
    return m.namespaces.map(namespace => ({ namespace, maxSize: -lastSplit }));
  });
  return sizeMap;
}

function toRole(namespace: number) {
  const asKnownNamespace: SnodeNamespaces = namespace;
  switch (asKnownNamespace) {
    case SnodeNamespaces.LegacyClosedGroup:
      return 'legacyGroup';
    case SnodeNamespaces.Default:
      return 'default';
    case SnodeNamespaces.UserProfile:
      return 'userProfile';
    case SnodeNamespaces.UserContacts:
      return 'userContacts';
    case SnodeNamespaces.ConvoInfoVolatile:
      return 'convoVolatile';
    case SnodeNamespaces.UserGroups:
      return 'userGroups';
    case SnodeNamespaces.ClosedGroupMessages:
      return 'groupMsg';
    case SnodeNamespaces.ClosedGroupKeys:
      return 'groupKeys';
    case SnodeNamespaces.ClosedGroupInfo:
      return 'groupInfo';
    case SnodeNamespaces.ClosedGroupMembers:
      return 'groupMembers';
    case SnodeNamespaces.ClosedGroupRevokedRetrievableMessages:
      return 'groupRevoked';
    default:
      return `${namespace}`;
  }
}

function toRoles(namespace: Array<number>) {
  return namespace.map(toRole);
}

export const SnodeNamespace = {
  isUserConfigNamespace,
  isGroupConfigNamespace,
  isGroupNamespace,
  maxSizeMap,
  toRoles,
  toRole,
};
