import { asserts, ts } from './dev_deps.ts';
import { getModuleSpecifier, isTokenObject } from './mod.ts';
const { assertEquals } = asserts;

const localSourceImportDeclaration = ts.factory.createImportDeclaration(
  undefined,
  ts.factory.createImportClause(
    false,
    ts.factory.createIdentifier('ComponentA'),
    undefined,
  ),
  ts.factory.createStringLiteral('./ComponentA'),
  undefined,
);

const externalLibImportDeclaration = ts.factory.createImportDeclaration(
  undefined,
  ts.factory.createImportClause(
    false,
    ts.factory.createIdentifier('React'),
    undefined,
  ),
  ts.factory.createStringLiteral('react'),
  undefined,
);

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
