import { ts } from './deps.ts';
import {
  getExpressionArguments,
  getModuleSpecifier,
  ResolvedModuleImport,
} from './resolve_util.ts';
import { hasUnicodeStr, unescapeUnicodeStr } from './str.ts';

const transformModuleSpecifier = (
  sourceFile: ts.SourceFile,
  imports: Array<ResolvedModuleImport>,
) => {
  return (context: ts.TransformationContext) => (rootNode: ts.Node) => {
    const visit = (node: ts.Node): ts.Node => {
      const newNode = ts.visitEachChild(node, visit, context);

      // Preserve Numeric Literals
      //
      // const numericSeparators = 100_000;
      // const octal = 0001;
      // const hex = 0x00111;
      // const binary = 0b0011;
      // https://github.com/microsoft/TypeScript/issues/53182
      if (ts.isNumericLiteral(newNode)) {
        return context.factory.createNumericLiteral(
          newNode.getText(sourceFile),
        );
      }

      // Preserve BigInt Literals
      //
      // const previouslyMaxSafeInteger = 9007199254740991n;
      if (ts.isBigIntLiteral(newNode)) {
        return context.factory.createBigIntLiteral(
          newNode.getText(sourceFile),
        );
      }

      // Transform "import call"
      //
      // const foo = import('./foo');
      // to
      // const foo = import('./foo.(ts|tsx)');
      if (
        ts.isCallExpression(newNode) &&
        newNode.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const { expressionArguments } = getExpressionArguments({
          node: newNode,
          imports,
        });
        return context.factory.updateCallExpression(
          newNode,
          newNode.expression,
          newNode.typeArguments,
          expressionArguments.map((argument) =>
            context.factory.createStringLiteral(argument)
          ),
        );
      }
      // Transform "aggregating modules"
      if (ts.isExportDeclaration(newNode)) {
        const { moduleSpecifier } = getModuleSpecifier({
          node: newNode,
          imports,
        });
        // export { foo } from "./foo"
        // to
        // export { foo } from "./foo.(ts|tsx|d.ts)"
        if (moduleSpecifier) {
          return context.factory.updateExportDeclaration(
            newNode,
            newNode.modifiers,
            newNode.isTypeOnly,
            newNode.exportClause,
            context.factory.createStringLiteral(moduleSpecifier),
            newNode.assertClause,
          );
        }
        //
        // export { foo }
        return newNode;
      }
      // Transform "static import"
      //
      // import { bar } from "./bar"
      // to
      // import { bar } from "./bar.(ts|tsx|d.ts)"
      if (ts.isImportDeclaration(newNode)) {
        const { moduleSpecifier } = getModuleSpecifier({
          node: newNode,
          imports,
        });
        return context.factory.updateImportDeclaration(
          newNode,
          newNode.modifiers,
          newNode.importClause,
          context.factory.createStringLiteral(moduleSpecifier),
          newNode.assertClause,
        );
      }
      return newNode;
    };

    return ts.visitNode(rootNode, visit);
  };
};

export const transform = (args: {
  sourceFile: ts.SourceFile;
  imports: Array<ResolvedModuleImport>;
  tsConfigObject: ts.ParsedCommandLine;
  printer: ts.Printer;
}): string => {
  const { sourceFile, imports, tsConfigObject, printer } = args;
  const transformationResult = ts.transform(sourceFile, [
    transformModuleSpecifier(sourceFile, imports),
  ], tsConfigObject.options);

  const printed = printer.printNode(
    ts.EmitHint.Unspecified,
    transformationResult.transformed[0],
    ts.createSourceFile('', '', ts.ScriptTarget.ESNext),
  );
  // unescape unicode text
  // https://github.com/microsoft/TypeScript/issues/36174
  return hasUnicodeStr(printed) ? unescapeUnicodeStr(printed) : printed;
};
