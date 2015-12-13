import _ from 'lodash';
import AstRewriter from './ast-rewriter';

class IdentifierRewriter extends AstRewriter {
  willRewrite(node) {
    return node.type === 'Identifier';
  }

  rewrite(node, args) {
    node.name = node.name.replace(/\$\w+\$/, match => {
      const expName = this.template.getExpName(match);

      if (!expName) {
        return match;
      }

      if (!_.has(args, expName)) {
        throw new Error(`Template argument '${expName}' is required`);
      }

      return args[expName].toString();
    });

    return node;
  }
}

export default IdentifierRewriter;
