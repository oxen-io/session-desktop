export type LocalizerKeys =
  | 'gotIt'
  | 'removePassword'
  | 'editMenuDelete'
  | 'signIn'
  | 'newClosedGroup'
  | 'userUnbanFailed'
  | 'changePassword'
  | 'saved'
  | 'startedACall'
  | 'mainMenuWindow'
  | 'unblocked'
  | 'userAddedToModerators'
  | 'to'
  | 'sent'
  | 'requestsPlaceholder'
  | 'closedGroupInviteFailMessage'
  | 'noContactsForGroup'
  | 'originalMessageNotAvailable'
  | 'linkVisitWarningMessage'
  | 'editMenuPasteAndMatchStyle'
  | 'anonymous'
  | 'viewMenuZoomOut'
  | 'dialogClearAllDataDeletionFailedDesc'
  | 'timerOption_10_seconds_abbreviated'
  | 'enterDisplayName'
  | 'connectToServerFail'
  | 'disableNotifications'
  | 'publicChatExists'
  | 'passwordViewTitle'
  | 'joinOpenGroupAfterInvitationConfirmationTitle'
  | 'notificationMostRecentFrom'
  | 'timerOption_5_minutes'
  | 'linkPreviewsConfirmMessage'
  | 'notificationMostRecent'
  | 'video'
  | 'readReceiptSettingDescription'
  | 'userBanFailed'
  | 'autoUpdateLaterButtonLabel'
  | 'maximumAttachments'
  | 'deviceOnly'
  | 'expiredWarning'
  | 'beginYourSession'
  | 'typingIndicatorsSettingDescription'
  | 'changePasswordToastDescription'
  | 'addingContacts'
  | 'passwordLengthError'
  | 'typingIndicatorsSettingTitle'
  | 'maxPasswordAttempts'
  | 'viewMenuToggleDevTools'
  | 'fileSizeWarning'
  | 'openGroupURL'
  | 'messageRequestsDescription'
  | 'hideMenuBarDescription'
  | 'search'
  | 'pickClosedGroupMember'
  | 'ByUsingThisService...'
  | 'startConversation'
  | 'unableToCallTitle'
  | 'yourUniqueSessionID'
  | 'typingAlt'
  | 'orJoinOneOfThese'
  | 'members'
  | 'sendRecoveryPhraseMessage'
  | 'timerOption_1_hour'
  | 'youGotKickedFromGroup'
  | 'cannotRemoveCreatorFromGroupDesc'
  | 'incomingError'
  | 'notificationsSettingsTitle'
  | 'ringing'
  | 'tookAScreenshot'
  | 'from'
  | 'thisMonth'
  | 'next'
  | 'addModerators'
  | 'sessionMessenger'
  | 'today'
  | 'appMenuHideOthers'
  | 'sendFailed'
  | 'enterPassword'
  | 'me'
  | 'enterSessionIDOfRecipient'
  | 'dialogClearAllDataDeletionFailedMultiple'
  | 'pinConversationLimitToastDescription'
  | 'appMenuQuit'
  | 'windowMenuZoom'
  | 'allUsersAreRandomly...'
  | 'cameraPermissionNeeded'
  | 'requestsSubtitle'
  | 'closedGroupInviteSuccessTitle'
  | 'accept'
  | 'setPasswordTitle'
  | 'editMenuUndo'
  | 'pinConversation'
  | 'lightboxImageAlt'
  | 'linkDevice'
  | 'goToOurSurvey'
  | 'invalidPubkeyFormat'
  | 'disappearingMessagesDisabled'
  | 'spellCheckDescription'
  | 'autoUpdateNewVersionInstructions'
  | 'appMenuUnhide'
  | 'timerOption_30_minutes_abbreviated'
  | 'description'
  | 'voiceMessage'
  | 'changePasswordTitle'
  | 'copyMessage'
  | 'messageDeletionForbidden'
  | 'deleteJustForMe'
  | 'changeAccountPasswordTitle'
  | 'onionPathIndicatorDescription'
  | 'timestamp_s'
  | 'mediaPermissionsTitle'
  | 'replyingToMessage'
  | 'welcomeToYourSession'
  | 'editMenuCopy'
  | 'timestamp_m'
  | 'leftTheGroup'
  | 'timerOption_30_minutes'
  | 'nameOnly'
  | 'typeInOldPassword'
  | 'imageAttachmentAlt'
  | 'displayNameEmpty'
  | 'inviteContacts'
  | 'callMediaPermissionsTitle'
  | 'blocked'
  | 'noBlockedContacts'
  | 'leaveGroupConfirmation'
  | 'banUserConfirm'
  | 'banUserAndDeleteAll'
  | 'joinOpenGroupAfterInvitationConfirmationDesc'
  | 'invalidNumberError'
  | 'newSession'
  | 'contextMenuNoSuggestions'
  | 'recoveryPhraseRevealButtonText'
  | 'banUser'
  | 'permissions'
  | 'answeredACall'
  | 'sendMessage'
  | 'recoveryPhraseRevealMessage'
  | 'showRecoveryPhrase'
  | 'autoUpdateSettingDescription'
  | 'unlock'
  | 'remove'
  | 'restoreUsingRecoveryPhrase'
  | 'cannotUpdateDetail'
  | 'showRecoveryPhrasePasswordRequest'
  | 'spellCheckDirty'
  | 'debugLogExplanation'
  | 'closedGroupInviteFailTitle'
  | 'setAccountPasswordDescription'
  | 'removeAccountPasswordDescription'
  | 'establishingConnection'
  | 'noModeratorsToRemove'
  | 'moreInformation'
  | 'offline'
  | 'appearanceSettingsTitle'
  | 'mainMenuView'
  | 'mainMenuEdit'
  | 'notificationForConvo_disabled'
  | 'leaveGroupConfirmationAdmin'
  | 'notificationForConvo_all'
  | 'emptyGroupNameError'
  | 'copyOpenGroupURL'
  | 'setPasswordInvalid'
  | 'timerOption_30_seconds_abbreviated'
  | 'removeResidueMembers'
  | 'timerOption_1_hour_abbreviated'
  | 'areYouSureDeleteEntireAccount'
  | 'noGivenPassword'
  | 'closedGroupInviteOkText'
  | 'readReceiptSettingTitle'
  | 'copySessionID'
  | 'timerOption_0_seconds'
  | 'zoomFactorSettingTitle'
  | 'unableToCall'
  | 'callMissedTitle'
  | 'done'
  | 'videoAttachmentAlt'
  | 'message'
  | 'mainMenuHelp'
  | 'open'
  | 'pasteLongPasswordToastTitle'
  | 'nameAndMessage'
  | 'autoUpdateDownloadedMessage'
  | 'onionPathIndicatorTitle'
  | 'unknown'
  | 'submitDebugLog'
  | 'mediaMessage'
  | 'addAsModerator'
  | 'closedGroupInviteFailTitlePlural'
  | 'enterSessionID'
  | 'editGroup'
  | 'incomingCallFrom'
  | 'timerSetOnSync'
  | 'deleteMessages'
  | 'editMenuSelectAll'
  | 'spellCheckTitle'
  | 'translation'
  | 'copy'
  | 'messageBodyMissing'
  | 'timerOption_12_hours_abbreviated'
  | 'onlyAdminCanRemoveMembersDesc'
  | 'recording'
  | 'kickedFromTheGroup'
  | 'windowMenuMinimize'
  | 'debugLog'
  | 'timerOption_0_seconds_abbreviated'
  | 'timerOption_5_minutes_abbreviated'
  | 'enterOptionalPassword'
  | 'goToReleaseNotes'
  | 'unpinConversation'
  | 'viewMenuResetZoom'
  | 'startInTrayDescription'
  | 'groupNamePlaceholder'
  | 'stagedPreviewThumbnail'
  | 'helpUsTranslateSession'
  | 'unreadMessages'
  | 'documents'
  | 'audioPermissionNeededTitle'
  | 'deleteMessagesQuestion'
  | 'clickToTrustContact'
  | 'closedGroupInviteFailMessagePlural'
  | 'noAudioInputFound'
  | 'timerOption_10_seconds'
  | 'noteToSelf'
  | 'failedToAddAsModerator'
  | 'disabledDisappearingMessages'
  | 'cannotUpdate'
  | 'device'
  | 'replyToMessage'
  | 'messageDeletedPlaceholder'
  | 'notificationFrom'
  | 'displayName'
  | 'invalidSessionId'
  | 'audioPermissionNeeded'
  | 'timestamp_h'
  | 'add'
  | 'windowMenuBringAllToFront'
  | 'messageRequests'
  | 'show'
  | 'cannotMixImageAndNonImageAttachments'
  | 'viewMenuToggleFullScreen'
  | 'optimizingApplication'
  | 'goToSupportPage'
  | 'passwordsDoNotMatch'
  | 'createClosedGroupNamePrompt'
  | 'upgrade'
  | 'audioMessageAutoplayDescription'
  | 'leaveAndRemoveForEveryone'
  | 'previewThumbnail'
  | 'photo'
  | 'setPassword'
  | 'hideMenuBarTitle'
  | 'imageCaptionIconAlt'
  | 'blockAll'
  | 'sendRecoveryPhraseTitle'
  | 'multipleJoinedTheGroup'
  | 'databaseError'
  | 'resend'
  | 'copiedToClipboard'
  | 'closedGroupInviteSuccessTitlePlural'
  | 'groupMembers'
  | 'dialogClearAllDataDeletionQuestion'
  | 'unableToLoadAttachment'
  | 'cameraPermissionNeededTitle'
  | 'editMenuRedo'
  | 'view'
  | 'changeNicknameMessage'
  | 'close'
  | 'deleteMessageQuestion'
  | 'newMessage'
  | 'windowMenuClose'
  | 'mainMenuFile'
  | 'callMissed'
  | 'getStarted'
  | 'unblockUser'
  | 'blockUser'
  | 'trustThisContactDialogTitle'
  | 'received'
  | 'privacyPolicy'
  | 'setPasswordFail'
  | 'clearNickname'
  | 'connectToServerSuccess'
  | 'viewMenuZoomIn'
  | 'invalidOpenGroupUrl'
  | 'entireAccount'
  | 'noContactsToAdd'
  | 'cancel'
  | 'decline'
  | 'originalMessageNotFound'
  | 'autoUpdateRestartButtonLabel'
  | 'deleteConversationConfirmation'
  | 'unreadMessage'
  | 'timerOption_6_hours_abbreviated'
  | 'timerOption_1_week_abbreviated'
  | 'timerSetTo'
  | 'unbanUserConfirm'
  | 'notificationSubtitle'
  | 'youChangedTheTimer'
  | 'updatedTheGroup'
  | 'leaveGroup'
  | 'menuReportIssue'
  | 'continueYourSession'
  | 'invalidGroupNameTooShort'
  | 'notificationForConvo'
  | 'noNameOrMessage'
  | 'pinConversationLimitTitle'
  | 'noSearchResults'
  | 'changeNickname'
  | 'userUnbanned'
  | 'error'
  | 'clearAllData'
  | 'contactAvatarAlt'
  | 'disappearingMessages'
  | 'autoUpdateNewVersionTitle'
  | 'linkPreviewDescription'
  | 'timerOption_1_day'
  | 'contactsHeader'
  | 'openGroupInvitation'
  | 'callMissedCausePermission'
  | 'messageFoundButNotLoaded'
  | 'mediaPermissionsDescription'
  | 'media'
  | 'noMembersInThisGroup'
  | 'saveLogToDesktop'
  | 'copyErrorAndQuit'
  | 'speech'
  | 'onlyAdminCanRemoveMembers'
  | 'passwordTypeError'
  | 'createClosedGroupPlaceholder'
  | 'editProfileModalTitle'
  | 'noCameraFound'
  | 'setAccountPasswordTitle'
  | 'callMediaPermissionsDescription'
  | 'recoveryPhraseSecureTitle'
  | 'yesterday'
  | 'closedGroupInviteSuccessMessage'
  | 'youDisabledDisappearingMessages'
  | 'updateGroupDialogTitle'
  | 'surveyTitle'
  | 'userRemovedFromModerators'
  | 'timerOption_5_seconds'
  | 'failedToRemoveFromModerator'
  | 'conversationsHeader'
  | 'setPasswordToastDescription'
  | 'audio'
  | 'startInTrayTitle'
  | 'cannotRemoveCreatorFromGroup'
  | 'editMenuCut'
  | 'markAllAsRead'
  | 'failedResolveOns'
  | 'showDebugLog'
  | 'autoUpdateDownloadButtonLabel'
  | 'dialogClearAllDataDeletionFailedTitleQuestion'
  | 'autoUpdateDownloadInstructions'
  | 'dialogClearAllDataDeletionFailedTitle'
  | 'loading'
  | 'blockedSettingsTitle'
  | 'checkNetworkConnection'
  | 'appMenuHide'
  | 'removeAccountPasswordTitle'
  | 'recoveryPhraseEmpty'
  | 'noAudioOutputFound'
  | 'save'
  | 'privacySettingsTitle'
  | 'changeAccountPasswordDescription'
  | 'notificationSettingsDialog'
  | 'invalidOldPassword'
  | 'audioMessageAutoplayTitle'
  | 'removePasswordInvalid'
  | 'password'
  | 'usersCanShareTheir...'
  | 'timestampFormat_M'
  | 'banUserAndDeleteAllConfirm'
  | 'nicknamePlaceholder'
  | 'linkPreviewsTitle'
  | 'continue'
  | 'learnMore'
  | 'successUnlinked'
  | 'autoUpdateSettingTitle'
  | 'deleteForEveryone'
  | 'createSessionID'
  | 'multipleLeftTheGroup'
  | 'enterSessionIDOrONSName'
  | 'quoteThumbnailAlt'
  | 'timerOption_1_week'
  | 'deleteContactConfirmation'
  | 'timerOption_30_seconds'
  | 'createAccount'
  | 'timerOption_1_minute_abbreviated'
  | 'dangerousFileType'
  | 'timerOption_12_hours'
  | 'unblockToSend'
  | 'timerOption_1_minute'
  | 'yourSessionID'
  | 'deleteAccountWarning'
  | 'deleted'
  | 'closedGroupMaxSize'
  | 'messagesHeader'
  | 'passwordCharacterError'
  | 'joinOpenGroup'
  | 'callMediaPermissionsDialogContent'
  | 'timerOption_1_day_abbreviated'
  | 'about'
  | 'ok'
  | 'multipleKickedFromTheGroup'
  | 'recoveryPhraseSavePromptMain'
  | 'editMenuPaste'
  | 'areYouSureDeleteDeviceOnly'
  | 'or'
  | 'removeModerators'
  | 'destination'
  | 'invalidGroupNameTooLong'
  | 'youLeftTheGroup'
  | 'theyChangedTheTimer'
  | 'userBanned'
  | 'addACaption'
  | 'debugLogError'
  | 'timerOption_5_seconds_abbreviated'
  | 'removeFromModerators'
  | 'enterRecoveryPhrase'
  | 'submit'
  | 'stagedImageAttachment'
  | 'thisWeek'
  | 'savedTheFile'
  | 'mediaEmptyState'
  | 'linkVisitWarningTitle'
  | 'invalidPassword'
  | 'endCall'
  | 'latestUnreadIsAbove'
  | 'connectingToServer'
  | 'notifications'
  | 'settingsHeader'
  | 'autoUpdateNewVersionMessage'
  | 'oneNonImageAtATimeToast'
  | 'menuCall'
  | 'attemptingReconnection'
  | 'removePasswordTitle'
  | 'iAmSure'
  | 'selectMessage'
  | 'enterAnOpenGroupURL'
  | 'delete'
  | 'changePasswordInvalid'
  | 'unblockGroupToSend'
  | 'general'
  | 'timerOption_6_hours'
  | 'confirmPassword'
  | 'downloadAttachment'
  | 'showUserDetails'
  | 'titleIsNow'
  | 'removePasswordToastDescription'
  | 'recoveryPhrase'
  | 'newMessages'
  | 'you'
  | 'documentsEmptyState'
  | 'unbanUser'
  | 'permissionSettingsTitle'
  | 'notificationForConvo_mentions_only'
  | 'trustThisContactDialogDescription'
  | 'unknownCountry'
  | 'searchFor...'
  | 'joinedTheGroup'
  | 'editGroupName'
  | 'reportIssue'
  | 'trimDatabaseDescription'
  | 'trimDatabase';
