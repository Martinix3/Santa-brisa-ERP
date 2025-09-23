// Normalización básica a E.164 con default ES (+34) si viene nacional sin prefijo
export const normPhone = (p?: string, defaultCountry = '+34') => {
  if (!p) return '';
  let s = p.replace(/[^0-9+]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (!s.startsWith('+')) s = defaultCountry + s;
  return s;
};
