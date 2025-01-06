/** @typedef {import("./types.mjs").Args} Args */

/** @param {string} msg */
export const writeError = (msg) => {
  throw new Error(`@frsource/frs-replace :: ${msg}`);
};

/**
 * @param {Args['needle']} needle
 * @param {string} replacement
 */
export const getReplaceFn = (needle, replacement) =>
  typeof needle === 'string'
    ? /** @param {string} content */ (content) => {
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
    : /** @param {string} content */ (content) =>
        content.replace(needle, replacement);
