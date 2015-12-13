import _ from 'lodash';
import AstRewriter from './ast-rewriter';

class StringLiteralRewriter extends AstRewriter {
  willRewrite(node) {
    return node.type === 'Literal' && _.isString(node.value);
  }

  rewrite(node, args) {
    const newValue = node.value.replace(/\$\w+\$/, match => {
      const expName = this.template.getExpName(match);

      if (!expName) {
        return match;
      }

      if (!_.has(args, expName)) {
        throw new Error(`Template argument '${expName}' is required`);
      }

      return args[expName].toString();
    });

    if (newValue !== node.value) {
      node.value = newValue;
      delete node.raw;
    }

    return node;
  }
}

export default StringLiteralRewriter;
