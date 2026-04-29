import crypto from 'crypto';

export const stringUtil = {
  slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  },

  randomString(length: number = 6): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  },
};
