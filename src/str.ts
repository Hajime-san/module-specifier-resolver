export const hasUnicodeStr = (str: string): boolean => {
  return /\\u.{4}/gi.test(str);
};

export const unescapeUnicodeStr = (str: string): string => {
  return unescape(str.replace(/\\u/g, '%u'));
};
