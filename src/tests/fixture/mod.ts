import { ts } from '../../dev_deps.ts';

const localSourceImportDeclaration = ts.factory.createImportDeclaration(
  undefined,
  ts.factory.createImportClause(
    false,
    ts.factory.createIdentifier('ComponentA'),
    undefined,
  ),
  ts.factory.createStringLiteral('./ComponentA'),
  undefined,
);

const externalLibImportDeclaration = ts.factory.createImportDeclaration(
  undefined,
  ts.factory.createImportClause(
    false,
    ts.factory.createIdentifier('React'),
    undefined,
  ),
  ts.factory.createStringLiteral('react'),
  undefined,
);

const tsConfigMockObject: ts.ParsedCommandLine = {
  options: {
    jsx: 4,
    jsxImportSource: 'react',
    lib: ['lib.dom.d.ts', 'lib.esnext.d.ts'],
    esModuleInterop: true,
    strict: true,
    isolatedModules: true,
    baseUrl: 'src',
    allowJs: true,
    paths: { '@alias/*': ['./src/alias/*'] },
    pathsBasePath: './src',
    configFilePath: undefined,
  },
  watchOptions: undefined,
  fileNames: [
    'src/App.tsx',
    'src/ComponentA/ComponentA.tsx',
  ],
  projectReferences: undefined,
  typeAcquisition: { enable: false, include: [], exclude: [] },
  raw: {
    compilerOptions: {
      jsx: 'react-jsx',
      jsxImportSource: 'react',
      lib: ['dom', 'ESNext'],
      esModuleInterop: true,
      strict: true,
      isolatedModules: true,
      baseUrl: './',
      allowJs: true,
      paths: { '@alias/*': ['./src/alias/*'] },
    },
    compileOnSave: false,
  },
  errors: [],
  wildcardDirectories: { 'src': 1 },
  compileOnSave: false,
};

export {
  externalLibImportDeclaration,
  localSourceImportDeclaration,
  tsConfigMockObject,
};
