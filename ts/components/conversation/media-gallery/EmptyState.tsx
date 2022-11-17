/**
 * @prettier
 */
import React from 'react';
import styled from 'styled-components';

type Props = {
  label: string;
};

const Empty = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  flex-grow: 1;
  font-size: 28px;
`;

export const EmptyState = (props: Props) => {
  const { label } = props;

  return <Empty>{label}</Empty>;
};
