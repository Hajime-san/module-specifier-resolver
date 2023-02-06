import { path } from './dev_deps.ts';

export const getLCS = (a: string, b: string): string => {
  return a.length === 0 || b.startsWith(a) ? a : getLCS(a.slice(0, -1), b);
};

export const relativeFilePath = (from: string, to: string): string => {
  const _from = path.parse(from);
  const _to = path.parse(to);
  const fromStrArray = _from.dir.split('/').filter((v) => v !== '');
  const toStrArray = _to.dir.split('/').filter((v) => v !== '');
  const base = path.join(path.relative(_from.dir, _to.dir), _to.base);
  const fromCurrentDir = './' + base;

  if (fromStrArray.length === toStrArray.length) {
    // /usr/local
    const commonStr = getLCS(_from.dir, _to.dir);
    const commonStrL = commonStr.split('/').filter((v) => v !== '').length;
    // /usr/local/bin/**/*.ts
    const fromNextDirNameOfCommon = fromStrArray[commonStrL];
    // /usr/local/conf/**/*.ts
    const toNextDirNameOfCommon = toStrArray[commonStrL];
    if (fromNextDirNameOfCommon !== toNextDirNameOfCommon) {
      // to is different root of sub directory
      return base;
    } else {
      // to is same directory
      return fromCurrentDir;
    }
  }

  // to is same root of sub directory
  if (fromStrArray.length < toStrArray.length) {
    return fromCurrentDir;
  }
  // to is parent directory
  if (fromStrArray.length > toStrArray.length) {
    return base;
  }
  return base;
};
