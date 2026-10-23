import { customAlphabet } from 'nanoid';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export const newPublicId = customAlphabet(ALPHABET, 10);
export const newTagToken = customAlphabet(ALPHABET, 16);
