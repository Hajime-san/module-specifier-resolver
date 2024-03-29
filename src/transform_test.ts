import { asserts } from './dev_deps.ts';
import { ts } from './deps.ts';
import { tsConfigMockObject } from './tests/fixture/mod.ts';
import { transform } from './transform.ts';
const { assertEquals } = asserts;

Deno.test('transform', async (t) => {
  await t.step('resolve path', () => {
    assertEquals(
      transform({
        sourceFile: ts.createSourceFile(
          './src/App.tsx',
          `import { ComponentA } from './ComponentA';\n` +
            `const str = '😎';\n` +
            `const bigIntLiterals = 0o777777777777n;\n` +
            `const numericSeparators = 100_000;\n`,
          ts.ScriptTarget.ESNext,
          true,
        ),
        imports: [
          { original: './ComponentA', resolved: './ComponentA.tsx' },
        ],
        tsConfigObject: tsConfigMockObject,
        printer: ts.createPrinter(),
      }),
      `import { ComponentA } from "./ComponentA.tsx";\n` +
        `const str = '😎';\n` +
        `const bigIntLiterals = 0o777777777777n;\n` +
        `const numericSeparators = 100_000;\n`,
    );
  });
});
