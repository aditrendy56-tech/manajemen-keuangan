export function calculatePlatformFee(
  channelOrPlatform: 'offline' | 'online' | 'shopeefood' | 'gofood' | string,
  grossAmount: number
): number {
  switch (channelOrPlatform) {
    case 'offline':
      return 0;
    case 'shopeefood':
      return grossAmount * 0.2;
    case 'gofood':
      return grossAmount * 0.25;
    case 'online':
      return 0;
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
