import styled from 'styled-components';
import { nativeEmojiData } from '../../util/emoji';

const StyledEmoji = styled.span`
  font-size: 36px;
  margin-left: 8px;
`;

export const supportedCustomTags = ['emoji'] as const;

export type CustomTag = (typeof supportedCustomTags)[number];

/**
 * A dictionary of custom tags and their rendering functions.
 */
export const customTag = {
  emoji: ({ emoji }: { emoji: string }) => (
    <StyledEmoji role={'img'} aria-label={nativeEmojiData?.ariaLabels?.[emoji]}>
      {emoji}
    </StyledEmoji>
  ),
} as const;

export type CustomTagProps<Tag extends CustomTag> = Parameters<(typeof customTag)[Tag]>[0];

/**
 * Render a custom tag with its props.
 *
 * @param tag - The custom tag to render.
 * @param tagProps - The props to pass to the custom tag.
 */
export const SessionCustomTagRenderer = <Tag extends CustomTag>({
  tag,
  tagProps,
}: {
  tag: Tag;
  tagProps: CustomTagProps<Tag>;
}) => {
  return customTag[tag](tagProps);
};
