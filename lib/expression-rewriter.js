import Argument from './argument';
import AstRewriter from './ast-rewriter';
import _ from 'lodash';

Argument.prototype.toExpression = function () {
  const ast = this.getAstWithFlaver('expression');

  if (_.size(ast.body) === 1) {
    if (ast.body[0].type === 'ExpressionStatement') {
      // Return the expression directly
      return ast.body[0].expression;
    } else if (ast.body[0].type === 'FunctionDeclaration') {
      // Turn function declaration into function expression
      ast.body[0].type = 'FunctionExpression';
      return ast.body[0];
    }
  }

  // Wrap with closure
  return {
    type: 'CallExpression',
    callee: {
      type: 'FunctionExpression',
      body: {
        type: 'BlockStatement',
        body: ast.body
      },
      params: []
    },
    arguments: []
  };
};

class ExpressionRewriter extends AstRewriter {
  willRewrite(node) {
    return node.type === 'Identifier' &&
      !!this.template.getExpName(node.name);
  }

  rewrite(node, args) {
    const expName = this.template.getExpName(node.name);

    if (!_.has(args, expName)) {
      throw new Error(`Template argument '${expName}' is required`);
    }

    return args[expName].toExpression();
  }
}

export default ExpressionRewriter;
