import React from 'react';

import classNames from 'classnames';

import {
  SendMessageType,
  SessionCompositionBox,
  StagedAttachmentType,
} from './SessionCompositionBox';

import { Constants } from '../../../session';
import _ from 'lodash';
import { AttachmentUtil, GoogleChrome } from '../../../util';
import { ConversationHeaderWithDetails } from '../../conversation/ConversationHeader';
import { SessionRightPanelWithDetails } from './SessionRightPanel';
import { SessionTheme } from '../../../state/ducks/SessionTheme';
import styled, { DefaultTheme } from 'styled-components';
import { SessionMessagesListContainer } from './SessionMessagesListContainer';
import { LightboxGallery, MediaItemType } from '../../LightboxGallery';

import { AttachmentTypeWithPath } from '../../../types/Attachment';
import { ToastUtils, UserUtils } from '../../../session/utils';
import * as MIME from '../../../types/MIME';
import { SessionFileDropzone } from './SessionFileDropzone';
import {
  quoteMessage,
  ReduxConversationType,
  resetSelectedMessageIds,
  SortedMessageModelProps,
  updateMentionsMembers,
} from '../../../state/ducks/conversations';
import { MessageView } from '../../MainViewController';
import { MessageDetail } from '../../conversation/MessageDetail';
import { getConversationController } from '../../../session/conversations';
import { getPubkeysInPublicConversation } from '../../../data/data';
import autoBind from 'auto-bind';
import { useSelector } from 'react-redux';
import {
  getFirstUnreadMessageId,
  isFirstUnreadMessageIdAbove,
} from '../../../state/selectors/conversations';

import { SessionButtonColor } from '../SessionButton';
import { updateConfirmModal } from '../../../state/ducks/modalDialog';
import { addStagedAttachmentsInConversation } from '../../../state/ducks/stagedAttachments';

interface State {
  showRecordingView: boolean;
  isDraggingFile: boolean;
}
export interface LightBoxOptions {
  media: Array<MediaItemType>;
  attachment: AttachmentTypeWithPath;
}

interface Props {
  ourNumber: string;
  selectedConversationKey: string;
  selectedConversation?: ReduxConversationType;
  theme: DefaultTheme;
  messagesProps: Array<SortedMessageModelProps>;
  selectedMessages: Array<string>;
  showMessageDetails: boolean;
  isRightPanelShowing: boolean;

  // lightbox options
  lightBoxOptions?: LightBoxOptions;
  stagedAttachments?: Array<StagedAttachmentType>;
}

const SessionUnreadAboveIndicator = styled.div`
  position: sticky;
  top: 0;
  margin: 1em;
  display: flex;
  justify-content: center;
  background: ${props => props.theme.colors.sentMessageBackground};
  color: ${props => props.theme.colors.sentMessageText};
`;

const UnreadAboveIndicator = () => {
  const isFirstUnreadAbove = useSelector(isFirstUnreadMessageIdAbove);
  const firstUnreadMessageId = useSelector(getFirstUnreadMessageId) as string;

  if (!isFirstUnreadAbove) {
    return null;
  }
  return (
    <SessionUnreadAboveIndicator key={`above-unread-indicator-${firstUnreadMessageId}`}>
      {window.i18n('latestUnreadIsAbove')}
    </SessionUnreadAboveIndicator>
  );
};

export class SessionConversation extends React.Component<Props, State> {
  private readonly messageContainerRef: React.RefObject<HTMLDivElement>;
  private dragCounter: number;
  private publicMembersRefreshTimeout?: NodeJS.Timeout;
  private readonly updateMemberList: () => any;

  constructor(props: any) {
    super(props);

    this.state = {
      showRecordingView: false,
      isDraggingFile: false,
    };
    this.messageContainerRef = React.createRef();
    this.dragCounter = 0;
    this.updateMemberList = _.debounce(this.updateMemberListBouncy.bind(this), 1000);

    autoBind(this);
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // ~~~~~~~~~~~~~~~~ LIFECYCLES ~~~~~~~~~~~~~~~~
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  public componentDidUpdate(prevProps: Props, _prevState: State) {
    const {
      selectedConversationKey: newConversationKey,
      selectedConversation: newConversation,
    } = this.props;
    const { selectedConversationKey: oldConversationKey } = prevProps;

    // if the convo is valid, and it changed, register for drag events
    if (newConversationKey && newConversation && newConversationKey !== oldConversationKey) {
      // Pause thread to wait for rendering to complete
      setTimeout(() => {
        const div = this.messageContainerRef.current;
        div?.addEventListener('dragenter', this.handleDragIn);
        div?.addEventListener('dragleave', this.handleDragOut);
        div?.addEventListener('dragover', this.handleDrag);
        div?.addEventListener('drop', this.handleDrop);
      }, 100);

      // if the conversation changed, we have to stop our refresh of member list
      if (this.publicMembersRefreshTimeout) {
        global.clearInterval(this.publicMembersRefreshTimeout);
        this.publicMembersRefreshTimeout = undefined;
      }
      // if the newConversation changed, and is public, start our refresh members list
      if (newConversation.isPublic) {
        // this is a debounced call.
        void this.updateMemberList();
        // run this only once every minute if we don't change the visible conversation.
        // this is a heavy operation (like a few thousands members can be here)
        this.publicMembersRefreshTimeout = global.setInterval(this.updateMemberList, 60000);
      }
    }
    // if we do not have a model, unregister for events
    if (!newConversation) {
      const div = this.messageContainerRef.current;
      div?.removeEventListener('dragenter', this.handleDragIn);
      div?.removeEventListener('dragleave', this.handleDragOut);
      div?.removeEventListener('dragover', this.handleDrag);
      div?.removeEventListener('drop', this.handleDrop);
      if (this.publicMembersRefreshTimeout) {
        global.clearInterval(this.publicMembersRefreshTimeout);
        this.publicMembersRefreshTimeout = undefined;
      }
    }
    if (newConversationKey !== oldConversationKey) {
      this.setState({
        showRecordingView: false,
        isDraggingFile: false,
      });
    }
  }

  public componentWillUnmount() {
    const div = this.messageContainerRef.current;
    div?.removeEventListener('dragenter', this.handleDragIn);
    div?.removeEventListener('dragleave', this.handleDragOut);
    div?.removeEventListener('dragover', this.handleDrag);
    div?.removeEventListener('drop', this.handleDrop);

    if (this.publicMembersRefreshTimeout) {
      global.clearInterval(this.publicMembersRefreshTimeout);
      this.publicMembersRefreshTimeout = undefined;
    }
  }

  public async sendMessageFn(msg: SendMessageType) {
    const { selectedConversationKey } = this.props;
    const { body } = msg;
    const conversationModel = getConversationController().get(selectedConversationKey);

    if (!conversationModel) {
      return;
    }

    const sendAndScroll = () => {
      void conversationModel.sendMessage(msg);
      window.inboxStore?.dispatch(quoteMessage(undefined));

      if (this.messageContainerRef.current) {
        (this.messageContainerRef
          .current as any).scrollTop = this.messageContainerRef.current?.scrollHeight;
      }
    };

    // const recoveryPhrase = window.textsecure.storage.get('mnemonic');
    const recoveryPhrase = UserUtils.getCurrentRecoveryPhrase();

    // string replace to fix case where pasted text contains invis characters causing false negatives
    if (body.replace(/\s/g, '').includes(recoveryPhrase.replace(/\s/g, ''))) {
      window.inboxStore?.dispatch(
        updateConfirmModal({
          title: window.i18n('sendRecoveryPhraseTitle'),
          message: window.i18n('sendRecoveryPhraseMessage'),
          okTheme: SessionButtonColor.Danger,
          onClickOk: () => {
            sendAndScroll();
          },
          onClickClose: () => {
            window.inboxStore?.dispatch(updateConfirmModal(null));
          },
        })
      );
    } else {
      sendAndScroll();
    }
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // ~~~~~~~~~~~~~~ RENDER METHODS ~~~~~~~~~~~~~~
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  public render() {
    const { showRecordingView, isDraggingFile } = this.state;

    const {
      selectedConversation,
      messagesProps,
      showMessageDetails,
      selectedMessages,
      isRightPanelShowing,
      lightBoxOptions,
    } = this.props;

    if (!selectedConversation || !messagesProps) {
      // return an empty message view
      return <MessageView />;
    }

    const selectionMode = selectedMessages.length > 0;

    return (
      <SessionTheme theme={this.props.theme}>
        <div className="conversation-header">
          <ConversationHeaderWithDetails />
        </div>
        <div
          // if you change the classname, also update it on onKeyDown
          className={classNames('conversation-content', selectionMode && 'selection-mode')}
          tabIndex={0}
          onKeyDown={this.onKeyDown}
          role="navigation"
        >
          <div className={classNames('conversation-info-panel', showMessageDetails && 'show')}>
            <MessageDetail />
          </div>

          {lightBoxOptions?.media && this.renderLightBox(lightBoxOptions)}

          <div className="conversation-messages">
            <UnreadAboveIndicator />

            <SessionMessagesListContainer messageContainerRef={this.messageContainerRef} />

            {showRecordingView && <div className="conversation-messages__blocking-overlay" />}
            {isDraggingFile && <SessionFileDropzone />}
          </div>

          <SessionCompositionBox
            sendMessage={this.sendMessageFn}
            onLoadVoiceNoteView={this.onLoadVoiceNoteView}
            onExitVoiceNoteView={this.onExitVoiceNoteView}
            onChoseAttachments={this.onChoseAttachments}
          />
        </div>
        <div
          className={classNames('conversation-item__options-pane', isRightPanelShowing && 'show')}
        >
          <SessionRightPanelWithDetails />
        </div>
      </SessionTheme>
    );
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // ~~~~~~~~~~~~ MICROPHONE METHODS ~~~~~~~~~~~~
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  private onLoadVoiceNoteView() {
    this.setState({
      showRecordingView: true,
    });
    window.inboxStore?.dispatch(resetSelectedMessageIds());
  }

  private onExitVoiceNoteView() {
    this.setState({
      showRecordingView: false,
    });
  }

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // ~~~~~~~~~~~ KEYBOARD NAVIGATION ~~~~~~~~~~~~
  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  private onKeyDown(event: any) {
    const selectionMode = !!this.props.selectedMessages.length;
    const recordingMode = this.state.showRecordingView;
    if (event.key === 'Escape') {
      // EXIT MEDIA VIEW
      if (recordingMode) {
        // EXIT RECORDING VIEW
      }
      // EXIT WHAT ELSE?
    }
    if (event.target.classList.contains('conversation-content')) {
      switch (event.key) {
        case 'Escape':
          if (selectionMode) {
            window.inboxStore?.dispatch(resetSelectedMessageIds());
          }
          break;
        default:
      }
    }
  }

  private addAttachments(newAttachments: Array<StagedAttachmentType>) {
    window.inboxStore?.dispatch(
      addStagedAttachmentsInConversation({
        conversationKey: this.props.selectedConversationKey,
        newAttachments,
      })
    );
  }

  private renderLightBox({ media, attachment }: LightBoxOptions) {
    const selectedIndex =
      media.length > 1
        ? media.findIndex(mediaMessage => mediaMessage.attachment.path === attachment.path)
        : 0;
    return <LightboxGallery media={media} selectedIndex={selectedIndex} />;
  }

  private async onChoseAttachments(attachmentsFileList: Array<File>) {
    if (!attachmentsFileList || attachmentsFileList.length === 0) {
      return;
    }

    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < attachmentsFileList.length; i++) {
      await this.maybeAddAttachment(attachmentsFileList[i]);
    }
  }

  private async addAttachmentAsVideo(file: File) {
    const { VisualAttachment } = window.Signal.Types;
    const fileName = file.name;
    const contentType = file.type;
    const objectUrlVideo = URL.createObjectURL(file);

    try {
      const type = 'image/png';

      const thumbnail = await VisualAttachment.makeVideoScreenshot({
        objectUrl: objectUrlVideo,
        contentType: type,
        logger: window.log,
      });
      const data = await VisualAttachment.blobToArrayBuffer(thumbnail);
      const url = window.Signal.Util.arrayBufferToObjectURL({
        data,
        type,
      });
      this.addAttachments([
        {
          size: file.size,
          fileName,
          contentType,
          objectUrl: objectUrlVideo,
          fullPath: file.path,
          url,
          isVoiceMessage: false,
          fileSize: null,
          screenshot: null,
          thumbnail: null,
        },
      ]);
    } catch (error) {
      window.log.warn(
        'Failed to generate screenshot from video. Just adding the video as is',
        error.message
      );
      this.addAttachments([
        {
          size: file.size,
          fileName,
          contentType,
          objectUrl: objectUrlVideo,
          url: '',
          isVoiceMessage: false,
          fileSize: null,
          screenshot: null,
          thumbnail: null,
          fullPath: file.path,
        },
      ]);
    }
  }

  private async scaleDownAttachmentBeforeAdd(file: File, contentType: string) {
    try {
      const scaledDown = await AttachmentUtil.autoScale({
        contentType,
        fileOrBlob: file,
      });

      if (scaledDown.fileOrBlob.size >= Constants.CONVERSATION.MAX_ATTACHMENT_FILESIZE_BYTES) {
        window.log.warn('scaled down file but size is still too high:', scaledDown.fileOrBlob.size);
        ToastUtils.pushFileSizeErrorAsByte(Constants.CONVERSATION.MAX_ATTACHMENT_FILESIZE_BYTES);
        return null;
      }
      return scaledDown;
    } catch (error) {
      window?.log?.error(
        'Error ensuring that image is properly sized:',
        error && error.stack ? error.stack : error
      );

      ToastUtils.pushLoadAttachmentFailure(error?.message);
      return null;
    }
  }

  private async addAttachmentAsImage(file: File) {
    const fileName = file.name;
    const contentType = file.type;

    const commonAttachmentsParams = {
      url: '',
      isVoiceMessage: false,
      fileSize: null,
      screenshot: null,
      thumbnail: null,
      fileName,
      contentType,
      fullPath: file.path,
    };
    try {
      // We only know how to reorient a jpeg
      // if not a jpeg, just try to scale down to our limit and add the attachment
      const scaledDown = await this.scaleDownAttachmentBeforeAdd(file, contentType);

      if (!scaledDown) {
        window.log.warn('Could not scale down image of type', contentType);
        throw new Error('Could not scale down image');
      }

      if (!MIME.isJPEG(contentType)) {
        // this might happen for an error while scaling down (unsupported image type?)
        // or if the scaled down images is still too big
        if (!scaledDown) {
          throw new Error('Failed to scale down image!');
        }

        const objectUrlImage = URL.createObjectURL(scaledDown);
        if (!objectUrlImage) {
          throw new Error('Failed to create object url for image!');
        }
        this.addAttachments([
          {
            size: scaledDown.fileOrBlob.size,
            objectUrl: objectUrlImage,
            ...commonAttachmentsParams,
          },
        ]);
        return;
      }

      const objectUrl = await window.autoOrientImage(scaledDown.fileOrBlob);

      this.addAttachments([
        {
          size: scaledDown.fileOrBlob.size,
          ...commonAttachmentsParams,
          objectUrl,
        },
      ]);
    } catch (e) {
      // Something happened. Add the attachment as is if the size is valid.
      window.log.warn(
        'Failed to autoOrientImage or scaling down image, just adding image as is if size if ok: ',
        e.message
      );
      if (file.size >= Constants.CONVERSATION.MAX_ATTACHMENT_FILESIZE_BYTES) {
        window.log.warn('Cannot add out of size image', file.size);
        ToastUtils.pushFileSizeErrorAsByte(Constants.CONVERSATION.MAX_ATTACHMENT_FILESIZE_BYTES);
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      this.addAttachments([
        {
          size: file.size,
          objectUrl,
          ...commonAttachmentsParams,
        },
      ]);
    }
  }

  // tslint:disable: max-func-body-length cyclomatic-complexity
  private async maybeAddAttachment(file: File) {
    if (!file) {
      return;
    }

    const fileName = file.name;
    const contentType = file.type;

    const stagedAttachments = this.props.stagedAttachments || [];

    if (window.Signal.Util.isFileDangerous(fileName)) {
      ToastUtils.pushDangerousFileError();
      return;
    }

    if (stagedAttachments.length >= 32) {
      ToastUtils.pushMaximumAttachmentsError();
      return;
    }

    const haveNonImage = _.some(
      stagedAttachments,
      attachment => !MIME.isImage(attachment.contentType)
    );
    // You can't add another attachment if you already have a non-image staged
    if (haveNonImage) {
      ToastUtils.pushMultipleNonImageError();
      return;
    }

    // You can't add a non-image attachment if you already have attachments staged
    if (!MIME.isImage(contentType) && stagedAttachments.length > 0) {
      ToastUtils.pushCannotMixError();
      return;
    }

    try {
      if (GoogleChrome.isImageTypeSupported(contentType)) {
        await this.addAttachmentAsImage(file);
        return;
      }
      if (GoogleChrome.isVideoTypeSupported(contentType)) {
        // we cannot compress a video, so if the size is too big, it will be for a snode
        if (file.size >= Constants.CONVERSATION.MAX_ATTACHMENT_FILESIZE_BYTES) {
          ToastUtils.pushFileSizeErrorAsByte(Constants.CONVERSATION.MAX_ATTACHMENT_FILESIZE_BYTES);
          return;
        }
        await this.addAttachmentAsVideo(file);
        return;
      }

      // not an image and not a video we support.
      // don't try to generate preview, just add the data as is if it's not too big
      if (file.size >= Constants.CONVERSATION.MAX_ATTACHMENT_FILESIZE_BYTES) {
        ToastUtils.pushFileSizeErrorAsByte(Constants.CONVERSATION.MAX_ATTACHMENT_FILESIZE_BYTES);
        return;
      }
      const objectUrlGeneric = URL.createObjectURL(file);
      this.addAttachments([
        {
          fullPath: file.path,
          size: file.size,
          contentType,
          fileName,
          url: '',
          isVoiceMessage: false,
          fileSize: null,
          screenshot: null,
          thumbnail: null,
          objectUrl: objectUrlGeneric,
        },
      ]);
    } catch (e) {
      window?.log?.error(
        `Was unable to generate thumbnail for file type ${contentType}`,
        e && e.stack ? e.stack : e
      );
    }
  }

  private handleDrag(e: any) {
    e.preventDefault();
    e.stopPropagation();
  }

  private handleDragIn(e: any) {
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      this.setState({ isDraggingFile: true });
    }
  }

  private handleDragOut(e: any) {
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter--;

    if (this.dragCounter === 0) {
      this.setState({ isDraggingFile: false });
    }
  }

  private handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (e?.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      void this.onChoseAttachments(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
      this.dragCounter = 0;
      this.setState({ isDraggingFile: false });
    }
  }

  private async updateMemberListBouncy() {
    const allPubKeys = await getPubkeysInPublicConversation(this.props.selectedConversationKey);

    window?.log?.info(`getPubkeysInPublicConversation returned '${allPubKeys?.length}' members`);

    const allMembers = allPubKeys.map((pubKey: string) => {
      const conv = getConversationController().get(pubKey);
      const profileName = conv?.getProfileName() || 'Anonymous';

      return {
        id: pubKey,
        authorPhoneNumber: pubKey,
        authorProfileName: profileName,
      };
    });

    window.inboxStore?.dispatch(updateMentionsMembers(allMembers));
  }
}
