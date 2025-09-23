import { normName } from '@/lib/norm/text';

export const trigram = (s: string) => {
  const t: Record<string, number> = {};
  for (let i = 0; i < s.length - 2; i++) t[s.slice(i, i + 3)] = 1;
  return t;
};

export const sim = (a?: string, b?: string) => {
  const A = normName(a ?? '');
  const B = normName(b ?? '');
  if (!A || !B) return 0;
  const TA = trigram(A);
  const TB = trigram(B);
  const inter = Object.keys(TA).filter(k => TB[k]).length;
  const union = new Set([...Object.keys(TA), ...Object.keys(TB)]).size;
  return union ? inter / union : 0;
};
