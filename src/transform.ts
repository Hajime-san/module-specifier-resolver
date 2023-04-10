import { ts } from './deps.ts';
import {
  getExpressionArguments,
  getModuleSpecifier,
  ResolvedModuleImport,
} from './resolve_util.ts';
import { hasUnicodeStr, unescapeUnicodeStr } from './str.ts';

const transformModuleSpecifier = (
  imports: Array<ResolvedModuleImport>,
) => {
  return (context: ts.TransformationContext) => (rootNode: ts.Node) => {
    const visit = (node: ts.Node): ts.Node => {
      const newNode = ts.visitEachChild(node, visit, context);

      // Transform "import call"
      //
      // const foo = import('./foo');
      // to
      // const foo = import('./foo.(ts|tsx)');
      if (
        ts.isCallExpression(newNode) &&
        newNode.expression.kind === ts.SyntaxKind.ImportKeyword
      ) {
        const { expressionArguments, node } = getExpressionArguments({
          node: newNode,
          imports,
        });
        return context.factory.updateCallExpression(
          node,
          node.expression,
          node.typeArguments,
          expressionArguments.map((argument) =>
            context.factory.createStringLiteral(argument)
          ),
        );
      }
      // Transform "aggregating modules"
      if (ts.isExportDeclaration(newNode)) {
        const { moduleSpecifier, node } = getModuleSpecifier({
          node: newNode,
          imports,
        });
        // export { foo } from "./foo"
        // to
        // export { foo } from "./foo.(ts|tsx|d.ts)"
        if (moduleSpecifier) {
          return context.factory.updateExportDeclaration(
            node,
            node.modifiers,
            node.isTypeOnly,
            node.exportClause,
            context.factory.createStringLiteral(moduleSpecifier),
            node.assertClause,
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
        const { moduleSpecifier, node } = getModuleSpecifier({
          node: newNode,
          imports,
        });
        return context.factory.updateImportDeclaration(
          node,
          node.modifiers,
          node.importClause,
          context.factory.createStringLiteral(moduleSpecifier),
          node.assertClause,
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
    transformModuleSpecifier(imports),
  ], tsConfigObject.options);

  const printed = printer.printNode(
    ts.EmitHint.Unspecified,
    transformationResult.transformed[0],
    ts.createSourceFile('', '', ts.ScriptTarget.ESNext),
  );
  // unescape unicode text
  return hasUnicodeStr(printed) ? unescapeUnicodeStr(printed) : printed;
};
