import React, { useEffect, useRef } from 'react';
// tslint:disable-next-line: no-submodule-imports
import useMountedState from 'react-use/lib/useMountedState';
import styled from 'styled-components';
import { CallManager } from '../../session/utils';
import { SessionButton } from './SessionButton';

// similar styling to modal header
const CallWindowHeader = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-self: center;

  padding: $session-margin-lg;

  font-family: $session-font-default;
  text-align: center;
  line-height: 18px;
  font-size: $session-font-md;
  font-weight: 700;
`;

const VideoContainer = styled.div`
  width: 100%;
  height: 100%;
`;

const VideoContainerRemote = styled.video`
  height: 100%;
  width: 100%;
`;
const VideoContainerLocal = styled.video`
  max-height: 45%;
  max-width: 45%;
  position: absolute;
  bottom: 0;
  right: 0;
`;

const CallWindowInner = styled.div`
  text-align: center;
  flex-grow: 1;
  position: relative;
`;

const CallWindowControls = styled.div`
  padding: 5px;
`;

export const CallContainerView = () => {
  // const ongoingCallProps = useSelector(getHasOngoingCallWith);
  // const hasOngoingCall = useSelector(getHasOngoingCall);

  const ongoingOrIncomingPubkey = ''; // ongoingCallProps?.id || incomingCallProps?.id;
  const videoRefRemote = useRef<any>();
  const videoRefLocal = useRef<any>();
  const mountedState = useMountedState();

  useEffect(() => {
    CallManager.setVideoEventsListener(
      (localStream: MediaStream | null, remoteStream: MediaStream | null) => {
        if (mountedState() && videoRefRemote?.current && videoRefLocal?.current) {
          videoRefLocal.current.srcObject = localStream;
          videoRefRemote.current.srcObject = remoteStream;
        }
      }
    );

    return () => {
      CallManager.setVideoEventsListener(null);
    };
  }, []);

  const handleEndCall = async () => {
    // call method to end call connection
    if (ongoingOrIncomingPubkey) {
      await CallManager.USER_rejectIncomingCallRequest(ongoingOrIncomingPubkey);
    }
  };
  return (
    <>
      <CallWindowHeader>Call with: TODO</CallWindowHeader>

      <CallWindowInner>
        <VideoContainer>
          <VideoContainerRemote ref={videoRefRemote} autoPlay={true} />
          <VideoContainerLocal ref={videoRefLocal} autoPlay={true} />
        </VideoContainer>
      </CallWindowInner>
      <CallWindowControls>
        <SessionButton text={window.i18n('endCall')} onClick={handleEndCall} />
      </CallWindowControls>
    </>
  );
};
