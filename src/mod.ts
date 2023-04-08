import { cli, io, path, ts, walk } from './deps.ts';
import { relativeFilePath } from './path.ts';
import {
  hasUnicodeStr,
  preserveNewLine,
  restoreNewLine,
  unescapeUnicodeStr,
} from './str.ts';

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

export const resolvedModules = (args: {
  importedFiles: ts.FileReference[];
  targetFileAbsPath: string;
  tsConfigObject: ts.ParsedCommandLine;
}): Array<{
  original: string;
  resolved: string;
}> => {
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

const transformModuleSpecifier = (
  imports: ReturnType<typeof resolvedModules>,
) => {
  return (context: ts.TransformationContext) => (rootNode: ts.Node) => {
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
        return context.factory.updateExportDeclaration(
          node,
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
        return context.factory.updateImportDeclaration(
          node,
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
};

export const transform = (args: {
  sourceFile: ts.SourceFile;
  imports: ReturnType<typeof resolvedModules>;
  tsConfigObject: ts.ParsedCommandLine;
  printer: ts.Printer;
}) => {
  const { sourceFile, imports, tsConfigObject, printer } = args;
  const transformationResult = ts.transform(sourceFile, [
    transformModuleSpecifier(imports),
  ], tsConfigObject.options);

  const printed = printer.printNode(
    ts.EmitHint.Unspecified,
    transformationResult.transformed[0],
    ts.createSourceFile('', '', ts.ScriptTarget.ESNext),
  );
  // unescape unicode text
  const result = hasUnicodeStr(printed) ? unescapeUnicodeStr(printed) : printed;
  return restoreNewLine(result, tsConfigObject.options.newLine);
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
  const _basePath = basePath ?? '.';
  const tsConfigPath = options?.tsConfigPath ?? './tsconfig.json';
  const match = [/\.js$/, /\.mjs$/, /\.ts$/, /\.mts$/, /\.jsx$/, /\.tsx$/];
  const skip = [/node_modules/];
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

  for await (const entry of walk(_basePath, { match, skip })) {
    if (entry.isFile) {
      const targetPath = entry.path;
      const targetFileAbsPath = path.resolve(targetPath);
      const fileContent = preserveNewLine(decoder.decode(
        await Deno.readFile(targetFileAbsPath),
      ));

      const { importedFiles } = ts.preProcessFile(fileContent, true, true);

      if (
        !hasShouldResolveImportedFiles({
          importedFiles,
          targetFileAbsPath,
          tsConfigObject,
        })
      ) continue;

      const imports = resolvedModules({
        importedFiles,
        targetFileAbsPath,
        tsConfigObject,
      });

      const sourceFile = ts.createSourceFile(
        targetFileAbsPath,
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
        path: targetFileAbsPath,
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
  const encoder = new TextEncoder();

  const writeFiles = async (): Promise<void> => {
    await Promise.all(transformedList.map((transformed) => {
      return new Promise((resolve, reject) => {
        const { path, result } = transformed;
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
      });
    })).then(() => {
      console.log(
        `%cupdate ${transformedList.length} files, finished.`,
        'color: green',
      );
    }).catch((error) => {
      throw new Error(error);
    });
  };

  const LOG_FILE_NAME = 'module-specifier-resolver.log';

  const writeLog = async (): Promise<void> => {
    try {
      await Deno.remove(LOG_FILE_NAME);
    } catch (_) {}
    await Promise.all(transformedList.map((transformed) => {
      return new Promise((resolve, reject) => {
        const { path, result } = transformed;
        try {
          resolve(
            Deno.writeFile(
              LOG_FILE_NAME,
              encoder.encode(
                `file: ${path}
${result}

`,
              ),
              {
                append: true,
              },
            ).then(),
          );
        } catch (error) {
          reject(error);
        }
      });
    })).then(() => {
      console.log(
        `%cDry run: ${transformedList.length} files, finished.
${LOG_FILE_NAME}`,
        'color: green',
      );
    }).catch((error) => {
      throw new Error(error);
    });
  };

  if (options?.dryRun) {
    await writeLog();
    Deno.exit();
  }

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
