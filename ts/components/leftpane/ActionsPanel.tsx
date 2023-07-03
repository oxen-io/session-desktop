import React, { useCallback, useEffect, useState } from 'react';
import { getConversationController } from '../../session/conversations';
import { syncConfigurationIfNeeded } from '../../session/utils/sync/syncUtils';

import { useDispatch, useSelector } from 'react-redux';
import { Data } from '../../data/data';
import { getMessageQueue } from '../../session/sending';
// tslint:disable: no-submodule-imports
import useInterval from 'react-use/lib/useInterval';
import useTimeoutFn from 'react-use/lib/useTimeoutFn';

import { clearSearch } from '../../state/ducks/search';
import { resetOverlayMode, SectionType, showLeftPaneSection } from '../../state/ducks/section';
import {
  getGlobalUnreadMessageCount,
  getOurPrimaryConversation,
} from '../../state/selectors/conversations';
import { getFocusedSection } from '../../state/selectors/section';
import { getOurNumber } from '../../state/selectors/user';

import { cleanUpOldDecryptedMedias } from '../../session/crypto/DecryptedAttachmentsManager';

import { DURATION } from '../../session/constants';

import { debounce, isEmpty, isString } from 'lodash';
import { uploadOurAvatar } from '../../interactions/conversationInteractions';
import {
  editProfileModal,
  markAllAsReadModal,
  onionPathModal,
} from '../../state/ducks/modalDialog';

// tslint:disable-next-line: no-import-side-effect no-submodule-imports

import { ipcRenderer } from 'electron';
import { loadDefaultRooms } from '../../session/apis/open_group_api/opengroupV2/ApiUtil';
import { getOpenGroupManager } from '../../session/apis/open_group_api/opengroupV2/OpenGroupManagerV2';
import { getSwarmPollingInstance } from '../../session/apis/snode_api';
import { UserUtils } from '../../session/utils';
import { Avatar, AvatarSize } from '../avatar/Avatar';
import { ActionPanelOnionStatusLight } from '../dialog/OnionStatusPathDialog';
import { SessionIconButton } from '../icon';
import { LeftPaneSectionContainer } from './LeftPaneSectionContainer';

import { SettingsKey } from '../../data/settings-key';
import { getLatestReleaseFromFileServer } from '../../session/apis/file_server_api/FileServerApi';
import {
  forceRefreshRandomSnodePool,
  getFreshSwarmFor,
} from '../../session/apis/snode_api/snodePool';
import { isDarkTheme } from '../../state/selectors/theme';
import { ThemeStateType } from '../../themes/constants/colors';
import { switchThemeTo } from '../../themes/switchTheme';
import { animation, contextMenu, Item, Menu } from 'react-contexify';
import { SessionContextMenuContainer } from '../SessionContextMenuContainer';

type SharedSectionProps = { isSelected: boolean };

const useSelectSection = ({ type }: { type: SectionType }) => {
  const dispatch = useDispatch();

  return () => {
    dispatch(clearSearch());
    dispatch(showLeftPaneSection(type));
    dispatch(resetOverlayMode());
  };
};

const contextMenuMessageSectionId = 'contextmenu-message-section';

const MessageSection = ({ isSelected }: SharedSectionProps) => {
  const globalUnreadMessageCount = useSelector(getGlobalUnreadMessageCount);
  const selectSection = useSelectSection({ type: SectionType.Message });

  const onRightClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    contextMenu.show({
      id: contextMenuMessageSectionId,
      event: e,
    });
  };

  return (
    <SessionIconButton
      iconSize="medium"
      dataTestId="message-section"
      iconType={'chatBubble'}
      notificationCount={globalUnreadMessageCount}
      onClick={selectSection}
      onContextMenuClick={onRightClick}
      isSelected={isSelected}
    />
  );
};

const PathIndicatorSection = () => {
  const dispatch = useDispatch();
  return (
    <ActionPanelOnionStatusLight
      dataTestId="onion-status-section"
      handleClick={() => {
        // Show Path Indicator Modal
        dispatch(onionPathModal({}));
      }}
      id={'onion-path-indicator-led-id'}
    />
  );
};

const SettingsSection = ({ isSelected }: SharedSectionProps) => {
  const selectSection = useSelectSection({ type: SectionType.Settings });
  return (
    <SessionIconButton
      iconSize="medium"
      dataTestId="settings-section"
      iconType={'gear'}
      onClick={selectSection}
      isSelected={isSelected}
    />
  );
};

const ThemeSwitcher = () => {
  const isDarkMode = useSelector(isDarkTheme);
  const dispatch = useDispatch();

  const switchTheme = useCallback(async () => {
    const currentTheme = String(window.Events.getThemeSetting());
    const newTheme = (isDarkMode
      ? currentTheme.replace('dark', 'light')
      : currentTheme.replace('light', 'dark')) as ThemeStateType;

    // We want to persist the primary color when using the color mode button
    await switchThemeTo({
      theme: newTheme,
      mainWindow: true,
      usePrimaryColor: true,
      dispatch,
    });
  }, [isDarkMode, dispatch]);

  return (
    <SessionIconButton
      iconSize="medium"
      iconType={isDarkMode ? 'moon' : 'sun'}
      dataTestId="theme-section"
      onClick={switchTheme}
      isSelected={false}
    />
  );
};

const ProfileSection = () => {
  const ourNumber = useSelector(getOurNumber);
  const dispatch = useDispatch();

  return (
    <Avatar
      size={AvatarSize.XS}
      onAvatarClick={() => {
        dispatch(editProfileModal({}));
      }}
      pubkey={ourNumber}
      dataTestId="leftpane-primary-avatar"
    />
  );
};

const cleanUpMediasInterval = DURATION.MINUTES * 60;

// every 1 minute we fetch from the fileserver to check for a new release
// * if there is none, no request to github are made.
// * if there is a version on the fileserver more recent than our current, we fetch github to get the UpdateInfos and trigger an update as usual (asking user via dialog)
const fetchReleaseFromFileServerInterval = 1000 * 60; // try to fetch the latest release from the fileserver every minute

const setupTheme = async () => {
  const theme = window.Events.getThemeSetting();
  // We don't want to reset the primary color on startup
  await switchThemeTo({
    theme,
    mainWindow: true,
    usePrimaryColor: true,
    dispatch: window?.inboxStore?.dispatch || undefined,
  });
};

// Do this only if we created a new Session ID, or if we already received the initial configuration message
const triggerSyncIfNeeded = async () => {
  const us = UserUtils.getOurPubKeyStrFromCache();
  await getConversationController()
    .get(us)
    .setDidApproveMe(true, true);
  await getConversationController()
    .get(us)
    .setIsApproved(true, true);
  const didWeHandleAConfigurationMessageAlready =
    (await Data.getItemById(SettingsKey.hasSyncedInitialConfigurationItem))?.value || false;
  if (didWeHandleAConfigurationMessageAlready) {
    await syncConfigurationIfNeeded();
  }
};

const triggerAvatarReUploadIfNeeded = async () => {
  const lastTimeStampAvatarUpload =
    (await Data.getItemById(SettingsKey.lastAvatarUploadTimestamp))?.value || 0;

  if (Date.now() - lastTimeStampAvatarUpload > DURATION.DAYS * 14) {
    window.log.info('Reuploading avatar...');
    // reupload the avatar
    await uploadOurAvatar();
  }
};

/**
 * This function is called only once: on app startup with a logged in user
 */
const doAppStartUp = async () => {
  void setupTheme();
  // this generates the key to encrypt attachments locally
  await Data.generateAttachmentKeyIfEmpty();

  // trigger a sync message if needed for our other devices
  void triggerSyncIfNeeded();
  void getSwarmPollingInstance().start();
  void loadDefaultRooms();
  void getFreshSwarmFor(UserUtils.getOurPubKeyStrFromCache()); // refresh our swarm on start to speed up the first message fetching event

  // TODOLATER make this a job of the JobRunner
  debounce(triggerAvatarReUploadIfNeeded, 200);

  /* Postpone a little bit of the polling of sogs messages to let the swarm messages come in first. */
  global.setTimeout(() => {
    void getOpenGroupManager().startPolling();
  }, 10000);

  global.setTimeout(() => {
    // init the messageQueue. In the constructor, we add all not send messages
    // this call does nothing except calling the constructor, which will continue sending message in the pipeline
    void getMessageQueue().processAllPending();
  }, 3000);
};

async function fetchReleaseFromFSAndUpdateMain() {
  try {
    window.log.info('[updater] about to fetchReleaseFromFSAndUpdateMain');

    const latest = await getLatestReleaseFromFileServer();
    window.log.info('[updater] fetched latest release from fileserver: ', latest);

    if (isString(latest) && !isEmpty(latest)) {
      ipcRenderer.send('set-release-from-file-server', latest);
      window.readyForUpdates();
    }
  } catch (e) {
    window.log.warn(e);
  }
}

/**
 * ActionsPanel is the far left banner (not the left pane).
 * The panel with buttons to switch between the message/contact/settings/theme views
 */
export const ActionsPanel = () => {
  const [startCleanUpMedia, setStartCleanUpMedia] = useState(false);
  const ourPrimaryConversation = useSelector(getOurPrimaryConversation);
  const focusedSection = useSelector(getFocusedSection);
  const dispatch = useDispatch();

  // this maxi useEffect is called only once: when the component is mounted.
  // For the action panel, it means this is called only one per app start/with a user loggedin
  useEffect(() => {
    void doAppStartUp();
  }, []);

  // wait for cleanUpMediasInterval and then start cleaning up medias
  // this would be way easier to just be able to not trigger a call with the setInterval
  useEffect(() => {
    const timeout = setTimeout(() => {
      setStartCleanUpMedia(true);
    }, cleanUpMediasInterval);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  useInterval(cleanUpOldDecryptedMedias, startCleanUpMedia ? cleanUpMediasInterval : null);

  useInterval(() => {
    void fetchReleaseFromFSAndUpdateMain();
  }, fetchReleaseFromFileServerInterval);

  if (!ourPrimaryConversation) {
    window?.log?.warn('ActionsPanel: ourPrimaryConversation is not set');
    return null;
  }

  useInterval(() => {
    void syncConfigurationIfNeeded();
  }, DURATION.DAYS * 2);

  useInterval(() => {
    // trigger an updates from the snodes every hour

    void forceRefreshRandomSnodePool();
  }, DURATION.HOURS * 1);

  useTimeoutFn(() => {
    // trigger an updates from the snodes after 5 minutes, once
    void forceRefreshRandomSnodePool();
  }, DURATION.MINUTES * 5);

  useInterval(() => {
    // this won't be run every days, but if the app stays open for more than 10 days
    void triggerAvatarReUploadIfNeeded();
  }, DURATION.DAYS * 1);

  const onContextMenuShown = () => {
    window.contextMenuShown = true;
  };

  const onContextMenuHidden = useCallback(() => {
    // This function will called before the click event
    // on the message would trigger (and I was unable to
    // prevent propagation in this case), so use a short timeout
    setTimeout(() => {
      window.contextMenuShown = false;
    }, 100);
  }, []);

  return (
    <>
      <LeftPaneSectionContainer data-testid="leftpane-section-container">
        <ProfileSection />
        <MessageSection isSelected={focusedSection === SectionType.Message} />
        <SettingsSection isSelected={focusedSection === SectionType.Settings} />
        <PathIndicatorSection />
        <ThemeSwitcher />
        <SessionContextMenuContainer>
          <Menu
            id={contextMenuMessageSectionId}
            onShown={onContextMenuShown}
            onHidden={onContextMenuHidden}
            animation={animation.fade}
          >
            <Item
              onClick={() => {
                dispatch(markAllAsReadModal({}));
              }}
            >
              Mark all conversation as read
            </Item>
          </Menu>
        </SessionContextMenuContainer>
      </LeftPaneSectionContainer>
    </>
  );
};
