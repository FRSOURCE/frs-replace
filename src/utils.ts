import type { Args } from './types.js';

export const writeError = (msg: string) => {
  throw new Error(`@frsource/frs-replace :: ${msg}`);
};

export const getReplaceFn = (needle: Args['needle'], replacement: string) =>
  typeof needle === 'string'
    ? (content: string) => {
        const needleLen = needle.length;
        let result = '';
        let i;
        let endIndex = 0;

        while ((i = content.indexOf(needle, endIndex)) !== -1) {
          result += content.slice(endIndex, i) + replacement;
          endIndex = i + needleLen;
        }

        return result + content.slice(endIndex, content.length);
      }
    : (content: string) => content.replace(needle, replacement);
