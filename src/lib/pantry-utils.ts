export const EXPIRING_SOON_DAYS = 3;

export function isExpiringSoon(expiryDate: string | null | undefined): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const cutoff = new Date(Date.now() + EXPIRING_SOON_DAYS * 86400000);
  return expiry <= cutoff;
}

export function isLowStock(
  quantity: number,
  lowStockThreshold: number | null | undefined
): boolean {
  if (lowStockThreshold == null) return false;
  return quantity <= lowStockThreshold;
}
