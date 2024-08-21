import { isString } from 'lodash';
import type { LocalizerDictionary } from '../types/Localizer';
import { LOCALE_DEFAULTS } from '../localization/constants';

/**
 * Adds the accelerator prefix to the label for the menu item
 * @link https://www.electronjs.org/docs/latest/api/menu#static-methods
 *
 * @param label - The label for the menu item
 * @returns The label with the accelerator prefix
 */
const withAcceleratorPrefix = (label: string) => {
  return `&${label}`;
};

export const createTemplate = (
  options: {
    openReleaseNotes: () => void;
    openSupportPage: () => void;
    platform: string;
    showAbout: () => void;
    showDebugLog: () => void;
    showWindow: () => void;
  },
  messages: LocalizerDictionary
) => {
  if (!isString(options.platform)) {
    throw new TypeError('`options.platform` must be a string');
  }

  const { openReleaseNotes, openSupportPage, platform, showAbout, showDebugLog, showWindow } =
    options;

  const template = [
    {
      label: withAcceleratorPrefix(messages.file),
      submenu: [
        {
          type: 'separator',
        },
        {
          role: 'quit',
          label: messages.quit,
        },
      ],
    },
    {
      label: withAcceleratorPrefix(messages.edit),
      submenu: [
        {
          role: 'undo',
          label: messages.undo,
        },
        {
          role: 'redo',
          label: messages.redo,
        },
        {
          type: 'separator',
        },
        {
          role: 'cut',
          label: messages.cut,
        },
        {
          role: 'copy',
          label: messages.copy,
        },
        {
          role: 'paste',
          label: messages.paste,
        },
        {
          role: 'delete',
          label: messages.delete,
        },
        {
          role: 'selectall',
          label: messages.selectAll,
        },
      ],
    },
    {
      label: withAcceleratorPrefix(messages.view),
      submenu: [
        {
          role: 'resetzoom',
          label: messages.actualSize,
        },
        {
          accelerator: platform === 'darwin' ? 'Command+=' : 'Control+Plus',
          role: 'zoomin',
          label: messages.appearanceZoomIn,
        },
        {
          role: 'zoomout',
          label: messages.appearanceZoomOut,
        },
        {
          type: 'separator',
        },
        {
          role: 'togglefullscreen',
          label: messages.fullScreenToggle,
        },
        {
          type: 'separator',
        },
        {
          label: messages.debugLog,
          click: showDebugLog,
        },
        {
          type: 'separator',
        },
        {
          role: 'toggledevtools',
          label: messages.developerToolsToggle,
        },
      ],
    },
    {
      label: withAcceleratorPrefix(messages.window),
      role: 'window',
      submenu: [
        {
          role: 'minimize',
          label: messages.minimize,
        },
      ],
    },
    {
      label: withAcceleratorPrefix(messages.sessionHelp),
      role: 'help',
      submenu: [
        {
          label: messages.updateReleaseNotes,
          click: openReleaseNotes,
        },
        {
          type: 'separator',
        },
        {
          label: messages.supportGoTo,
          click: openSupportPage,
        },
        {
          type: 'separator',
        },
        {
          label: messages.about,
          click: showAbout,
        },
      ],
    },
  ];

  if (platform === 'darwin') {
    return updateForMac(template, messages, {
      showAbout,
      showWindow,
    });
  }

  return template;
};

function updateForMac(
  template: any,
  messages: LocalizerDictionary,
  options: { showAbout: () => void; showWindow: () => void }
) {
  const { showAbout, showWindow } = options;

  // Remove About item and separator from Help menu, since it's on the first menu
  template[4].submenu.pop();
  template[4].submenu.pop();

  // Remove File menu
  template.shift();

  // Add the OSX-specific Signal Desktop menu at the far left
  template.unshift({
    label: LOCALE_DEFAULTS.app_name,
    submenu: [
      {
        label: messages.about,
        click: showAbout,
      },
      {
        type: 'separator',
      },
      {
        type: 'separator',
      },
      {
        label: messages.hide,
        role: 'hide',
      },
      {
        label: messages.hideOthers,
        role: 'hideothers',
      },
      {
        label: messages.showAll,
        role: 'unhide',
      },
      {
        type: 'separator',
      },
      {
        label: messages.quit,
        role: 'quit',
      },
    ],
  });

  // Replace Window menu
  const windowMenuTemplateIndex = 3;
  // eslint-disable-next-line no-param-reassign
  template[windowMenuTemplateIndex].submenu = [
    {
      label: messages.closeWindow,
      accelerator: 'CmdOrCtrl+W',
      role: 'close',
    },
    {
      label: messages.minimize,
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize',
    },
    {
      label: messages.appearanceZoom,
      role: 'zoom',
    },
    {
      label: messages.show,
      click: showWindow,
    },
  ];

  return template;
}
