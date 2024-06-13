import { clone, noop } from 'lodash';
import React from 'react';
import styled from 'styled-components';

import { Flex } from './Flex';

import { useConversationsUsernameWithQuoteOrShortPk } from '../../hooks/useParamSelector';
import { SessionIcon, SessionIconType } from '../icon';
import { SessionHtmlRenderer } from './SessionHTMLRenderer';

// NOTE We don't change the color strip on the left based on the type. 16/09/2022
export enum SessionToastType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
}

type Props = {
  description: string;

  id?: string;
  type?: SessionToastType;
  icon?: SessionIconType;
  closeToast?: any;
  onToastClick?: () => void;
};

const DescriptionDiv = styled.div`
  font-size: var(--font-size-sm);
  color: var(--text-secondary-color);
  text-overflow: ellipsis;
  font-family: var(--font-default);
  padding-top: var(--margins-xs);
`;

const IconDiv = styled.div`
  flex-shrink: 0;
  padding-inline-end: var(--margins-xs);
  margin: 0 var(--margins-sm) 0 var(--margins-xs);
`;

function useReplacePkInTextWithNames(description: string) {
  const pubkeysToLookup = [...description.matchAll(/0[3,5][0-9a-fA-F]{64}/g)] || [];
  const memberNames = useConversationsUsernameWithQuoteOrShortPk(pubkeysToLookup.map(m => m[0]));

  let replacedWithNames = clone(description);
  for (let index = 0; index < memberNames.length; index++) {
    const name = memberNames[index];
    const pk = pubkeysToLookup[index][0];
    replacedWithNames = replacedWithNames.replace(pk, name);
  }

  return replacedWithNames;
}

function DescriptionPubkeysReplaced({ description }: { description: string }) {
  const replacedWithNames = useReplacePkInTextWithNames(description);
  return (
    <DescriptionDiv>
      <SessionHtmlRenderer html={replacedWithNames} />
    </DescriptionDiv>
  );
}

export const SessionToast = (props: Props) => {
  const { description, type, icon } = props;

  const toastDesc = description || '';
  const toastIconSize = toastDesc ? 'huge' : 'medium';

  // Set a custom icon or allow the theme to define the icon
  let toastIcon = icon || undefined;
  if (!toastIcon) {
    switch (type) {
      case SessionToastType.Info:
        toastIcon = 'info';
        break;
      case SessionToastType.Success:
        toastIcon = 'check';
        break;
      case SessionToastType.Error:
        toastIcon = 'error';
        break;
      case SessionToastType.Warning:
        toastIcon = 'warning';
        break;
      default:
        toastIcon = 'info';
    }
  }

  const onToastClick = props?.onToastClick || noop;

  return (
    <Flex
      container={true}
      alignItems="center"
      onClick={onToastClick}
      data-testid="session-toast"
      padding="var(--margins-sm) 0"
    >
      <IconDiv>
        <SessionIcon iconType={toastIcon} iconSize={toastIconSize} />
      </IconDiv>
      <Flex
        container={true}
        justifyContent="flex-start"
        flexDirection="column"
        className="session-toast"
      >
        <DescriptionPubkeysReplaced description={toastDesc} />
      </Flex>
    </Flex>
  );
};
