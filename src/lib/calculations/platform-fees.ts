export function calculatePlatformFee(
  channel: 'offline' | 'shopeefood' | 'gofood',
  grossAmount: number
): number {
  switch (channel) {
    case 'offline':
      return 0;
    case 'shopeefood':
      return grossAmount * 0.2;
    case 'gofood':
      return grossAmount * 0.25;
    default:
      return 0;
  }
}

export function calculateNetAmount(
  grossAmount: number,
  platformFee: number
): number {
  return grossAmount - platformFee;
}
