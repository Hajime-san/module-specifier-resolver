import { asserts } from './dev_deps.ts';
import {
  hasUnicodeStr,
  preserveNewLine,
  restoreNewLine,
  unescapeUnicodeStr,
} from './str.ts';
const { assertEquals } = asserts;

Deno.test('hasUnicodeStr', () => {
  // \uD83D\uDE0E is 😎
  assertEquals(hasUnicodeStr('\\uD83D\\uDE0E'), true);
});

Deno.test('unescapeUnicodeStr', () => {
  assertEquals(unescapeUnicodeStr('\uD83D\uDE0E'), '😎');
});

Deno.test('preserveNewLine', () => {
  assertEquals(
    preserveNewLine(`import React from 'react';\n`),
    `import React from 'react';\n/*_PRESERVE_NEWLINE_|`,
  );
});

Deno.test('restoreNewLine', () => {
  assertEquals(
    restoreNewLine(`import React from 'react';\n/*_PRESERVE_NEWLINE_|`),
    `import React from 'react';\n`,
  );
});
