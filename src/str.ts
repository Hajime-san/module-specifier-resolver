import { fs, ts } from './deps.ts';

// https://github.com/miyaoka/vue-composition-converter/pull/9
export const hasUnicodeStr = (str: string): boolean => {
  return /\\u.{4}/gi.test(str);
};

/**
 * Keep Unicode string to prevent escape.
 * @param str
 * @returns
 */
export const unescapeUnicodeStr = (str: string): string => {
  return unescape(str.replace(/\\u/g, '%u'));
};

export const NEW_LINE = '\n//_PRESERVE_NEWLINE_//\n';

/**
 * Keep newline to be filled with `NEW_LINE` text before transform AST.
 * @param str
 * @returns
 */
export const preserveNewLine = (str: string): string => {
  return str.replace(/(\r|\n)\n/g, NEW_LINE);
};

/**
 * Restore newline string from reserved word `NEW_LINE`.
 * @param str
 * @returns
 */
export const restoreNewLine = (str: string): string => {
  return str
    // with newline
    .replace(/\/\/_PRESERVE_NEWLINE_\/\/\n/g, fs.EOL)
    // without newline
    .replace(/\/\/_PRESERVE_NEWLINE_\/\//g, '');
};
