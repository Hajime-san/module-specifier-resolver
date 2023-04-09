import { ts } from './deps.ts';
import { getModuleSpecifier, ResolvedModuleImport } from './resolve_util.ts';
import { hasUnicodeStr, unescapeUnicodeStr } from './str.ts';

const transformModuleSpecifier = (
  imports: Array<ResolvedModuleImport>,
) => {
  return (context: ts.TransformationContext) => (rootNode: ts.Node) => {
    const visit = (node: ts.Node): ts.Node => {
      const newNode = ts.visitEachChild(node, visit, context);

      // Transform "aggregating modules"
      //
      // export { foo } from "./foo"
      // to
      // export { foo } from "./foo.(ts|tsx|d.ts)"
      if (ts.isExportDeclaration(newNode)) {
        const { moduleSpecifier, node } = getModuleSpecifier({
          node: newNode,
          imports,
        });
        return context.factory.updateExportDeclaration(
          node,
          node.modifiers,
          node.isTypeOnly,
          node.exportClause,
          moduleSpecifier
            ? context.factory.createStringLiteral(moduleSpecifier)
            : undefined,
          node.assertClause,
        );
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
