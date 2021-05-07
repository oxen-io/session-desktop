import * as crypto from 'crypto';
import { Attachment } from '../../types/Attachment';

import {
  AttachmentPointer,
  Preview,
  Quote,
  QuotedAttachment,
} from '../messages/outgoing/visibleMessage/VisibleMessage';
import { OpenGroup } from '../../opengroup/opengroupV1/OpenGroup';
import { FSv2 } from '../../fileserver';
import { addAttachmentPadding } from '../crypto/BufferPadding';

interface UploadParams {
  attachment: Attachment;
  isRaw?: boolean;
  shouldPad?: boolean;
}

interface RawPreview {
  url: string;
  title?: string;
  image: Attachment;
}

interface RawQuoteAttachment {
  contentType?: string;
  fileName?: string;
  thumbnail?: Attachment;
}

interface RawQuote {
  id?: number;
  author?: string;
  text?: string;
  attachments?: Array<RawQuoteAttachment>;
}

// tslint:disable-next-line: no-unnecessary-class
export class AttachmentUtils {
  private constructor() {}

  public static async uploadToFileServer(params: UploadParams): Promise<AttachmentPointer> {
    const { attachment, isRaw = false, shouldPad = false } = params;
    if (typeof attachment !== 'object' || attachment == null) {
      throw new Error('Invalid attachment passed.');
    }

    if (!(attachment.data instanceof ArrayBuffer)) {
      throw new TypeError(
        `\`attachment.data\` must be an \`ArrayBuffer\`; got: ${typeof attachment.data}`
      );
    }

    let attachmentData: ArrayBuffer;

    let key = new Uint8Array();
    let digest = new Uint8Array();
    // We don't pad attachments for opengroup as they are unencrypted
    if (isRaw) {
      attachmentData = attachment.data;
    } else {
      key = new Uint8Array(crypto.randomBytes(64));
      const iv = new Uint8Array(crypto.randomBytes(16));

      const dataToEncrypt =
        !shouldPad || !window.lokiFeatureFlags.padOutgoingAttachments
          ? attachment.data
          : addAttachmentPadding(attachment.data);
      const data = await window.textsecure.crypto.encryptAttachment(
        dataToEncrypt,
        key.buffer,
        iv.buffer
      );
      digest = new Uint8Array(data.digest);
      attachmentData = data.ciphertext;
    }

    // use file server v2
    const uploadToV2Result = await FSv2.uploadFileToFsV2(attachmentData);
    if (uploadToV2Result) {
      const pointer: AttachmentPointer = {
        contentType: attachment.contentType || undefined,
        size: attachment.size,
        fileName: attachment.fileName,
        flags: attachment.flags,
        caption: attachment.caption,
        id: uploadToV2Result.fileId,
        url: uploadToV2Result.fileUrl,
      };
      if (key.length) {
        pointer.key = key;
      }
      if (digest.length) {
        pointer.digest = digest;
      }
      return pointer;
    }
    throw new Error('upload to file server v2 failed.');
  }

  public static async uploadAvatar(
    attachment?: Attachment
  ): Promise<AttachmentPointer | undefined> {
    if (!attachment) {
      return undefined;
    }

    // isRaw is true since the data is already encrypted
    // and doesn't need to be encrypted again
    return this.uploadToFileServer({
      attachment,
      isRaw: true,
    });
  }

  public static async uploadAttachments(
    attachments: Array<Attachment>
  ): Promise<Array<AttachmentPointer>> {
    const promises = (attachments || []).map(async attachment =>
      this.uploadToFileServer({
        attachment,
        shouldPad: true,
      })
    );

    return Promise.all(promises);
  }

  public static async uploadLinkPreviews(previews: Array<RawPreview>): Promise<Array<Preview>> {
    const promises = (previews || []).map(async item => {
      // some links does not have an image associated, and it makes the whole message fail to send
      if (!item.image) {
        return item;
      }
      return {
        ...item,
        image: await this.uploadToFileServer({
          attachment: item.image,
        }),
      };
    });
    return Promise.all(promises);
  }

  public static async uploadQuoteThumbnails(
    quote?: RawQuote,
    openGroup?: OpenGroup
  ): Promise<Quote | undefined> {
    if (!quote) {
      return undefined;
    }

    const promises = (quote.attachments ?? []).map(async attachment => {
      let thumbnail: AttachmentPointer | undefined;
      if (attachment.thumbnail) {
        thumbnail = await this.uploadToFileServer({
          attachment: attachment.thumbnail,
          openGroup,
        });
      }
      return {
        ...attachment,
        thumbnail,
      } as QuotedAttachment;
    });

    const attachments = await Promise.all(promises);

    return {
      ...quote,
      attachments,
    };
  }
}
