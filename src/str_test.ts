import { asserts } from './dev_deps.ts';
import { hasUnicodeStr, unescapeUnicodeStr } from './str.ts';
const { assertEquals } = asserts;

Deno.test('hasUnicodeStr', () => {
  // \uD83D\uDE0E is 😎
  assertEquals(hasUnicodeStr('\\uD83D\\uDE0E'), true);
});

Deno.test('unescapeUnicodeStr', () => {
  assertEquals(unescapeUnicodeStr('\uD83D\uDE0E'), '😎');
});
