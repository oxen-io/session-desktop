import { DisappearingMessageConversationModeType } from '../../../../../session/disappearing_messages/types';
import { PanelButtonGroup, PanelLabel } from '../../../../buttons/PanelButton';
import { PanelRadioButton } from '../../../../buttons/PanelRadioButton';

function loadDataTestId(mode: DisappearingMessageConversationModeType) {
  const dataTestId = 'disappear-%-option';
  switch (mode) {
    case 'legacy':
      return dataTestId.replace('%', 'legacy');
    case 'deleteAfterRead':
      return dataTestId.replace('%', 'after-read');
    case 'deleteAfterSend':
      return dataTestId.replace('%', 'after-send');
    case 'off':
    default:
      return dataTestId.replace('%', 'off');
  }
}

type DisappearingModesProps = {
  options: Record<DisappearingMessageConversationModeType, boolean>;
  selected?: DisappearingMessageConversationModeType;
  setSelected: (value: DisappearingMessageConversationModeType) => void;
  hasOnlyOneMode?: boolean;
};

export const DisappearingModes = (props: DisappearingModesProps) => {
  const { options, selected, setSelected, hasOnlyOneMode } = props;

  if (hasOnlyOneMode) {
    return null;
  }

  return (
    <>
      <PanelLabel>{window.i18n('disappearingMessagesDeleteType')}</PanelLabel>
      <PanelButtonGroup>
        {Object.keys(options).map(_mode => {
          const mode = _mode as DisappearingMessageConversationModeType;
          const optionI18n =
            mode === 'legacy'
              ? '' // TODO: to cleanup when we remove legacy entirely
              : mode === 'deleteAfterRead'
                ? window.i18n('disappearingMessagesDisappearAfterRead')
                : mode === 'deleteAfterSend'
                  ? window.i18n('disappearingMessagesDisappearAfterSend')
                  : window.i18n('off');

          const subtitleI18n =
            mode === 'legacy'
              ? '' // TODO: to cleanup when we remove legacy entirely
              : mode === 'deleteAfterRead'
                ? window.i18n('disappearingMessagesDisappearAfterReadDescription')
                : mode === 'deleteAfterSend'
                  ? window.i18n('disappearingMessagesDisappearAfterSendDescription')
                  : undefined;

          return (
            <PanelRadioButton
              key={mode}
              text={optionI18n}
              subtitle={subtitleI18n}
              value={mode}
              isSelected={selected === mode}
              onSelect={() => {
                setSelected(mode);
              }}
              disabled={options[mode]}
              dataTestId={loadDataTestId(mode)}
            />
          );
        })}
      </PanelButtonGroup>
    </>
  );
};
