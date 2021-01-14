// The idea with this file is to make it webpackable for the style guide

const Crypto = require('./crypto');
const Data = require('./data');
const Database = require('./database');
const Emoji = require('../../ts/util/emoji');
const IndexedDB = require('./indexeddb');
const Notifications = require('../../ts/notifications');
const OS = require('../../ts/OS');
const Settings = require('./settings');
const Util = require('../../ts/util');
const { migrateToSQL } = require('./migrate_to_sql');
const LinkPreviews = require('./link_previews');
const AttachmentDownloads = require('./attachment_downloads');

// Components
const {
  ContactDetail,
} = require('../../ts/components/conversation/ContactDetail');
const { ContactListItem } = require('../../ts/components/ContactListItem');
const { ContactName } = require('../../ts/components/conversation/ContactName');
const {
  EmbeddedContact,
} = require('../../ts/components/conversation/EmbeddedContact');
const { Emojify } = require('../../ts/components/conversation/Emojify');
const { Lightbox } = require('../../ts/components/Lightbox');
const { LightboxGallery } = require('../../ts/components/LightboxGallery');
const { MemberList } = require('../../ts/components/conversation/MemberList');
const { EditProfileDialog } = require('../../ts/components/EditProfileDialog');
const { UserDetailsDialog } = require('../../ts/components/UserDetailsDialog');
const {
  DevicePairingDialog,
} = require('../../ts/components/DevicePairingDialog');
const {
  SessionConversation,
} = require('../../ts/components/session/conversation/SessionConversation');
const { SessionModal } = require('../../ts/components/session/SessionModal');
const {
  SessionSeedModal,
} = require('../../ts/components/session/SessionSeedModal');
const {
  SessionIDResetDialog,
} = require('../../ts/components/session/SessionIDResetDialog');
const {
  SessionRegistrationView,
} = require('../../ts/components/session/SessionRegistrationView');

const {
  SessionInboxView,
} = require('../../ts/components/session/SessionInboxView');
const {
  SessionPasswordModal,
} = require('../../ts/components/session/SessionPasswordModal');
const {
  SessionPasswordPrompt,
} = require('../../ts/components/session/SessionPasswordPrompt');

const {
  SessionConfirm,
} = require('../../ts/components/session/SessionConfirm');

const {
  UpdateGroupNameDialog,
} = require('../../ts/components/conversation/UpdateGroupNameDialog');
const {
  UpdateGroupMembersDialog,
} = require('../../ts/components/conversation/UpdateGroupMembersDialog');
const {
  InviteContactsDialog,
} = require('../../ts/components/conversation/InviteContactsDialog');
const {
  AdminLeaveClosedGroupDialog,
} = require('../../ts/components/conversation/AdminLeaveClosedGroupDialog');

const {
  AddModeratorsDialog,
} = require('../../ts/components/conversation/ModeratorsAddDialog');
const {
  RemoveModeratorsDialog,
} = require('../../ts/components/conversation/ModeratorsRemoveDialog');

const {
  GroupInvitation,
} = require('../../ts/components/conversation/GroupInvitation');
const {
  MediaGallery,
} = require('../../ts/components/conversation/media-gallery/MediaGallery');
const { Message } = require('../../ts/components/conversation/Message');
const { Quote } = require('../../ts/components/conversation/Quote');
const {
  TypingBubble,
} = require('../../ts/components/conversation/TypingBubble');

// State
const conversationsDuck = require('../../ts/state/ducks/conversations');
const userDuck = require('../../ts/state/ducks/user');


// Types
const AttachmentType = require('./types/attachment');
const VisualAttachment = require('./types/visual_attachment');
const Contact = require('../../ts/types/Contact');
const Conversation = require('./types/conversation');
const Errors = require('./types/errors');
const MediaGalleryMessage = require('../../ts/components/conversation/media-gallery/types/Message');
const MessageType = require('./types/message');
const MIME = require('../../ts/types/MIME');
const PhoneNumber = require('../../ts/types/PhoneNumber');
const SettingsType = require('../../ts/types/Settings');

// Views
const Initialization = require('./views/initialization');


exports.setup = () => {

  Data.init();

  const Components = {
    ContactDetail,
    ContactListItem,
    ContactName,
    EmbeddedContact,
    Emojify,
    Lightbox,
    LightboxGallery,
    MemberList,
    EditProfileDialog,
    UserDetailsDialog,
    DevicePairingDialog,
    SessionInboxView,
    UpdateGroupNameDialog,
    UpdateGroupMembersDialog,
    InviteContactsDialog,
    AdminLeaveClosedGroupDialog,
    AddModeratorsDialog,
    RemoveModeratorsDialog,
    GroupInvitation,
    SessionConversation,
    SessionConfirm,
    SessionModal,
    SessionSeedModal,
    SessionIDResetDialog,
    SessionPasswordModal,
    SessionPasswordPrompt,
    SessionRegistrationView,
    MediaGallery,
    Message,
    Quote,
    Types: {
      Message: MediaGalleryMessage,
    },
    TypingBubble,
  };

  const Ducks = {
    conversations: conversationsDuck,
    user: userDuck,
  };
  const State = {
    Ducks,
  };

  const Types = {
    Attachment: AttachmentType,
    Contact,
    Conversation,
    Errors,
    Message: MessageType,
    MIME,
    PhoneNumber,
    Settings: SettingsType,
    VisualAttachment,
  };

  const Views = {
    Initialization,
  };

  return {
    AttachmentDownloads,
    Components,
    Crypto,
    Data,
    Database,
    Emoji,
    IndexedDB,
    LinkPreviews,
    migrateToSQL,
    Notifications,
    OS,
    Settings,
    State,
    Types,
    Util,
    Views,
  };
};
