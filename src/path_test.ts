import { assertEquals } from 'https://deno.land/std@0.176.0/testing/asserts.ts';
import { getLCS, relativeFilePath } from './path.ts';

Deno.test('getLCS', () => {
  assertEquals(getLCS('hello world!!', 'hello world!!!!'), 'hello world!!');
});

Deno.test('relativeFilePath', async (t) => {
  await t.step('same directory', () => {
    assertEquals(
      relativeFilePath('/usr/local/foo/bar.ts', '/usr/local/foo/foo.ts'),
      './foo.ts',
    );
  });

  await t.step('different root of sub directory', () => {
    assertEquals(
      relativeFilePath(
        '/usr/local/bin/tmp/bar.ts',
        '/usr/local/conf/tmp/foo.ts',
      ),
      '../../conf/tmp/foo.ts',
    );
  });

  await t.step('same root of sub directory', () => {
    assertEquals(
      relativeFilePath('/usr/local/bin/bar.ts', '/usr/local/bin/tmp/foo.ts'),
      './tmp/foo.ts',
    );
  });

  await t.step('parent directory', () => {
    assertEquals(
      relativeFilePath('/usr/local/bin.ts', '/usr/foo.ts'),
      '../foo.ts',
    );
  });
});
