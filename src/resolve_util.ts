import { path, ts } from './deps.ts';
import { relativeFilePath } from './path.ts';

export const resolveModuleName = (args: {
  fileName: string;
  targetFileAbsPath: string;
  tsConfigObject: ts.ParsedCommandLine;
}) => {
  const { fileName, targetFileAbsPath, tsConfigObject } = args;
  return ts.resolveModuleName(
    fileName,
    targetFileAbsPath,
    {
      ...tsConfigObject.options,
      // Override module resolution to resolve module path correctly
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    ts.sys,
    undefined,
    undefined,
    ts.ModuleKind.ESNext,
  );
};

export const hasShouldResolveImportedFiles = (args: {
  importedFiles: Array<ts.FileReference>;
  targetFileAbsPath: string;
  tsConfigObject: ts.ParsedCommandLine;
}): boolean => {
  const { importedFiles, targetFileAbsPath, tsConfigObject } = args;
  // no imported files
  if (importedFiles.length === 0) return false;
  const shouldResolve = importedFiles.some(({ fileName }) => {
    const { resolvedModule } = resolveModuleName({
      fileName,
      targetFileAbsPath,
      tsConfigObject,
    });
    // is not ignore node_modules
    return !resolvedModule?.isExternalLibraryImport &&
      (resolvedModule?.resolvedFileName &&
        // filename extension is different from resolvedFileName's
        // filename: './foo' or './foo.js'
        // resolved: './foo.ts'
        (path.extname(fileName) !==
          path.extname(resolvedModule.resolvedFileName)));
  });
  if (!shouldResolve) return false;
  return true;
};

export const getResolvedStringLiteral = (args: {
  originalText: string;
  imports: ReturnType<typeof resolvedModules>;
}): string => {
  const { originalText, imports } = args;
  // trim quotes
  const formattedText = originalText.slice(1, -1);
  return imports.find((v) => v.original === formattedText)?.resolved ??
    formattedText;
};

export type ResolvedModuleImport = {
  original: string;
  resolved: string;
};

export const resolvedModules = (args: {
  importedFiles: ts.FileReference[];
  targetFileAbsPath: string;
  tsConfigObject: ts.ParsedCommandLine;
}): Array<ResolvedModuleImport> => {
  const { importedFiles, targetFileAbsPath, tsConfigObject } = args;
  return importedFiles
    .filter(({ fileName }) => {
      const { resolvedModule } = resolveModuleName({
        fileName,
        targetFileAbsPath,
        tsConfigObject,
      });
      // ignore node_modules
      return !resolvedModule?.isExternalLibraryImport &&
        // ignore falsy resolvedFileName
        resolvedModule?.resolvedFileName;
    })
    .map(({ fileName }) => {
      const { resolvedModule } = resolveModuleName({
        fileName,
        targetFileAbsPath,
        tsConfigObject,
      });
      const importLoc = resolvedModule!.resolvedFileName;
      return {
        original: fileName,
        resolved: relativeFilePath(targetFileAbsPath, importLoc),
      };
    });
};
