import { asserts } from './dev_deps.ts';
import { path, ts } from './deps.ts';
import {
  getModuleSpecifier,
  hasShouldResolveImportedFiles,
  isTokenObject,
  resolveModuleName,
  transform,
} from './mod.ts';
import {
  externalLibImportDeclaration,
  localSourceImportDeclaration,
  tsConfigMockObject,
} from './tests/fixture/mod.ts';
const { assertEquals } = asserts;
const __dirname = path.dirname(path.fromFileUrl(import.meta.url));

Deno.test('isTokenObject', () => {
  assertEquals(
    isTokenObject(localSourceImportDeclaration.moduleSpecifier),
    true,
  );
});

Deno.test('resolveModuleName', async (t) => {
  await t.step('local module', () => {
    assertEquals(
      resolveModuleName({
        fileName: './ComponentA',
        currentFileAbsPath: path.resolve(...[
          __dirname,
          '../examples/repo/src/App.tsx',
        ]),
        tsConfigObject: tsConfigMockObject,
      }).resolvedModule,
      {
        resolvedFileName: path.resolve(...[
          __dirname,
          '../examples/repo/src/ComponentA/index.ts',
        ]),
        originalPath: undefined,
        extension: '.ts',
        isExternalLibraryImport: false,
        packageId: undefined,
        resolvedUsingTsExtension: false,
      } as ReturnType<typeof resolveModuleName>['resolvedModule'],
    );
  });

  await t.step('node_module', () => {
    assertEquals(
      resolveModuleName({
        fileName: 'react',
        currentFileAbsPath: path.resolve(...[
          __dirname,
          '../examples/repo/src/App.tsx',
        ]),
        tsConfigObject: tsConfigMockObject,
      }).resolvedModule,
      {
        resolvedFileName: path.resolve(...[
          __dirname,
          '../examples/repo/node_modules/@types/react/index.d.ts',
        ]),
        originalPath: undefined,
        extension: '.d.ts',
        isExternalLibraryImport: true,
        packageId: {
          name: '@types/react',
          subModuleName: 'index.d.ts',
          version: '18.0.26',
        },
        resolvedUsingTsExtension: false,
      } as ReturnType<typeof resolveModuleName>['resolvedModule'],
    );
  });
});

Deno.test('hasShouldResolveImportedFiles', async (t) => {
  await t.step('should resolve', () => {
    assertEquals(
      hasShouldResolveImportedFiles({
        importedFiles: [{ fileName: './ComponentA', pos: 14, end: 26 }],
        currentFileAbsPath: path.resolve(...[
          __dirname,
          '../examples/repo/src/App.tsx',
        ]),
        tsConfigObject: tsConfigMockObject,
      }),
      true,
    );
  });

  await t.step('should not resolve', () => {
    assertEquals(
      hasShouldResolveImportedFiles({
        importedFiles: [
          { fileName: 'react', pos: 18, end: 23 },
          { fileName: './ComponentA/index.ts', pos: 54, end: 75 },
        ],
        currentFileAbsPath: path.resolve(...[
          __dirname,
          '../examples/repo/src/ComponentD.tsx',
        ]),
        tsConfigObject: tsConfigMockObject,
      }),
      false,
    );
  });
});

Deno.test('getModuleSpecifier', async (t) => {
  await t.step('local module', () => {
    assertEquals(
      getModuleSpecifier({
        node: localSourceImportDeclaration,
        imports: [
          { original: './ComponentA', resolved: './ComponentA.tsx' },
        ],
      }),
      {
        moduleSpecifier: './ComponentA.tsx',
        node: localSourceImportDeclaration,
      },
    );
  });

  await t.step('node_module', () => {
    assertEquals(
      getModuleSpecifier({
        node: externalLibImportDeclaration,
        imports: [],
      }),
      {
        moduleSpecifier: 'react',
        node: externalLibImportDeclaration,
      },
    );
  });
});

Deno.test('transform', async (t) => {
  await t.step('resolve path', () => {
    assertEquals(
      transform({
        sourceFile: ts.createSourceFile(
          './src/App.tsx',
          `import { ComponentA } from './ComponentA';\n` +
            `const str = '😎';\n`,
          ts.ScriptTarget.ESNext,
        ),
        imports: [
          { original: './ComponentA', resolved: './ComponentA.tsx' },
        ],
        tsConfigObject: tsConfigMockObject,
        printer: ts.createPrinter(),
      }),
      `import { ComponentA } from "./ComponentA.tsx";\n` +
        `const str = "😎";\n`,
    );
  });
});
