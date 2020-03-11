module.exports = {
  globeButtonSection: '//*[contains(@class,"session-icon-button")  and .//*[contains(@class, "globe")]]',
  joinOpenGroupButton: '//div[contains(string(), "Join Open Group")][contains(@role, "button")]',
  openGroupInputUrl: '//textarea[contains(@placeholder, "chat.getsession.org")]',
  sessionLoader: '//div[contains(@class, "session-loader")]',
  sessionToastJoinOpenGroupSuccess: '//div[contains(string(), "Successfully connected to new open group server")][contains(@class, "session-toast-wrapper")]',
  sessionToastJoinOpenGroupAlreadyExist: '//div[contains(string(), "You are already connected to this public channel")][contains(@class, "session-toast-wrapper")]',
  leftPaneOverlay: '//div[contains(@class, "module-left-pane-overlay")]',
  rowOpenGroupConversationName: (groupName) => `//span[contains(string(), "${groupName}")][contains(@class, "module-conversation__user__profile-number")]`,
  
   /* registrationTabs: '//div[contains(string(), "Sign In")][contains(@class, "session-registration__tab")][contains(@role, "tab")]',
    restoreFromSeedMode: '//div[contains(string(), "Restore From Recovery")][contains(@role, "button")]',
    recoveryPhraseInput: '//input[contains(@placeholder, "Enter Recovery Phrase")]',
    displayNameInput: '//input[contains(@placeholder, "Enter a display name")]',
    passwordInput: '//input[contains(@placeholder, "Enter password (optional)")]',
    continueSessionButton: '//div[contains(string(), "Continue Your Session")][contains(@role, "button")]',
    conversationListContainer: '//div[contains(@class, "module-conversations-list-content")]', */
  };