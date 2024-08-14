import { SessionButton, SessionButtonColor } from '../../basic/SessionButton';

type Props = {
  onClick: () => void | Promise<void>;
  disabled: boolean;
};

export const ContinueButton = (props: Props) => {
  const { onClick, disabled } = props;

  return (
    <SessionButton
      ariaLabel={window.i18n('theContinue')}
      buttonColor={SessionButtonColor.White}
      onClick={onClick}
      text={window.i18n('theContinue')}
      disabled={disabled}
      dataTestId="continue-button"
    />
  );
};
