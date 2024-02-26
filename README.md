# module-specifier-resolver
This tool transforms `module specifier` of TypeScript source code when it contains.  
Because ECMAScript Modules(ESM) system doesn't allow to abbreviate file extension, so this tool aim to follows the system.

## use cases
- You want to migrate your development enviroment like below.
  - From `Node.js` & `TypeScript 4.7 ~ 4.9` to `Node.js` & `TypeScript 5.0 ~`
  - From `Node.js` & `TypeScript` to `Deno` & `TypeScript` in the near future

## transform example

### a file tree as follows
```bash
root
├── foo.ts
├── bar.ts
└── cool
    ├── index.ts
    └── cool.ts
```

#### before

- `foo.ts`
  ```ts
  // If your TypeScript "compilerOptions" has set "moduleResolution": "nodenext", it will be like below.
  // import { bar } from './bar.js'
  import { bar } from './bar'
  import { cool } from './cool'
  console.log(bar)
  console.log(cool)
  ```
- `bar.ts`
  ```ts
  export const bar = 42
  ```

- `cool/index.ts`
  ```ts
  export { cool } from './cool'
  ```

- `cool/cool.ts`
  ```ts
  export const cool = 'this is cool'
  ```

#### after 

- `foo.ts`
  ```ts
  import { bar } from './bar.ts'
  import { cool } from './cool/index.ts'
  console.log(bar)
  console.log(cool)
  ```

- `cool/index.ts`
  ```ts
  export { cool } from './cool.ts'
  ```

## limitation
- Can't resolve `paths` mapping of TypeScript `compilerOptions`.
- Please be careful if your code have the text `//_PRESERVE_NEWLINE_//` which will be replace newline, because of that keeps original newline before tsc compiler optimize it.
- Can't keep `single quatation` , `duble quatation` , `semicolon` , `comma` and `indatation` of original source code.

## tools
Please install [Deno](https://deno.land/manual@v1.30.3/getting_started/installation).

## command
### remote
- dry run
  - `deno run --allow-env --allow-read --allow-write https://deno.land/x/module_specifier_resolver@v1.0.20/bin.ts -b=./src -c=./tsconfig.json -d`
- transform
  - `deno run --allow-env --allow-read --allow-write https://deno.land/x/module_specifier_resolver@v1.0.20/bin.ts -b=./src -c=./tsconfig.json -r`
### local
- `deno task run-dry`
- `deno task run`

### arguments
| key | description | type | default |
|-----|-----|-----|-----|
| -b | locale of base directory | `string` | `.` |
| -c  | locale of base `tsconfig.json` | `string` | `./tsconfig.json` |
| -d  | dry run | `boolean` | `false` |
| -r  | enable repl interface | `boolean` | `false` |

## tips
After you ran `bin.ts`, you should run `npx tsc --noEmit` and your bundler's `build` command due to check correctness of transformation by this tool.
- `tsconfig.json` example
  ```json
  {
    "compilerOptions": {
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true
    }
  }
  ```

## License
- MIT license (LICENSE-MIT or http://opensource.org/licenses/MIT)
