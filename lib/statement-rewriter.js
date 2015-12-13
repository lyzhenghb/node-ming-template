import Argument from './argument';
import AstRewriter from './ast-rewriter';
import _ from 'lodash';

Argument.prototype.toStatement = function () {
  const ast = this.getAstWithFlaver('statement');

  return _.size(ast.body) === 1 ? ast.body[0] : {
    type: 'BlockStatement',
    body: ast.body
  };
};

class StatementRewriter extends AstRewriter {
  willRewrite(node) {
    return node.type === 'ExpressionStatement' &&
      node.expression.type === 'Identifier' &&
      !!this.template.getExpName(node.expression.name);
  }

  rewrite(node, args) {
    const expName = this.template.getExpName(node.expression.name);

    if (!_.has(args, expName)) {
      throw new Error(`Template argument '${expName}' is required`);
    }

    return args[expName].toStatement();
  }
}

export default StatementRewriter;
