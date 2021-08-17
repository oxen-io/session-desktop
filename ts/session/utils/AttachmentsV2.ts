import { OpenGroupRequestCommonType } from '../../opengroup/opengroupV2/ApiUtil';
import {
  AttachmentPointer,
  AttachmentPointerWithUrl,
  PreviewWithAttachmentUrl,
  Quote,
  QuotedAttachment,
} from '../messages/outgoing/visibleMessage/VisibleMessage';
import { uploadFileOpenGroupV2 } from '../../opengroup/opengroupV2/OpenGroupAPIV2';
import { addAttachmentPadding } from '../crypto/BufferPadding';
import { StagedPreview, StagedQuote } from './Attachments';
import _ from 'lodash';
import { StagedAttachmentType } from '../../components/session/conversation/SessionCompositionBox';
import { SignalService } from '../../protobuf';

interface UploadParamsV2 {
  stagedAttachment: StagedAttachmentType;
  openGroup: OpenGroupRequestCommonType;
}

export async function uploadV2(params: UploadParamsV2): Promise<AttachmentPointerWithUrl> {
  const { stagedAttachment: attachment, openGroup } = params;
  if (typeof attachment !== 'object' || attachment == null) {
    throw new Error('Invalid attachment passed.');
  }

  if (!attachment.objectUrl) {
    throw new TypeError('attachment.objectURl must be set');
  }

  const fetched = await fetch(attachment.objectUrl);
  const blob = await fetched.blob();
  const data = await blob.arrayBuffer();

  const pointer: AttachmentPointer = {
    contentType: attachment.contentType || undefined,
    size: attachment.size,
    fileName: attachment.fileName,
    flags: attachment.isVoiceMessage ? SignalService.AttachmentPointer.Flags.VOICE_MESSAGE : 0,
    caption: attachment.caption,
  };

  const paddedAttachment: ArrayBuffer =
    window.lokiFeatureFlags.padOutgoingAttachments && !openGroup
      ? addAttachmentPadding(data)
      : data;

  const fileDetails = await uploadFileOpenGroupV2(new Uint8Array(paddedAttachment), openGroup);

  if (!fileDetails) {
    throw new Error(`upload to fileopengroupv2 of ${attachment.fileName} failed`);
  }

  return {
    ...pointer,
    id: fileDetails.fileId,
    url: fileDetails.fileUrl,
  };
}

export async function uploadAttachmentsV2(
  stagedAttachments: Array<StagedAttachmentType>,
  openGroup: OpenGroupRequestCommonType
): Promise<Array<AttachmentPointerWithUrl>> {
  const promises = (stagedAttachments || []).map(async attachment =>
    exports.uploadV2({
      attachment,
      openGroup,
    })
  );

  return Promise.all(promises);
}

export async function uploadLinkPreviewsV2(
  previews: Array<StagedPreview>,
  openGroup: OpenGroupRequestCommonType
): Promise<Array<PreviewWithAttachmentUrl>> {
  const promises = (previews || []).map(async preview => {
    // some links does not have an image associated, and it makes the whole message fail to send
    if (!preview.image) {
      window.log.warn('tried to upload file to opengroupv2 without image.. skipping');

      return undefined;
    }
    const image = await exports.uploadV2({
      attachment: preview.image,
      openGroup,
    });
    return {
      ...preview,
      image,
      url: preview.url || (image.url as string),
      id: image.id as number,
    };
  });
  return _.compact(await Promise.all(promises));
}

export async function uploadQuoteThumbnailsV2(
  openGroup: OpenGroupRequestCommonType,
  quote?: StagedQuote
): Promise<Quote | undefined> {
  if (!quote) {
    return undefined;
  }

  const promises = (quote.attachments ?? []).map(async attachment => {
    let thumbnail: QuotedAttachment | undefined;
    if (attachment.thumbnail) {
      thumbnail = await exports.uploadV2({
        attachment: attachment.thumbnail,
        openGroup,
      });
    }
    return {
      ...attachment,
      thumbnail,
    };
  });

  const attachments = await Promise.all(promises);

  return {
    ...quote,
    attachments,
  };
}
