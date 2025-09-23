export const normVat = (s?: string) => (s ?? '').toUpperCase().replace(/\s|-/g, '');
export const isLikelyVat = (s?: string) => /[A-Z0-9]{8,}/i.test(s ?? '');
