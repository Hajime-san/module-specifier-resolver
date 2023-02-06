import { asserts, ts } from './dev_deps.ts';
import { getModuleSpecifier, isTokenObject, transform } from './mod.ts';
import {
  externalLibImportDeclaration,
  localSourceImportDeclaration,
  tsConfigMockObject,
} from './tests/fixture/mod.ts';
const { assertEquals } = asserts;

Deno.test('isTokenObject', () => {
  assertEquals(
    isTokenObject(localSourceImportDeclaration.moduleSpecifier),
    true,
  );
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
          `import { ComponentA } from './ComponentA';`,
          ts.ScriptTarget.ESNext,
        ),
        imports: [
          { original: './ComponentA', resolved: './ComponentA.tsx' },
        ],
        tsConfigObject: tsConfigMockObject,
        printer: ts.createPrinter(),
      }),
      `import { ComponentA } from "./ComponentA.tsx";\n`,
    );
  });
});
