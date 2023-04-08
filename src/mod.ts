import { cli, io, path, ts, walk } from './deps.ts';
import {
  hasShouldResolveImportedFiles,
  resolvedModules,
} from './resolve_util.ts';
import { preserveNewLine } from './str.ts';
import { transform } from './transform.ts';

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
