/**
 * We sometimes want to limit the possible types that a number field can have, but also have a meaning associated with that value.
 *
 * When we use strings, it's easy as we can just create an union of strings to have both: a kind of enum and the meaning associated with it. (i.e. "private" | "group" | "groupv2" is explicit).
 *
 * But, with numbers it's not possible. For numbers (and potentially other types than strings), we need an enum to associate the value to a meaning.
 * The way we do this on session-desktop is to use `const enum`. Those are enums which are completely removed at compile time.
 * Those cannot be used/nor imported by a .d.ts file which is why we keep them separate here.
 *
 *
 * If we ever need a const enum that we need in a .d.ts, things will get complex. Hopefully typescript/eslint support will be better by then.
 *
 */

/**
 * Priorities have a weird behavior.
 * * 0 always means unpinned and not hidden.
 * * -1 always means hidden.
 * * anything over 0 means pinned with the higher priority the better. (No sorting currently implemented)
 *
 * When our local user pins a conversation we should use 1 as the priority.
 * When we get an update from the libsession util wrapper, we should trust the value and set it locally as is.
 * So if we get 100 as priority, we set the conversation priority to 100.
 * If we get -20 as priority we set it as is, even if our current client does not understand what that means.
 *
 */

export const enum CONVERSATION_PRIORITIES {
  default = 0,
  pinned = 1,
  hidden = -1,
}

export const enum READ_MESSAGE_STATE {
  read = 0,
  unread = 1,
}
