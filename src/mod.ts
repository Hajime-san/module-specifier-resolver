import { path, ts, walk } from './dev_deps.ts';
import { relativeFilePath } from './path.ts';

type TokenObject = ts.Node & {
  text: string;
};

const isTokenObject = (node: ts.Node): node is TokenObject => {
  return (node as unknown as Record<string, unknown>).hasOwnProperty('text');
};

const resolvedModuleImports = (args: {
  importedFiles: ts.FileReference[];
  currentFileAbsPath: string;
  tsConfigObject: ts.ParsedCommandLine;
}) => {
  const { importedFiles, currentFileAbsPath, tsConfigObject } = args;
  const resolveModuleName = (fileName: string) => {
    return ts.resolveModuleName(
      fileName,
      currentFileAbsPath,
      tsConfigObject.options,
      ts.sys,
      undefined,
    );
  };
  return importedFiles
    .filter(({ fileName }) => {
      const { resolvedModule } = resolveModuleName(fileName);
      return !resolvedModule?.isExternalLibraryImport &&
        resolvedModule?.resolvedFileName;
    })
    .map(({ fileName }) => {
      const { resolvedModule } = resolveModuleName(fileName);
      const importLoc = resolvedModule!.resolvedFileName;
      return {
        original: `${fileName}`,
        resolved: relativeFilePath(currentFileAbsPath, importLoc),
      };
    });
};

const resolveImportDeclarationSpecifier = (
  imports: ReturnType<typeof resolvedModuleImports>,
) => {
  const _resolveImportDeclarationSpecifier =
    (context: ts.TransformationContext) => (rootNode: ts.Node) => {
      const visit = (node: ts.Node): ts.Node => {
        const newNode = ts.visitEachChild(node, visit, context);

        if (ts.isImportDeclaration(newNode)) {
          let moduleSpecifier: string | undefined;
          if (isTokenObject(newNode.moduleSpecifier)) {
            const _moduleSpecifier = newNode.moduleSpecifier;
            moduleSpecifier = imports.find((v) =>
              v.original === _moduleSpecifier.text
            )?.resolved ??
              _moduleSpecifier.text;
          }

          if (typeof moduleSpecifier === 'undefined') {
            throw new Error(
              'failed to get import moduleSpecifier from TypeScript AST Nodes.',
            );
          }

          return context.factory.createImportDeclaration(
            newNode.modifiers,
            newNode.importClause,
            context.factory.createStringLiteral(moduleSpecifier),
            newNode.assertClause,
          );
        }
        return newNode;
      };

      return ts.visitNode(rootNode, visit);
    };

  return _resolveImportDeclarationSpecifier;
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
      const { importedFiles } = ts.preProcessFile(fileContent, true);

      if (importedFiles.length === 0) {
        continue;
      }
      const imports = resolvedModuleImports({
        importedFiles,
        currentFileAbsPath,
        tsConfigObject,
      });

      const source = ts.createSourceFile(
        currentFileAbsPath,
        fileContent,
        ts.ScriptTarget.ESNext,
      );

      const transformationResult = ts.transform(source, [
        resolveImportDeclarationSpecifier(imports),
      ], tsConfigObject.options);

      const result = printer.printNode(
        ts.EmitHint.Unspecified,
        transformationResult.transformed[0],
        ts.createSourceFile('', '', ts.ScriptTarget.ESNext),
      );
      console.log(result);
    }
  }
};

await main({
  basePath: 'examples/repo/src',
  options: {
    tsConfigPath: './examples/repo/tsconfig.json',
  },
});
