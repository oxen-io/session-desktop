export function useFormattedDuration(seconds: number, options: { forceHours: boolean }) {
  const hoursStr = `${Math.floor(seconds / 3600)}`.padStart(2, '0');
  const minutesStr = `${Math.floor((seconds % 3600) / 60)}`.padStart(2, '0');
  const secondsStr = `${Math.floor(seconds % 60)}`.padStart(2, '0');

  if (hoursStr === '00' && !options.forceHours) {
    return `${minutesStr}:${secondsStr}`;
  }
  return `${hoursStr}:${minutesStr}:${secondsStr}`;
}
