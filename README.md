# module-specifier-resolver
This tool transforms `module specifier` of TypeScript source code when it contains.  
Because ECMAScript Modules(ESM) system doesn't allow to abbreviate file extension, so this tool aim to follows the system.

## tools
Please install [Deno](https://deno.land/manual@v1.30.3/getting_started/installation).

## transform examples
```ts
export { foo } from "./foo"
// transform to
export { foo } from "./foo.(ts|tsx|d.ts)"
```

```ts
import { bar } from "./bar"
// transform to
import { bar } from "./bar.(ts|tsx|d.ts)"
```

## limitation
- Can't resolve `paths` alias of TypeScript compiler options.
- Can't resolve `import()` syntax, commonly called `dynamic import`.
- Can't keep `single quatation` or `duble quatation` and `semicolon` of original source code.
- Plase be careful if your code have the text `\n/*_PRESERVE_NEWLINE_|` which will be replace newline, because of that keeps original newline before tsc compiler optimize it.

## command
### remote
- dry run
  - `deno run --unstable --allow-env --allow-read https://deno.land/x/module_specifier_resolver@v1.0.7/bin.ts -b=./src -c=./tsconfig.json -d`
- transform
  - `deno run --unstable --allow-env --allow-read --allow-write https://deno.land/x/module_specifier_resolver@v1.0.7/bin.ts -b=./src -c=./tsconfig.json -r`
### local
- `deno task run-dry`
- `deno task run`

### arguments
| key | description | type | default |
|-----|-----|-----|-----|
| -b | local of base directory | `string` | `.` |
| -c  | local of base `tsconfig.json` | `string` | `./tsconfig.json` |
| -d  | dry run | `boolean` | `false` |
| -r  | enable repl interface | `boolean` | `false` |

## tips
After you ran `bin.ts`, you should run `npx tsc --noEmit` due to check correctness of transformation by this tool.
- `tsconfig.json` example
  ```json
  {
    "compilerOptions": {
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true,
      "noEmit": true
    }
  }
  ```

## License
- MIT license (LICENSE-MIT or http://opensource.org/licenses/MIT)
