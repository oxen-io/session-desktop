module.exports = {
  globeButtonSection: '//*[contains(@class,"session-icon-button")  and .//*[contains(@class, "globe")]]',
  joinOpenGroupButton: '//div[contains(string(), "Join Open Group")][contains(@role, "button")]',
  openGroupInputUrl: '//textarea[contains(@placeholder, "chat.getsession.org")]',
  sessionLoader: '//div[contains(@class, "session-loader")]',
  sessionToastJoinOpenGroupSuccess: '//div[contains(string(), "Successfully connected to new open group server")][contains(@class, "session-toast-wrapper")]',
  sessionToastJoinOpenGroupAlreadyExist: '//div[contains(string(), "You are already connected to this public channel")][contains(@class, "session-toast-wrapper")]',
  leftPaneOverlay: '//div[contains(@class, "module-left-pane-overlay")]',
  rowOpenGroupConversationName: (groupName) => `//span[contains(string(), "${groupName}")][contains(@class, "module-conversation__user__profile-number")]`,
};