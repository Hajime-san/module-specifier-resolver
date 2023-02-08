# module-specifier-resolver
This tool transforms your local TypeScript code that gives you to rewrite file extension of `module specifier` automatically.

## examples
```ts
export { foo } from "./foo"
transform to
export { foo } from "./foo.(ts|tsx|d.ts)"
```

```ts
import { bar } from "./bar"
transform to
import { bar } from "./bar.(ts|tsx|d.ts)"
```

## limitation
- Can't resolve `paths` alias of TypeScript compiler options.
- Can't resolve `import()` syntax, commonly called `dynamic import`.
- Can't keep `newline` of original source code.

## command
- `deno task bin-dry`
- `deno task bin`

### arguments
| key | description | type | default |
|-----|-----|-----|-----|
| -b | local of base directory | `string` | `./` |
| -c  | local of base `tsconfig.json` | `string` | `./tsconfig.json` |
| -d  | dry run | `boolean` | `false` |

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
