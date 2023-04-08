import { path, ts } from './deps.ts';
import { relativeFilePath } from './path.ts';

type NodeLike = ts.Node | ts.Expression;

type HasModuleSpecifierNode = ts.ImportDeclaration | ts.ExportDeclaration;

type TokenObject = NodeLike & {
  text: string;
};

export const isTokenObject = (node: NodeLike): node is TokenObject => {
  // deno-lint-ignore no-prototype-builtins
  return (node as unknown as Record<string, unknown>).hasOwnProperty('text');
};

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
    // node_modules
    return (!resolvedModule?.isExternalLibraryImport &&
      // falsy resolvedFileName
      resolvedModule?.resolvedFileName) &&
      // not has extension
      path.extname(fileName) === '';
  });
  if (!shouldResolve) return false;
  return true;
};

export const getModuleSpecifier = <T extends HasModuleSpecifierNode>(args: {
  node: T;
  imports: ReturnType<typeof resolvedModules>;
}): {
  moduleSpecifier: string;
  node: T;
} => {
  const { node, imports } = args;
  let moduleSpecifier: string | undefined;
  if (node.moduleSpecifier && isTokenObject(node.moduleSpecifier)) {
    const _moduleSpecifier = node.moduleSpecifier;
    moduleSpecifier = imports.find((v) =>
      v.original === _moduleSpecifier.text
    )?.resolved ??
      _moduleSpecifier.text;
  }

  if (typeof moduleSpecifier === 'undefined') {
    throw new Error(
      'failed to get module specifier from TypeScript AST Nodes.',
    );
  }
  return {
    moduleSpecifier,
    node,
  };
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