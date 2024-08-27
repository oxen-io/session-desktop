import { isString } from 'lodash';
import type { SetupI18nReturnType } from '../types/Localizer';
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
    saveDebugLog: (_event: any, additionalInfo?: string) => void;
    showWindow: () => void;
  },
  i18n: SetupI18nReturnType
) => {
  if (!isString(options.platform)) {
    throw new TypeError('`options.platform` must be a string');
  }

  const { openReleaseNotes, openSupportPage, platform, showAbout, saveDebugLog, showWindow } =
    options;

  const template = [
    {
      label: withAcceleratorPrefix(i18n('file')),
      submenu: [
        {
          type: 'separator',
        },
        {
          role: 'quit',
          label: i18n('quit'),
        },
      ],
    },
    {
      label: withAcceleratorPrefix(i18n('edit')),
      submenu: [
        {
          role: 'undo',
          label: i18n('undo'),
        },
        {
          role: 'redo',
          label: i18n('redo'),
        },
        {
          type: 'separator',
        },
        {
          role: 'cut',
          label: i18n('cut'),
        },
        {
          role: 'copy',
          label: i18n('copy'),
        },
        {
          role: 'paste',
          label: i18n('paste'),
        },
        {
          role: 'delete',
          label: i18n('delete'),
        },
        {
          role: 'selectall',
          label: i18n('selectAll'),
        },
      ],
    },
    {
      label: withAcceleratorPrefix(i18n('view')),
      submenu: [
        {
          role: 'resetzoom',
          label: i18n('actualSize'),
        },
        {
          accelerator: platform === 'darwin' ? 'Command+=' : 'Control+Plus',
          role: 'zoomin',
          label: i18n('appearanceZoomIn'),
        },
        {
          role: 'zoomout',
          label: i18n('appearanceZoomOut'),
        },
        {
          type: 'separator',
        },
        {
          role: 'togglefullscreen',
          label: i18n('fullScreenToggle'),
        },
        {
          type: 'separator',
        },
        {
          label: i18n('debugLog'),
          click: () => {
            saveDebugLog('save-debug-log');
          },
        },
        {
          type: 'separator',
        },
        {
          role: 'toggledevtools',
          label: i18n('developerToolsToggle'),
        },
      ],
    },
    {
      label: withAcceleratorPrefix(i18n('window')),
      role: 'window',
      submenu: [
        {
          role: 'minimize',
          label: i18n('minimize'),
        },
      ],
    },
    {
      label: withAcceleratorPrefix(i18n('sessionHelp')),
      role: 'help',
      submenu: [
        {
          label: i18n('updateReleaseNotes'),
          click: openReleaseNotes,
        },
        {
          label: i18n('supportGoTo'),
          click: openSupportPage,
        },
        {
          type: 'separator',
        },
        {
          label: i18n('about'),
          click: showAbout,
        },
      ],
    },
  ];

  if (platform === 'darwin') {
    return updateForMac(template, i18n, {
      showAbout,
      showWindow,
    });
  }

  return template;
};

function updateForMac(
  template: any,
  i18n: SetupI18nReturnType,
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
        label: i18n('about'),
        click: showAbout,
      },
      {
        type: 'separator',
      },
      {
        type: 'separator',
      },
      {
        label: i18n('hide'),
        role: 'hide',
      },
      {
        label: i18n('hideOthers'),
        role: 'hideothers',
      },
      {
        label: i18n('showAll'),
        role: 'unhide',
      },
      {
        type: 'separator',
      },
      {
        label: i18n('quit'),
        role: 'quit',
      },
    ],
  });

  // Replace Window menu
  const windowMenuTemplateIndex = 3;
  // eslint-disable-next-line no-param-reassign
  template[windowMenuTemplateIndex].submenu = [
    {
      label: i18n('closeWindow'),
      accelerator: 'CmdOrCtrl+W',
      role: 'close',
    },
    {
      label: i18n('minimize'),
      accelerator: 'CmdOrCtrl+M',
      role: 'minimize',
    },
    {
      label: i18n('appearanceZoom'),
      role: 'zoom',
    },
    {
      label: i18n('show'),
      click: showWindow,
    },
  ];

  return template;
}
