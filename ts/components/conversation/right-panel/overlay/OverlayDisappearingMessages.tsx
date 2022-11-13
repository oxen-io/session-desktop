import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { setDisappearingMessagesByConvoId } from '../../../../interactions/conversationInteractions';
import { getSelectedConversationKey } from '../../../../state/selectors/conversations';
import { getTimerOptions } from '../../../../state/selectors/timerOptions';
import { Flex } from '../../../basic/Flex';
import { SessionButton } from '../../../basic/SessionButton';
import { SpacerLG } from '../../../basic/Text';
import { PanelButtonGroup } from '../../../buttons';
import { PanelLabel } from '../../../buttons/PanelButton';
import { PanelRadioButton } from '../../../buttons/PanelRadioButton';
import { StyledScrollContainer } from '../RightPanel';
import { RightOverlayHeader } from './RightOverlayHeader';

const StyledContainer = styled(Flex)`
  width: 100%;

  .session-button {
    font-weight: 500;
    min-width: 90px;
    width: fit-content;
    margin: 35px auto 0;
  }
`;

type TimerOptionsProps = {
  options: Array<any>;
  selected: number;
  setSelected: (value: number) => void;
};

const TimeOptions = (props: TimerOptionsProps) => {
  const { options, selected, setSelected } = props;

  return (
    <>
      <PanelLabel>{window.i18n('timer')}</PanelLabel>
      <PanelButtonGroup>
        {options.map((option: any) => (
          <PanelRadioButton
            key={option.name}
            text={option.name}
            value={option.name}
            isSelected={selected === option.value}
            onSelect={() => {
              setSelected(option.value);
            }}
            disableBg={true}
          />
        ))}
      </PanelButtonGroup>
    </>
  );
};

export const OverlayDisappearingMessages = () => {
  const selectedConversationKey = useSelector(getSelectedConversationKey);
  const timerOptions = useSelector(getTimerOptions).timerOptions;

  const [timeSelected, setTimeSelected] = useState(timerOptions[0].value);

  return (
    <StyledScrollContainer>
      <StyledContainer container={true} flexDirection={'column'} alignItems={'center'}>
        <RightOverlayHeader
          title={window.i18n('disappearingMessages')}
          subtitle={window.i18n('disappearingMessagesSubtitle')}
          hideBackButton={false}
        />
        <TimeOptions options={timerOptions} selected={timeSelected} setSelected={setTimeSelected} />
        <SessionButton
          onClick={async () => {
            if (selectedConversationKey) {
              await setDisappearingMessagesByConvoId(selectedConversationKey, timeSelected);
            }
          }}
        >
          {window.i18n('set')}
        </SessionButton>
        <SpacerLG />
      </StyledContainer>
    </StyledScrollContainer>
  );
};
