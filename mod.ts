import { default as ts } from "npm:typescript@4.9.4";
import tsConfig from "./examples/repo/tsconfig.json" assert { type: "json" };

async function resolvePathsToModuleImports(typescriptFilePath: string) {
  // To use the typescript module resolution, you need to get the tsconfig
  // Here we assume you already have a reference to the tsconfig JSON
  const tsConfigObject = ts.parseJsonConfigFileContent(
    tsConfig,
    ts.sys,
    "./examples/repo",
  );
  const fileContent = (await Deno.readFile(typescriptFilePath)).toString();

  // Preprocess the typescript file using the compiler API
  // to get the raw imports as represented in the file
  const fileInfo = ts.preProcessFile(fileContent, true);
  // You can then get the file path, etc, by resolving the imports via the
  // compiler API

  const resolvedImport = ts.resolveModuleName(
    "./ComponentA",
    typescriptFilePath,
    tsConfigObject.options,
    ts.sys,
  );

  const importLoc = resolvedImport.resolvedModule?.resolvedFileName;
  console.log(`File ${importLoc}`);

  fileInfo.importedFiles
    .map((importedModule) => importedModule.fileName)
    .forEach((rawImport) => {
      const resolvedImport = ts.resolveModuleName(
        rawImport,
        typescriptFilePath,
        tsConfigObject.options,
        ts.sys,
      );
      // Depending on how fancy your ts is, the
      // "resolvedImport.resolvedModule.resolvedFileName" may not exist,
      // but should resolve for all ts files
      const importLoc = resolvedImport.resolvedModule?.resolvedFileName;
      console.log(
        `File ${typescriptFilePath} imports ${rawImport} from location ${importLoc}`,
      );
    });
}

await resolvePathsToModuleImports("./examples/repo/src/App.tsx");
