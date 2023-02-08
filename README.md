# ntd

# command
`deno run --allow-env --allow-read src/mod.ts -b=./examples/repo/src -c=./examples/repo/tsconfig.json`

# tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
