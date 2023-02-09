import { fs, ts } from './deps.ts';

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

const NEW_LINE = '\n/*_PRESERVE_NEWLINE_|';

/**
 * Keep newline to be filled with `NEW_LINE` text before transform AST.
 * @param str
 * @returns
 */
export const preserveNewLine = (str: string) => {
  return str.replaceAll(/(?:\r?\n)/gm, NEW_LINE);
};

/**
 * Restore newline string from reserved word `NEW_LINE`.
 * @param str
 * @returns
 */
export const restoreNewLine = (str: string, newLineConfig?: ts.NewLineKind) => {
  const newLineStr = newLineConfig
    // Prioritize tsconfig newLine option, otherwise it belongs to os.
    ? newLineConfig === ts.NewLineKind.LineFeed ? fs.EOL.CRLF : fs.EOL.LF
    : Deno.build.os === 'windows'
    ? fs.EOL.CRLF
    : fs.EOL.LF;
  return str.replaceAll(NEW_LINE, newLineStr).trimEnd() + newLineStr;
};
