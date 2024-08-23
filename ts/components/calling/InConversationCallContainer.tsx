import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import useInterval from 'react-use/lib/useInterval';
import styled from 'styled-components';
import { CallManager, UserUtils } from '../../session/utils';
import {
  getCallIsInFullScreen,
  getCallWithFocusedConvoIsOffering,
  getCallWithFocusedConvosIsConnected,
  getCallWithFocusedConvosIsConnecting,
  getHasOngoingCallWithFocusedConvo,
  getHasOngoingCallWithPubkey,
} from '../../state/selectors/call';
import { Avatar, AvatarSize } from '../avatar/Avatar';
import { StyledVideoElement } from './DraggableCallContainer';

import { useModuloWithTripleDots } from '../../hooks/useModuloWithTripleDots';
import { useVideoCallEventsListener } from '../../hooks/useVideoEventListener';
import { DEVICE_DISABLED_DEVICE_ID } from '../../session/utils/calling/CallManager';
import { CallWindowControls } from './CallButtons';

import { useFormattedDuration } from '../../hooks/useFormattedDuration';
import { SessionSpinner } from '../loading';

const VideoContainer = styled.div`
  height: 100%;
  width: 50%;
  z-index: 0;
  padding-top: 30px; // leave some space at the top for the connecting/duration of the current call
`;

const InConvoCallWindow = styled.div`
  padding: 1rem;
  display: flex;

  background-color: var(--in-call-container-background-color);

  flex-shrink: 1;
  min-height: 80px;
  align-items: center;
  flex-grow: 1;
`;

const RelativeCallWindow = styled.div`
  position: relative;
  height: 100%;
  display: flex;
  flex-grow: 1;
`;

const CenteredAvatarInConversation = styled.div`
  top: -50%;
  transform: translateY(-50%);
  position: relative;
  bottom: 0;
  left: 0;
  right: 50%;

  display: flex;
  justify-content: center;
  align-items: center;
`;

const StyledCenteredLabel = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  height: min-content;
  white-space: nowrap;
  color: var(--in-call-container-text-color);
  z-index: 5;
`;

const RingingLabel = () => {
  const ongoingCallWithFocusedIsRinging = useSelector(getCallWithFocusedConvoIsOffering);

  const modulatedStr = useModuloWithTripleDots(window.i18n('callsRinging'), 3, 1000);
  if (!ongoingCallWithFocusedIsRinging) {
    return null;
  }
  return <StyledCenteredLabel>{modulatedStr}</StyledCenteredLabel>;
};

const ConnectingLabel = () => {
  const ongoingCallWithFocusedIsConnecting = useSelector(getCallWithFocusedConvosIsConnecting);

  const modulatedStr = useModuloWithTripleDots(window.i18n('callsConnecting'), 3, 1000);

  if (!ongoingCallWithFocusedIsConnecting) {
    return null;
  }

  return <StyledCenteredLabel>{modulatedStr}</StyledCenteredLabel>;
};

const DurationLabel = () => {
  const [callDurationSeconds, setCallDuration] = useState<number>(0);
  const ongoingCallWithFocusedIsConnected = useSelector(getCallWithFocusedConvosIsConnected);

  useInterval(() => {
    const duration = CallManager.getCurrentCallDuration();
    if (duration) {
      setCallDuration(duration);
    }
  }, 100);
  const dateString = useFormattedDuration(callDurationSeconds, { forceHours: true });

  if (!ongoingCallWithFocusedIsConnected || !callDurationSeconds || callDurationSeconds < 0) {
    return null;
  }

  return <StyledCenteredLabel>{dateString}</StyledCenteredLabel>;
};

const StyledSpinner = styled.div<{ fullWidth: boolean }>`
  height: 100%;
  width: ${props => (props.fullWidth ? '100%' : '50%')};
  display: flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  z-index: -1;
`;

export const VideoLoadingSpinner = (props: { fullWidth: boolean }) => {
  return (
    <StyledSpinner fullWidth={props.fullWidth}>
      <SessionSpinner loading={true} />
    </StyledSpinner>
  );
};

export const InConversationCallContainer = () => {
  const isInFullScreen = useSelector(getCallIsInFullScreen);

  const ongoingCallPubkey = useSelector(getHasOngoingCallWithPubkey);
  const ongoingCallWithFocused = useSelector(getHasOngoingCallWithFocusedConvo);
  const videoRefRemote = useRef<HTMLVideoElement>(null);
  const videoRefLocal = useRef<HTMLVideoElement>(null);

  const ourPubkey = UserUtils.getOurPubKeyStrFromCache();

  const {
    currentConnectedAudioInputs,
    currentConnectedCameras,
    currentConnectedAudioOutputs,
    currentSelectedAudioOutput,
    localStream,
    localStreamVideoIsMuted,
    remoteStream,
    remoteStreamVideoIsMuted,
    isAudioMuted,
    isAudioOutputMuted,
  } = useVideoCallEventsListener('InConversationCallContainer', true);

  if (videoRefRemote?.current && videoRefLocal?.current) {
    if (videoRefRemote.current.srcObject !== remoteStream) {
      videoRefRemote.current.srcObject = remoteStream;
    }

    if (videoRefLocal.current.srcObject !== localStream) {
      videoRefLocal.current.srcObject = localStream;
    }

    if (videoRefRemote.current) {
      if (currentSelectedAudioOutput === DEVICE_DISABLED_DEVICE_ID) {
        videoRefRemote.current.muted = true;
      } else {
        void (videoRefRemote.current as any)?.setSinkId(currentSelectedAudioOutput);
        videoRefRemote.current.muted = false;
      }
    }
  }

  if (isInFullScreen && videoRefRemote.current) {
    // disable this video element so the one in fullscreen is the only one playing audio
    videoRefRemote.current.muted = true;
  }

  if (!ongoingCallWithFocused || !ongoingCallPubkey) {
    return null;
  }

  return (
    <InConvoCallWindow>
      <RelativeCallWindow>
        <RingingLabel />
        <ConnectingLabel />
        <DurationLabel />
        <VideoContainer>
          <VideoLoadingSpinner fullWidth={false} />
          <StyledVideoElement
            ref={videoRefRemote}
            autoPlay={true}
            isVideoMuted={remoteStreamVideoIsMuted}
          />
          {remoteStreamVideoIsMuted && (
            <CenteredAvatarInConversation>
              <Avatar size={AvatarSize.XL} pubkey={ongoingCallPubkey} />
            </CenteredAvatarInConversation>
          )}
        </VideoContainer>
        <VideoContainer>
          <StyledVideoElement
            ref={videoRefLocal}
            autoPlay={true}
            muted={true}
            isVideoMuted={localStreamVideoIsMuted}
          />
          {localStreamVideoIsMuted && (
            <CenteredAvatarInConversation>
              <Avatar size={AvatarSize.XL} pubkey={ourPubkey} />
            </CenteredAvatarInConversation>
          )}
        </VideoContainer>

        <CallWindowControls
          currentConnectedAudioInputs={currentConnectedAudioInputs}
          currentConnectedCameras={currentConnectedCameras}
          isAudioMuted={isAudioMuted}
          currentConnectedAudioOutputs={currentConnectedAudioOutputs}
          isAudioOutputMuted={isAudioOutputMuted}
          localStreamVideoIsMuted={localStreamVideoIsMuted}
          remoteStreamVideoIsMuted={remoteStreamVideoIsMuted}
          isFullScreen={false}
        />
      </RelativeCallWindow>
    </InConvoCallWindow>
  );
};
