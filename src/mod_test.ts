import { asserts, ts } from './dev_deps.ts';
import { isTokenObject } from './mod.ts';
const { assertEquals } = asserts;

Deno.test('isTokenObject', () => {
  assertEquals(
    isTokenObject(ts.factory.createImportDeclaration(
      undefined,
      ts.factory.createImportClause(
        false,
        ts.factory.createIdentifier('React'),
        undefined,
      ),
      ts.factory.createStringLiteral('react'),
      undefined,
    ).moduleSpecifier),
    true,
  );
});
