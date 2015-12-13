import esprima from 'esprima';
import estraverse from 'estraverse';
import escodegen from 'escodegen';
import _ from 'lodash';
import Argument from './argument';

import StatementRewriter from './statement-rewriter';
import ExpressionRewriter from './expression-rewriter';
import IdentifierRewriter from './identifier-rewriter';
import StringLiteralRewriter from './string-literal-rewriter';

class MingTemplate {
  constructor(template) {
    this.ast = esprima.parse(template, {
      comment: true,
      loc: true
    });
    this.mings = _.chain(this.ast.comments)
      .filter(c => c.type === 'Line')
      .map(c => c.value.match(/^\s*@ming\s+(\w+)\s+(.*)$/))
      .compact()
      .map(m => [m[1], m[2]])
      .zipObject()
      .value();
    this.rewriters = [
      new StatementRewriter(this),
      new ExpressionRewriter(this),
      new IdentifierRewriter(this),
      new StringLiteralRewriter(this)
    ];
  }

  getExpName(name) {
    const m = name.match(/^\$(\w+)\$$/);
    return m && _.has(this.mings, m[1]) ? m[1] : null;
  }

  render(args) {
    const ast = _.cloneDeep(this.ast);
    const argHash = _.mapValues(args, arg => new Argument(arg));

    estraverse.replace(ast, {
      enter: node => {
        let n = node;

        _.forEach(this.rewriters, (rewriter) => {
          if (rewriter.willRewrite(node)) {
            n = rewriter.rewrite(node, argHash);
            return false;
          }
        });

        return n;
      }
    });

    return escodegen.generate(ast, {
      format: {
        indent: {
          style: '  '
        }
      }
    });
  }
}
export default MingTemplate;
