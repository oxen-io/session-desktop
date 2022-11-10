import React, { useState } from 'react';

import { isImageTypeSupported, isVideoTypeSupported } from '../../../util/GoogleChrome';
import { useEncryptedFileFetch } from '../../../hooks/useEncryptedFileFetch';
import { showLightBox } from '../../../state/ducks/conversations';
import { useDisableDrag } from '../../../hooks/useDisableDrag';
import { LightBoxOptions } from '../SessionConversation';
import { MediaItemType } from '../../lightbox/LightboxGallery';
import styled from 'styled-components';

type Props = {
  mediaItem: MediaItemType;
  mediaItems: Array<MediaItemType>;
};

const GridItem = styled.button`
  height: 94px;
  width: 94px;
  cursor: pointer;
  background-color: var(--message-link-preview-background-color);
  margin-inline-end: 4px;
  margin-bottom: 4px;
  position: relative;
`;

const Icon = styled.div`
  position: absolute;
  top: 15px;
  bottom: 15px;
  left: 15px;
  right: 15px;
  background-color: var(--button-icon-stroke-color);
  -webkit-mask-size: 100%;
`;

const StyledIconImage = styled(Icon)`
  -webkit-mask: url(images/image.svg) no-repeat center;
`;

const StyledIconVideo = styled(Icon)`
  -webkit-mask: url(images/movie.svg) no-repeat center;
`;

const StyledIconGeneric = styled(Icon)`
  -webkit-mask: url(images/file.svg) no-repeat center;
`;

const StyledItemImage = styled.img`
  height: 94px;
  width: 94px;
  object-fit: cover;
`;

const ImageContainer = styled.div`
  object-fit: cover;
  position: relative;
`;

const CircleOverlay = styled.div`
  position: absolute;
  left: 50%;
  top: 50%;

  transform: translate(-50%, -50%);

  width: 42px;
  height: 42px;
  background-color: var(--chat-buttons-background-color);
  border-radius: 21px;

  &:hover {
    background-color: var(--chat-buttons-background-hover-color);
  }
`;

const PlayOverlay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);

  height: 36px;
  width: 36px;
  background-color: var(--chat-buttons-icon-color);
  -webkit-mask-size: 100%;
  -webkit-mask: url(images/play.svg) no-repeat center;
`;

const MediaGridItemContent = (props: Props) => {
  const { mediaItem } = props;
  const i18n = window.i18n;
  const { attachment, contentType } = mediaItem;

  const urlToDecrypt = mediaItem.thumbnailObjectUrl || '';
  const [imageBroken, setImageBroken] = useState(false);

  const { loading, urlToLoad } = useEncryptedFileFetch(urlToDecrypt, contentType, false);

  // data will be url if loading is finished and '' if not
  const srcData = !loading ? urlToLoad : '';
  const disableDrag = useDisableDrag();

  const onImageError = () => {
    // tslint:disable-next-line no-console
    window.log.info('MediaGridItem: Image failed to load; failing over to placeholder');
    setImageBroken(true);
  };

  if (!attachment) {
    return null;
  }

  if (contentType && isImageTypeSupported(contentType)) {
    if (imageBroken || !srcData) {
      return <StyledIconImage />;
    }

    return (
      <StyledItemImage
        alt={i18n('lightboxImageAlt')}
        src={srcData}
        onError={onImageError}
        onDragStart={disableDrag}
      />
    );
  } else if (contentType && isVideoTypeSupported(contentType)) {
    if (imageBroken || !srcData) {
      return <StyledIconVideo />;
    }

    return (
      <ImageContainer>
        <StyledItemImage
          alt={i18n('lightboxImageAlt')}
          src={srcData}
          onError={onImageError}
          onDragStart={disableDrag}
        />
        <CircleOverlay>
          <PlayOverlay />
        </CircleOverlay>
      </ImageContainer>
    );
  }

  return <StyledIconGeneric />;
};

export const MediaGridItem = (props: Props) => {
  return (
    <GridItem
      onClick={() => {
        const lightBoxOptions: LightBoxOptions = {
          media: props.mediaItems,
          attachment: props.mediaItem.attachment,
        };

        window.inboxStore?.dispatch(showLightBox(lightBoxOptions));
      }}
    >
      <MediaGridItemContent {...props} />
    </GridItem>
  );
};
