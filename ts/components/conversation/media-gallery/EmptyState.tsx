/**
 * @prettier
 */
import React from 'react';

interface Props {
  label: string;
}

export const EmptyState = (props: Props) => {
  const { label } = props;

  return <div className="module-empty-state">{label}</div>;
};
