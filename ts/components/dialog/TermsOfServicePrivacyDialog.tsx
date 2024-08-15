import { shell } from 'electron';
import { useDispatch } from 'react-redux';
import { updateTermsOfServicePrivacyModal } from '../../state/onboarding/ducks/modals';
import { Flex } from '../basic/Flex';
import { SessionButton, SessionButtonType } from '../basic/SessionButton';
import { SpacerSM } from '../basic/Text';
import { SessionWrapperModal2 } from '../SessionWrapperModal2';

export type TermsOfServicePrivacyDialogProps = {
  show: boolean;
};

export function TermsOfServicePrivacyDialog(props: TermsOfServicePrivacyDialogProps) {
  const { show } = props;

  const dispatch = useDispatch();

  const onClose = () => {
    dispatch(updateTermsOfServicePrivacyModal(null));
  };

  if (!show) {
    return null;
  }

  return (
    <SessionWrapperModal2
      title={window.i18n('urlOpen')}
      onClose={onClose}
      showExitIcon={true}
      showHeader={true}
      headerReverse={true}
    >
      <span>{window.i18n('urlOpenBrowser')}</span>
      <SpacerSM />
      <Flex
        container={true}
        flexDirection="column"
        width={'100%'}
        justifyContent="center"
        alignItems="center"
      >
        <SessionButton
          ariaLabel={'Terms of service button'}
          text={window.i18n('termsOfService')}
          buttonType={SessionButtonType.Ghost}
          onClick={() => {
            void shell.openExternal('https://getsession.org/terms-of-service');
          }}
          dataTestId="terms-of-service-button"
        />
        <SessionButton
          ariaLabel={'Privacy policy button'}
          text={window.i18n('privacyPolicy')}
          buttonType={SessionButtonType.Ghost}
          onClick={() => {
            void shell.openExternal('https://getsession.org/privacy-policy');
          }}
          dataTestId="privacy-policy-button"
        />
        <p>
          Quis deserunt amet pariatur non eiusmod excepteur non irure consectetur dolor ad nulla. Ea
          eiusmod cupidatat quis qui laborum aute ipsum amet quis. Eu exercitation non ex ipsum in
          deserunt magna eu nulla velit.
        </p>

        <p>
          Eu reprehenderit amet sunt laborum nisi voluptate do qui dolor nisi in non pariatur ad.
          Est dolore ad dolor culpa id. Occaecat enim ut veniam ipsum esse nisi nisi non. Elit magna
          non nulla aute labore tempor pariatur. Exercitation excepteur qui occaecat pariatur veniam
          magna. Ullamco deserunt est ipsum commodo aliqua ex. Commodo ullamco est amet veniam
          dolore exercitation.
        </p>

        <p>
          Sint id ad elit laborum reprehenderit adipisicing et dolor ut. Non tempor amet voluptate
          do proident est aute aliquip duis nulla tempor irure consequat sit. Commodo dolore minim
          labore id pariatur culpa enim minim sunt dolore velit. Tempor occaecat occaecat ex
          excepteur tempor tempor laborum ea in quis. Quis amet culpa sit aliquip. Voluptate
          exercitation sint laborum id sunt consequat.
        </p>

        <p>
          Culpa tempor nisi elit officia velit quis tempor consectetur proident incididunt enim.
          Consequat excepteur do enim id elit. Sit occaecat minim eu amet sint consectetur aliqua.
          Reprehenderit id consectetur incididunt ad ad velit laboris irure aliquip dolor. Fugiat
          elit pariatur laboris anim aliqua aliqua cillum id ullamco enim sit cillum.
        </p>
      </Flex>
    </SessionWrapperModal2>
  );
}
