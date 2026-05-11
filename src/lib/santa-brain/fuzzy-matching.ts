/**
 * @deprecated LEGACY MODULE
 * Migrar a SSOT V2+ / services/canonical. Ver docs/DEPRECATION.md
 */

// src/lib/santa-brain/fuzzy-matching.ts
import { distance } from 'fastest-levenshtein';
import type { Account } from '@/domain/ssot';

export interface FuzzyMatchResult {
  match: Account;
  score: number;
  matchType: 'exact' | 'alias' | 'starts-with' | 'contains' | 'levenshtein';
}

/**
 * Fuzzy matching ultra-robusto para cuentas
 * Tolera errores tipográficos, variaciones de nombre, y aliases
 */
export function fuzzyMatchAccount(
  searchTerm: string,
  accounts: Account[]
): FuzzyMatchResult | null {
  
  if (!searchTerm || !accounts.length) return null;
  
  const normalized = searchTerm.toLowerCase().trim();
  
  const scored = accounts.map(acc => {
    const name = acc.name.toLowerCase();
    const aliases = ((acc as any).aliases || []).map((a: string) => a.toLowerCase());
    
    let score = 0;
    let matchType: FuzzyMatchResult['matchType'] = 'levenshtein';
    
    // 1. EXACT MATCH = 100
    if (name === normalized) {
      score = 100;
      matchType = 'exact';
    }
    // 2. ALIAS EXACT MATCH = 95
    else if (aliases.includes(normalized)) {
      score = 95;
      matchType = 'alias';
    }
    // 3. STARTS WITH = 90
    else if (name.startsWith(normalized) || normalized.startsWith(name)) {
      score = 90;
      matchType = 'starts-with';
    }
    // 4. CONTAINS = 80
    else if (name.includes(normalized) || normalized.includes(name)) {
      score = 80;
      matchType = 'contains';
    }
    // 5. LEVENSHTEIN DISTANCE
    else {
      const dist = distance(name, normalized);
      const maxLen = Math.max(name.length, normalized.length);
      const similarity = 1 - (dist / maxLen);
      score = similarity * 70; // Max 70 para levenshtein puro
      matchType = 'levenshtein';
      
      // Check aliases con levenshtein
      aliases.forEach((alias: string) => {
        const aliasDist = distance(alias, normalized);
        const aliasMaxLen = Math.max(alias.length, normalized.length);
        const aliasSimilarity = 1 - (aliasDist / aliasMaxLen);
        const aliasScore = aliasSimilarity * 75;
        if (aliasScore > score) {
          score = aliasScore;
          matchType = 'alias';
        }
      });
    }
    
    // 6. WORD MATCHING BONUS (+5 puntos por palabra coincidente)
    const searchWords = normalized.split(/\s+/).filter(w => w.length > 2);
    const nameWords = name.split(/\s+/).filter(w => w.length > 2);
    
    const matchingWords = searchWords.filter(sw =>
      nameWords.some(nw => {
        // Coincidencia exacta o contenida
        if (nw.includes(sw) || sw.includes(nw)) return true;
        // Coincidencia con levenshtein cercano (max 2 caracteres diff)
        if (distance(nw, sw) <= 2) return true;
        return false;
      })
    );
    
    score += matchingWords.length * 5;
    
    // Cap at 100
    score = Math.min(score, 100);
    
    return { account: acc, score, matchType };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);
  
  // Threshold: 60 (ajustable según necesidad)
  const bestMatch = scored[0];
  if (bestMatch && bestMatch.score >= 60) {
    return {
      match: bestMatch.account,
      score: bestMatch.score,
      matchType: bestMatch.matchType
    };
  }
  
  return null;
}

/**
 * Retorna múltiples matches cuando hay ambigüedad
 */
export function fuzzyMatchMultiple(
  searchTerm: string,
  accounts: Account[],
  minScore: number = 60,
  maxResults: number = 3
): FuzzyMatchResult[] {
  
  if (!searchTerm || !accounts.length) return [];
  
  const normalized = searchTerm.toLowerCase().trim();
  
  const scored = accounts.map(acc => {
    const name = acc.name.toLowerCase();
    const aliases = ((acc as any).aliases || []).map((a: string) => a.toLowerCase());
    
    let score = 0;
    let matchType: FuzzyMatchResult['matchType'] = 'levenshtein';
    
    // Misma lógica que fuzzyMatchAccount
    if (name === normalized) {
      score = 100;
      matchType = 'exact';
    } else if (aliases.includes(normalized)) {
      score = 95;
      matchType = 'alias';
    } else if (name.startsWith(normalized) || normalized.startsWith(name)) {
      score = 90;
      matchType = 'starts-with';
    } else if (name.includes(normalized) || normalized.includes(name)) {
      score = 80;
      matchType = 'contains';
    } else {
      const dist = distance(name, normalized);
      const maxLen = Math.max(name.length, normalized.length);
      const similarity = 1 - (dist / maxLen);
      score = similarity * 70;
      matchType = 'levenshtein';
      
      aliases.forEach((alias: string) => {
        const aliasDist = distance(alias, normalized);
        const aliasMaxLen = Math.max(alias.length, normalized.length);
        const aliasSimilarity = 1 - (aliasDist / aliasMaxLen);
        const aliasScore = aliasSimilarity * 75;
        if (aliasScore > score) {
          score = aliasScore;
          matchType = 'alias';
        }
      });
    }
    
    // Word matching bonus
    const searchWords = normalized.split(/\s+/).filter(w => w.length > 2);
    const nameWords = name.split(/\s+/).filter(w => w.length > 2);
    const matchingWords = searchWords.filter(sw =>
      nameWords.some(nw => 
        nw.includes(sw) || sw.includes(nw) || distance(nw, sw) <= 2
      )
    );
    score += matchingWords.length * 5;
    score = Math.min(score, 100);
    
    return { account: acc, score, matchType };
  });
  
  // Filter by min score and sort
  const filtered = scored
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
  
  return filtered.map(s => ({
    match: s.account,
    score: s.score,
    matchType: s.matchType
  }));
}

/**
 * Normaliza términos de búsqueda comunes
 */
export function normalizeSearchTerm(term: string): string {
  return term
    .toLowerCase()
    .trim()
    // Remover artículos comunes
    .replace(/^(el|la|los|las|bar|restaurante|tienda)\s+/i, '')
    // Normalizar espacios
    .replace(/\s+/g, ' ');
}
