import { customAlphabet } from 'nanoid';

const SLUG_SUFFIX_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function slugify(input: string) {
  return input
    .replace(/Ç/g, 'c')
    .replace(/Ğ/g, 'g')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/Ö/g, 'o')
    .replace(/Ş/g, 's')
    .replace(/Ü/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export const newSlugSuffix = customAlphabet(SLUG_SUFFIX_ALPHABET, 4);
