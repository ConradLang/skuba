import ts from 'typescript';

import { formatPrettier } from './prettier';

type Props = ts.NodeArray<ts.ObjectLiteralElementLike>;

type Transformer<T> = (props: T) => T;

/**
 * Create the following expression:
 *
 * ```javascript
 * module.exports = {};
 * ```
 */
const createModuleExportsExpression = (
  props: Props,
  callExpression?: ts.Expression,
): ts.ExpressionStatement =>
  ts.createExpressionStatement(
    ts.createBinary(
      ts.createPropertyAccess(
        ts.createIdentifier('module'),
        ts.createIdentifier('exports'),
      ),
      ts.createToken(ts.SyntaxKind.EqualsToken),
      typeof callExpression === 'undefined'
        ? ts.createObjectLiteral(props, true)
        : ts.createCall(callExpression, undefined, [
            ts.createObjectLiteral(props, true),
          ]),
    ),
  );

const getPropName = (prop: ts.ObjectLiteralElementLike) =>
  ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)
    ? prop.name.escapedText.toString()
    : undefined;

/**
 * Create a transformer to mutate `module.exports` props in a source file.
 *
 * ```javascript
 * module.exports = {};
 * ```
 *
 * If `module.exports` is a call expression with a single argument, it will try
 * to transform the props of that argument.
 *
 * ```javascript
 * module.exports = fn({});
 * ```
 *
 * There's no recursion needed here as we expect the `module.exports` statement
 * to be a top-level node and therefore an immediate child of the source file.
 */
const createModuleExportsTransformer = (
  transformProps: Transformer<Props>,
): ts.TransformerFactory<ts.Node> => (context) => (rootNode) =>
  ts.visitEachChild(
    rootNode,
    (node) => {
      if (
        ts.isExpressionStatement(node) &&
        ts.isBinaryExpression(node.expression) &&
        ts.isPropertyAccessExpression(node.expression.left) &&
        ts.isIdentifier(node.expression.left.expression) &&
        node.expression.left.expression.escapedText === 'module' &&
        node.expression.left.name.text === 'exports' &&
        node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) {
        if (ts.isObjectLiteralExpression(node.expression.right)) {
          const props = transformProps(node.expression.right.properties);

          return createModuleExportsExpression(props);
        }

        if (
          ts.isCallExpression(node.expression.right) &&
          node.expression.right.arguments.length === 1
        ) {
          const [firstArgument] = node.expression.right.arguments;

          if (ts.isObjectLiteralExpression(firstArgument)) {
            const props = transformProps(firstArgument.properties);

            return createModuleExportsExpression(
              props,
              node.expression.right.expression,
            );
          }
        }
      }

      return node;
    },
    context,
  );

/**
 * Create a transformer to filter out unspecified props from an object literal.
 */
export const createPropFilter = (names: string[]): Transformer<Props> => (
  props,
) => {
  const nameSet = new Set<unknown>(names);

  return ts.createNodeArray(
    props.filter((prop) => nameSet.has(getPropName(prop))),
  );
};

export const createPropAppender = (
  appendingProps: Props,
): Transformer<Props> => (props) => {
  const nameSet = new Set<unknown>(
    props.map(getPropName).filter((prop) => typeof prop === 'string'),
  );

  return ts.createNodeArray([
    ...props,
    ...appendingProps.filter((prop) => !nameSet.has(getPropName(prop))),
  ]);
};

/**
 * Read out `module.exports` props from a source file.
 *
 * The props can then be used when transforming another source file.
 */
export const readModuleExports = (inputFile: string): Props | undefined => {
  let result: Props | undefined;

  transformModuleExports(inputFile, (props) => (result = props));

  return result;
};

/**
 * Mutate `module.exports` props in a source file.
 */
export const transformModuleExports = (
  inputFile: string,
  transformProps: Transformer<Props>,
): string => {
  const sourceFile = ts.createSourceFile('', inputFile, ts.ScriptTarget.Latest);

  const transformer = createModuleExportsTransformer(transformProps);

  const result = ts.transform(sourceFile, [transformer]);

  const [transformedFile] = result.transformed;

  const text = ts
    .createPrinter()
    .printNode(ts.EmitHint.SourceFile, transformedFile, sourceFile);

  return formatPrettier(text, { parser: 'typescript' });
};
