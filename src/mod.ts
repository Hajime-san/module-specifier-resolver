import { path, ts, walk } from './dev_deps.ts';
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

const resolvedModules = (args: {
  importedFiles: ts.FileReference[];
  currentFileAbsPath: string;
  tsConfigObject: ts.ParsedCommandLine;
}): Array<{
  original: string;
  resolved: string;
}> => {
  const { importedFiles, currentFileAbsPath, tsConfigObject } = args;
  const _resolveModuleName = (fileName: string) => {
    return ts.resolveModuleName(
      fileName,
      currentFileAbsPath,
      tsConfigObject.options,
      ts.sys,
      undefined,
      undefined,
      ts.ModuleKind.ESNext,
    );
  };
  return importedFiles
    .filter(({ fileName }) => {
      const { resolvedModule } = _resolveModuleName(fileName);
      // ignore node_modules
      return !resolvedModule?.isExternalLibraryImport &&
        // ignore falsy resolvedFileName
        resolvedModule?.resolvedFileName;
    })
    .map(({ fileName }) => {
      const { resolvedModule } = _resolveModuleName(fileName);
      const importLoc = resolvedModule!.resolvedFileName;
      return {
        original: fileName,
        resolved: relativeFilePath(currentFileAbsPath, importLoc),
      };
    });
};

const resolveImportDeclarationSpecifier = (
  imports: ReturnType<typeof resolvedModules>,
) => {
  const _resolveImportDeclarationSpecifier =
    (context: ts.TransformationContext) => (rootNode: ts.Node) => {
      const visit = (node: ts.Node): ts.Node => {
        const newNode = ts.visitEachChild(node, visit, context);

        // Transform "aggregating modules"
        //
        // export { foo } from "./foo"
        // to
        // export { foo } from "./foo.(ts|tsx|d.ts)"
        if (ts.isExportDeclaration(newNode)) {
          const { moduleSpecifier, node } = getModuleSpecifier({
            node: newNode,
            imports,
          });
          return context.factory.createExportDeclaration(
            node.modifiers,
            false,
            node.exportClause,
            context.factory.createStringLiteral(moduleSpecifier),
            node.assertClause,
          );
        }
        // Transform "static import"
        //
        // import { bar } from "./bar"
        // to
        // import { bar } from "./bar.(ts|tsx|d.ts)"
        if (ts.isImportDeclaration(newNode)) {
          const { moduleSpecifier, node } = getModuleSpecifier({
            node: newNode,
            imports,
          });
          return context.factory.createImportDeclaration(
            node.modifiers,
            node.importClause,
            context.factory.createStringLiteral(moduleSpecifier),
            node.assertClause,
          );
        }
        return newNode;
      };

      return ts.visitNode(rootNode, visit);
    };

  return _resolveImportDeclarationSpecifier;
};

const transform = (args: {
  sourceFile: ts.SourceFile;
  imports: ReturnType<typeof resolvedModules>;
  tsConfigObject: ts.ParsedCommandLine;
  printer: ts.Printer;
}) => {
  const { sourceFile, imports, tsConfigObject, printer } = args;
  const transformationResult = ts.transform(sourceFile, [
    resolveImportDeclarationSpecifier(imports),
  ], tsConfigObject.options);

  return printer.printNode(
    ts.EmitHint.Unspecified,
    transformationResult.transformed[0],
    ts.createSourceFile('', '', ts.ScriptTarget.ESNext),
  );
};

const main = async (args: {
  basePath: string;
  options?: {
    tsConfigPath?: string;
  };
}) => {
  const { basePath, options } = args;
  const decoder = new TextDecoder('utf-8');
  const tsConfigJson = await Deno.readFile(options?.tsConfigPath ?? '.');
  const tsConfigObject = ts.parseJsonConfigFileContent(
    JSON.parse(decoder.decode(tsConfigJson)),
    ts.sys,
    basePath,
  );
  const printer = ts.createPrinter();

  for await (const entry of walk(basePath)) {
    if (entry.isFile) {
      const targetPath = entry.path;
      const currentFileAbsPath = path.resolve(targetPath);
      const fileContent = decoder.decode(
        await Deno.readFile(currentFileAbsPath),
      );
      const { importedFiles } = ts.preProcessFile(fileContent, true, true);

      if (importedFiles.length === 0) continue;

      const imports = resolvedModules({
        importedFiles,
        currentFileAbsPath,
        tsConfigObject,
      });

      const sourceFile = ts.createSourceFile(
        currentFileAbsPath,
        fileContent,
        ts.ScriptTarget.ESNext,
      );

      const result = transform({
        sourceFile,
        imports,
        tsConfigObject,
        printer,
      });
      console.log(`file: ${currentFileAbsPath}`);
      console.log(`%c${result}`, 'color: green');
    }
  }
};

await main({
  basePath: './examples/repo/src',
  options: {
    tsConfigPath: './examples/repo/tsconfig.json',
  },
});
