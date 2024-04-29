import React from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { SessionIconButton } from '../icon';

const StyledActionsPanelItem = styled.div`
  position: relative;
  padding: 30px 20px;
  
  & > * {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 32px;
    height: 32px;
  }

  & button {
    position: absolute;
    padding: 0 !important;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
  }
`;

const StyledButtonContainer = styled.div`
  
`

const StyledProgressPie = styled.span<{ progressPercentage: number, insetPercentage: number }>`
  position: absolute;
  display: block;
  border-radius: 50%;
  background-image: conic-gradient(white 0% ${props => props.progressPercentage}%, transparent 0% 0%);
  position: relative;
  mask:
    radial-gradient(farthest-side, #000 calc(100% - 0.5px), #0000) center / ${props => props.insetPercentage}% ${props => props.insetPercentage}% no-repeat,
    linear-gradient(#000 0 0);
  mask-composite: destination-out;
`

const StyledTooltip = styled.div<{
  visible: boolean;
  top: number;
  left: number;
}>`
  position: absolute;
  top: min(${props => props.top}px, calc(100% - 29px));
  left: min(${props => props.left}px, calc(100% - 200px));
  transform: translateY(-50%);
  background-color: var(--right-panel-item-background-color);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  opacity: ${props => (props.visible ? 1 : 0)};
  transition: opacity 0.2s;
  color: var(--text-primary-color);
  padding: 4px 14px;
  border-radius: 99px;
  width: max-width;
  font-weight: 400;
  text-size: 14px;

  &:after {
    content: '';
    position: absolute;
    left: -7px;
    width: 10px;
    height: 10px;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-right: 8px solid var(--right-panel-item-background-color);
    top: 50%;
    transform: translateY(-50%);
  }
`

export const UpdateStatus = () => {
  const [tooltip, setTooltip] = React.useState<{ visible: boolean, top: number, left: number }>({ visible: false, top: 0, left: 0 })
  const [progress] = React.useState(1)
  const readyToUpdate = progress === 1

  const progressPercentageNormalized = React.useMemo(() => Math.floor(progress * 100), [progress])

  const handlePointerOver = React.useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const { top, left, width, height } = e.currentTarget.getBoundingClientRect()
    setTooltip({ 
      visible: true, 
      top: top + height / 2,
      left: left + width + 10,
    })
  }, [])

  const handlePointerOut = React.useCallback(() => {
    setTooltip({ visible: false, top: tooltip.top, left: tooltip.left })
  }, [tooltip])

  return (
    <StyledActionsPanelItem>
      <StyledProgressPie 
        progressPercentage={progress * 100} 
        insetPercentage={80} 
      />
      <StyledButtonContainer
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {readyToUpdate ? (
          <SessionIconButton
            iconSize='small'
            iconType='save'
          />
        ) : (
          <SessionIconButton
            iconSize='small'
            iconType='close'
          />
        )}
      </StyledButtonContainer>
      {ReactDOM.createPortal(
        <StyledTooltip 
          visible={tooltip.visible} 
          top={tooltip.top} 
          left={tooltip.left}
        >
          {readyToUpdate
            ? window.i18n('updateDownloadedRestart')
            : window.i18n('updateDownloadProgress', [String(progressPercentageNormalized)]) 
          }
        </StyledTooltip>,
        document.body.querySelector('#root') as Element
      )}
    </StyledActionsPanelItem>
  );
}