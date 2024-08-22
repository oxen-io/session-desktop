export type BlockOrUnblockModalState = {
  action: 'block' | 'unblock';
  pubkeys: Array<string>;
  onConfirmed?: () => void;
} | null;
