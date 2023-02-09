import { cli, io, path, ts, walk } from './dev_deps.ts';
import { relativeFilePath } from './path.ts';
import { hasUnicodeStr, unescapeUnicodeStr } from './str.ts';

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

const transformeModuleSpecifier = (
  imports: ReturnType<typeof resolvedModules>,
) => {
  const _transformeModuleSpecifier =
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

  return _transformeModuleSpecifier;
};

export const transform = (args: {
  sourceFile: ts.SourceFile;
  imports: ReturnType<typeof resolvedModules>;
  tsConfigObject: ts.ParsedCommandLine;
  printer: ts.Printer;
}) => {
  const { sourceFile, imports, tsConfigObject, printer } = args;
  const transformationResult = ts.transform(sourceFile, [
    transformeModuleSpecifier(imports),
  ], tsConfigObject.options);

  const result = printer.printNode(
    ts.EmitHint.Unspecified,
    transformationResult.transformed[0],
    ts.createSourceFile('', '', ts.ScriptTarget.ESNext),
  );
  // unescape unicode text
  return hasUnicodeStr(result) ? unescapeUnicodeStr(result) : result;
};

const flags = cli.parse(Deno.args, {
  string: ['b', 'c'],
  boolean: ['d', 'r'],
});

export const main = async (args: {
  basePath?: string;
  options?: {
    tsConfigPath?: string;
    dryRun?: boolean;
    repl?: boolean;
  };
} = {
  basePath: flags.b,
  options: {
    tsConfigPath: flags.c,
    dryRun: flags.d ?? false,
    repl: flags.r ?? false,
  },
}) => {
  const { basePath, options } = args;
  const _basePath = basePath ?? './';
  const tsConfigPath = options?.tsConfigPath ?? './tsconfig.json';
  const match = [/\.js$/, /\.mjs$/, /\.ts$/, /\.mts$/, /\.jsx$/, /\.tsx$/];
  const decoder = new TextDecoder('utf-8');
  const tsConfigJson = await Deno.readFile(tsConfigPath);
  const tsConfigObject = ts.parseJsonConfigFileContent(
    JSON.parse(decoder.decode(tsConfigJson)),
    ts.sys,
    _basePath,
  );
  const printer = ts.createPrinter();

  const transformedList: Array<{
    path: string;
    result: string;
  }> = [];

  for await (const entry of walk(_basePath, { match })) {
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
      transformedList.push({
        path: currentFileAbsPath,
        result,
      });
    }
  }

  if (transformedList.length === 0) {
    console.log(
      `%cThere're no transform target files.`,
      'color: green',
    );
    Deno.exit();
  }
  console.log(
    `%ctransform target ${transformedList.length} files found.`,
    'color: yellow',
  );
  const writeFiles = async (): Promise<void> => {
    const encoder = new TextEncoder();
    await Promise.all(transformedList.map((transformed) => {
      return new Promise((resolve, reject) => {
        const { path, result } = transformed;
        if (options?.dryRun) {
          console.log(`file: ${path}`);
          console.log(`%c${result}`, 'color: green');
          resolve(() => {});
        } else {
          try {
            resolve(
              Deno.writeFile(
                path,
                encoder.encode(result),
              ).then(),
            );
          } catch (error) {
            reject(error);
          }
        }
      });
    })).then(() => {
      console.log(
        `%c${
          options?.dryRun ? 'Dry run ' : ''
        }update ${transformedList.length} files, finished.`,
        'color: green',
      );
    }).catch((error) => {
      throw new Error(error);
    });
  };

  if (options?.repl) {
    console.log(
      `%cAre you sure complement the extension of module specifier to files? (y/n)`,
      'color: yellow',
    );
    for await (const line of io.readLines(Deno.stdin)) {
      if (line.trim().toLowerCase() === 'y') {
        await writeFiles();
        Deno.exit();
      } else {
        Deno.exit();
      }
    }
  } else {
    await writeFiles();
    Deno.exit();
  }
};
