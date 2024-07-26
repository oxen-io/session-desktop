import React from 'react';
import { nativeEmojiData } from '../../util/emoji';
import styled from 'styled-components';

const StyledEmoji = styled.span`
  font-size: 36px;
  margin-left: 8px;
`;

export const customTag = {
  emoji: ({ emoji }: { emoji: string }) => (
    <StyledEmoji role={'img'} aria-label={nativeEmojiData?.ariaLabels?.[emoji]}>
      {emoji}
    </StyledEmoji>
  ),
};

export const SessionCustomTagRenderer = <Tag extends keyof typeof customTag>({
  tag,
  props,
}: {
  tag: Tag;
  props: Parameters<(typeof customTag)[Tag]>[0];
}) => {
  return customTag[tag](props);
};

SessionCustomTagRenderer({ tag: 'emoji', props: { emoji: '' } });
