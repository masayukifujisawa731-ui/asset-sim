function fixedLocale(value: number, digits: number): string {
  return value.toLocaleString('ja-JP', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatMan(value: number, digits = 0, okuDigits = 1): string {
  if (Math.abs(value) >= 10000) {
    return fixedLocale(value / 10000, okuDigits) + '億';
  }
  return fixedLocale(value, digits) + '万';
}

export function formatYen(value: number): string {
  return value.toLocaleString('ja-JP') + '円';
}

export function formatPct(value: number, digits = 1): string {
  return (value * 100).toFixed(digits) + '%';
}

export function formatManRound(value: number): string {
  return Math.round(value).toLocaleString('ja-JP') + '万円';
}
