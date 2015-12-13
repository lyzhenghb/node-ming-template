import esprima from 'esprima';
import estraverse from 'estraverse';
import escodegen from 'escodegen';
import _ from 'lodash';

function getWholeExpName(name) {
  const m = name.match(/^\$(\w+)\$$/);
  return m && m[1];
}

class AstRewriter {
  constructor(template) {
    this.template = template;
  }

  willRewrite(/* node */) {
    return false;
  }

  rewrite(node/* , args */) {
    return node;
  }
}

class Argument {
  constructor(arg) {
    if (_.isPlainObject(arg)) {
      this.flavers = arg;
    } else if (_.isString(arg)) {
      this.flavers = { default: arg };
    } else {
      throw new Error('Illegal argument.');
    }
  }

  getFlaver(flv) {
    return this.flavers[flv] || this.flavers.default || null;
  }

  getAstWithFlaver(flv) {
    const script = this.getFlaver(flv);
    if (!_.isString(script)) {
      throw new Error(`Undefined or illegal flaver '${flv}'`);
    }
    return esprima.parse(script);
  }
}

Argument.prototype.toStatement = function () {
  const ast = this.getAstWithFlaver('statement');

  return _.size(ast.body) === 1 ? ast.body[0] : {
    type: 'BlockStatement',
    body: ast.body
  };
};

class ExpressionStatementRewriter extends AstRewriter {
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
      new ExpressionStatementRewriter(this)
    ];
  }

  getExpName(name) {
    const m = name.match(/^\$(\w+)\$$/);
    return m && _.has(this.mings, m[1]) ? m[1] : null;
  }

  renderString(str, args) {
    return str.replace(/\$(\w+)\$/, (match, p1) => {
      return _.has(this.mings, p1) ? _.result(args, p1) : match;
    });
  }

  renderIdentifier(name, args) {
    return this.renderString(name, _.mapValues(
      args,
      a => _.result(a, 'identifier', a.toString())
    ));
  }

  renderLiteral(value, args) {
    return this.renderString(value, _.mapValues(
      args,
      a => _.result(a, 'literal', a.toString())
    ));
  }

  renderExpression(arg) {
    if (arg.expression) {
      return this.renderExpression(arg.expression);
    }

    const ast = _.isString(arg) ? esprima.parse(arg) : arg;

    if (_.size(ast.body) === 1) {
      if (ast.body[0].type === 'ExpressionStatement') {
        return ast.body[0].expression;
      } else if (ast.body[0].type === 'FunctionDeclaration') {
        ast.body[0].type = 'FunctionExpression';
        return ast.body[0];
      }
    }
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
  }

  render(args) {
    const ast = _.cloneDeep(this.ast);
    const argHash = _.mapValues(args, arg => new Argument(arg));

    estraverse.replace(ast, {
      enter: node => {
        let n = node;
        let expName = null;

        _.forEach(this.rewriters, (rewriter) => {
          if (rewriter.willRewrite(node)) {
            n = rewriter.rewrite(node, argHash);
            return false;
          }
        });

        if (n.type === 'Identifier') {
          expName = getWholeExpName(n.name);
          if (_.has(this.mings, expName)) {
            n = this.renderExpression(args[expName]);
          } else {
            n.name = this.renderIdentifier(n.name, args);
          }
        } else if (n.type === 'Literal' && _.isString(n.value)){
          const newValue = this.renderLiteral(n.value, args);
          if (newValue !== n.value) {
            n.value = newValue;
            delete n.raw;
          }
        }
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
