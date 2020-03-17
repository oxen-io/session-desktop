module.exports = {
  registrationTabSignIn:
    '//div[contains(string(), "Sign In")][contains(@class, "session-registration__tab")][contains(@role, "tab")]',
  
  // restore from seed
  restoreFromSeedMode:
    '//div[contains(string(), "Restore From Recovery")][contains(@role, "button")]',
  
  recoveryPhraseInput:
    '//input[contains(@placeholder, "Enter Recovery Phrase")]',
  displayNameInput: '//input[contains(@placeholder, "Enter a display name")]',
  passwordInput: '//input[contains(@placeholder, "Enter password (optional)")]',
  continueSessionButton:
    '//div[contains(string(), "Continue Your Session")][contains(@role, "button")]',
  conversationListContainer:
    '//div[contains(@class, "module-conversations-list-content")]',
  
  // device linking
  linkDeviceMode:
    '//div[contains(string(), "Link Device to Existing Session ID")][contains(@role, "button")]',
  textareaLinkDevicePubkey:
    '//textarea[contains(@placeholder, "Enter other device’s Session ID here")]',
  linkDeviceTriggerButton:
    '//div[contains(string(), "Link Device")][contains(@role, "button")]',
  toastWrapper: '//*[contains(@class,"session-toast-wrapper")]',

  secretToastDescription: '//p[contains(@class, "description")]',
};
