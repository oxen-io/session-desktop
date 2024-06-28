import React, { useState } from 'react';

import useUpdate from 'react-use/lib/useUpdate';
import styled from 'styled-components';
import { useSet } from '../../hooks/useSet';
import { ToastUtils } from '../../session/utils';
import { TrustedWebsitesController } from '../../util';
import { SessionButton, SessionButtonColor } from '../basic/SessionButton';
import { SpacerLG } from '../basic/Text';
import { SessionIconButton } from '../icon';
import { SettingsTitleAndDescription } from './SessionSettingListItem';
import { TrustedWebsiteListItem } from '../TrustedWebsiteListItem';

const TrustedEntriesContainer = styled.div`
  flex-shrink: 1;
  overflow: auto;
  min-height: 40px;
  max-height: 100%;
`;

const TrustedEntriesRoundedContainer = styled.div`
  overflow: hidden;
  background: var(--background-secondary-color);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: var(--margins-lg);
  margin: 0 var(--margins-lg);
`;

const TrustedWebsitesSection = styled.div`
  flex-shrink: 0;

  display: flex;
  flex-direction: column;
  min-height: 80px;

  background: var(--settings-tab-background-color);
  color: var(--settings-tab-text-color);
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);

  margin-bottom: var(--margins-lg);
`;

const TrustedWebsitesListTitle = styled.div`
  display: flex;
  justify-content: space-between;
  min-height: 45px;
  align-items: center;
`;

const TrustedWebsitesListTitleButtons = styled.div`
  display: flex;
  align-items: center;
`;

export const StyledTrustedSettingItem = styled.div<{ clickable: boolean }>`
  font-size: var(--font-size-md);
  padding: var(--margins-lg);

  cursor: ${props => (props.clickable ? 'pointer' : 'unset')};
`;

const TrustedEntries = (props: {
  trustedHostnames: Array<string>;
  selectedHostnames: Array<string>;
  addToSelected: (id: string) => void;
  removeFromSelected: (id: string) => void;
}) => {
  const { addToSelected, trustedHostnames, removeFromSelected, selectedHostnames } = props;
  return (
    <TrustedEntriesRoundedContainer>
      <TrustedEntriesContainer>
        {trustedHostnames.map(trustedEntry => {
          return (
            <TrustedWebsiteListItem
              hostname={trustedEntry}
              isSelected={selectedHostnames.includes(trustedEntry)}
              key={trustedEntry}
              onSelect={addToSelected}
              onUnselect={removeFromSelected}
            />
          );
        })}
      </TrustedEntriesContainer>
    </TrustedEntriesRoundedContainer>
  );
};

export const TrustedWebsitesList = () => {
  const [expanded, setExpanded] = useState(false);
  const {
    uniqueValues: selectedHostnames,
    addTo: addToSelected,
    removeFrom: removeFromSelected,
    empty: emptySelected,
  } = useSet<string>([]);

  const forceUpdate = useUpdate();

  const hasAtLeastOneSelected = Boolean(selectedHostnames.length);
  const trustedWebsites = TrustedWebsitesController.getTrustedWebsites();
  const noTrustedWebsites = !trustedWebsites.length;

  function toggleTrustedWebsitesList() {
    if (trustedWebsites.length) {
      setExpanded(!expanded);
    }
  }

  async function removeTrustedWebsites() {
    if (selectedHostnames.length) {
      await TrustedWebsitesController.removeFromTrusted(selectedHostnames);
      emptySelected();
      ToastUtils.pushToastSuccess('removed', window.i18n('removed'));
      forceUpdate();
    }
  }

  return (
    <TrustedWebsitesSection>
      <StyledTrustedSettingItem clickable={!noTrustedWebsites}>
        <TrustedWebsitesListTitle onClick={toggleTrustedWebsitesList}>
          <SettingsTitleAndDescription
            title={window.i18n('trustedWebsites')}
            description={window.i18n('trustedWebsitesDescription')}
          />
          {noTrustedWebsites ? (
            <NoTrustedWebsites />
          ) : (
            <TrustedWebsitesListTitleButtons>
              {hasAtLeastOneSelected && expanded ? (
                <SessionButton
                  buttonColor={SessionButtonColor.Danger}
                  text={window.i18n('remove')}
                  onClick={removeTrustedWebsites}
                />
              ) : null}
              <SpacerLG />
              <SessionIconButton
                iconSize={'large'}
                iconType={'chevron'}
                onClick={toggleTrustedWebsitesList}
                iconRotation={expanded ? 180 : 0}
              />
            </TrustedWebsitesListTitleButtons>
          )}
        </TrustedWebsitesListTitle>
      </StyledTrustedSettingItem>
      {expanded && !noTrustedWebsites ? (
        <>
          <TrustedEntries
            trustedHostnames={trustedWebsites}
            selectedHostnames={selectedHostnames}
            addToSelected={addToSelected}
            removeFromSelected={removeFromSelected}
          />
          <SpacerLG />
        </>
      ) : null}
    </TrustedWebsitesSection>
  );
};

const NoTrustedWebsites = () => {
  return <div>{window.i18n('noTrustedWebsitesEntries')}</div>;
};
