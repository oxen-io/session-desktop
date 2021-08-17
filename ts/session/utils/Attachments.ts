import * as crypto from 'crypto';

import {
  AttachmentPointer,
  AttachmentPointerWithUrl,
  AttachmentPointerWithUrlAndLocalPath,
  PreviewWithAttachmentUrl,
  Quote,
  QuotedAttachmentWithUrl,
} from '../messages/outgoing/visibleMessage/VisibleMessage';
import { FSv2 } from '../../fileserver';
import { addAttachmentPadding } from '../crypto/BufferPadding';
import _ from 'lodash';
import { StagedAttachmentType } from '../../components/session/conversation/SessionCompositionBox';
import { SignalService } from '../../protobuf';

interface UploadParams {
  attachment: StagedAttachmentType;
  isAvatar?: boolean;
  isRaw?: boolean;
  shouldPad?: boolean;
}

export interface StagedPreview {
  url: string;
  title?: string;
  image: StagedAttachmentType;
}

interface StagedQuoteAttachment {
  contentType?: string;
  fileName?: string;
  thumbnail?: StagedAttachmentType;
}

export interface StagedQuote {
  id: number;
  author: string;
  text?: string;
  attachments?: Array<StagedQuoteAttachment>;
}

// tslint:disable-next-line: no-unnecessary-class
export class AttachmentFsV2Utils {
  public static async uploadToFsV2(
    params: UploadParams
  ): Promise<AttachmentPointerWithUrlAndLocalPath> {
    const { attachment, isRaw = false, shouldPad = false } = params;
    if (typeof attachment !== 'object' || attachment == null) {
      throw new Error('Invalid attachment passed.');
    }

    if (!(attachment as any).objectUrl) {
      throw new TypeError('objectUrl must be set;');
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

    let attachmentData: ArrayBuffer;

    if (isRaw) {
      attachmentData = data;
    } else {
      pointer.key = new Uint8Array(crypto.randomBytes(64));
      const iv = new Uint8Array(crypto.randomBytes(16));

      const dataToEncrypt =
        !shouldPad || !window.lokiFeatureFlags.padOutgoingAttachments
          ? data
          : addAttachmentPadding(data);
      const encryptedData = await window.textsecure.crypto.encryptAttachment(
        dataToEncrypt,
        pointer.key.buffer,
        iv.buffer
      );
      pointer.digest = new Uint8Array(encryptedData.digest);
      attachmentData = encryptedData.ciphertext;
    }

    const uploadToV2Result = await FSv2.uploadFileToFsV2(attachmentData);
    if (uploadToV2Result) {
      const upgradedAttachment = await window.Signal.Migrations.processNewAttachment({
        isRaw: true,
        data,
        url: uploadToV2Result.fileUrl,
      });
      const pointerWithUrl: AttachmentPointerWithUrlAndLocalPath = {
        ...pointer,
        id: uploadToV2Result.fileId,
        url: uploadToV2Result.fileUrl,
        path: upgradedAttachment.path,
      };
      return pointerWithUrl;
    }
    window?.log?.warn('upload to file server v2 failed');
    throw new Error(`upload to file server v2 of ${attachment.fileName} failed`);
  }

  public static async uploadAttachmentsToFsV2(
    attachments: Array<StagedAttachmentType>
  ): Promise<Array<AttachmentPointerWithUrl>> {
    const promises = (attachments || []).map(async attachment =>
      this.uploadToFsV2({
        attachment,
        shouldPad: true,
      })
    );

    return Promise.all(promises);
  }

  public static async uploadLinkPreviewsToFsV2(
    previews: Array<StagedPreview>
  ): Promise<Array<PreviewWithAttachmentUrl>> {
    const promises = (previews || []).map(async preview => {
      // some links does not have an image associated, and it makes the whole message fail to send
      if (!preview.image.objectUrl) {
        throw new Error('AUDRIC FIXME');
      }
      if (!preview.image) {
        window.log.warn('tried to upload file to fsv2 without image.. skipping');
        return undefined;
      }
      const image = await this.uploadToFsV2({
        attachment: preview.image,
      });
      return {
        ...preview,
        image,
      };
    });
    return _.compact(await Promise.all(promises));
  }

  public static async uploadQuoteThumbnailsToFsV2(quote?: StagedQuote): Promise<Quote | undefined> {
    if (!quote) {
      return undefined;
    }

    const promises = (quote.attachments ?? []).map(async attachment => {
      let thumbnail: AttachmentPointer | undefined;
      if (attachment.thumbnail) {
        thumbnail = await this.uploadToFsV2({
          attachment: attachment.thumbnail,
        });
      }
      if (!thumbnail) {
        window.log.info('Failed to get thumbnail after quote upload to fsv2');
        return attachment as QuotedAttachmentWithUrl;
      }
      return {
        ...attachment,
        thumbnail,
        url: thumbnail.url,
        id: thumbnail.id,
      } as QuotedAttachmentWithUrl;
    });

    const attachments = _.compact(await Promise.all(promises));

    return {
      ...quote,
      attachments,
    };
  }
}
