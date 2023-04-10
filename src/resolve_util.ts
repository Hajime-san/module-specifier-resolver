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

type ModuleSpecifierReturnType<T extends HasModuleSpecifierNode> = T extends
  ts.ImportDeclaration ? string : string | undefined;

export const getModuleSpecifier = <T extends HasModuleSpecifierNode>(args: {
  node: T;
  imports: ReturnType<typeof resolvedModules>;
}): {
  moduleSpecifier: ModuleSpecifierReturnType<T>;
} => {
  const { node, imports } = args;
  let moduleSpecifier: ModuleSpecifierReturnType<T>;
  if (node.moduleSpecifier && isTokenObject(node.moduleSpecifier)) {
    const _moduleSpecifier = node.moduleSpecifier;
    moduleSpecifier = imports.find((v) =>
      v.original === _moduleSpecifier.text
    )?.resolved ??
      _moduleSpecifier.text;
  }
  return {
    // @ts-ignore Variable 'X' is used before being assigned. deno-ts(2454)
    moduleSpecifier,
  };
};

export const getExpressionArguments = (args: {
  node: ts.CallExpression;
  imports: ReturnType<typeof resolvedModules>;
}): {
  expressionArguments: Array<string>;
} => {
  const { node, imports } = args;
  const expressionArguments = node.arguments.map((argument) => {
    if (isTokenObject(argument)) {
      return imports.find((v) => v.original === argument.text)?.resolved ??
        argument.text;
    }
  }).filter((v) => typeof v !== 'undefined') as Array<string>;

  return {
    expressionArguments,
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
