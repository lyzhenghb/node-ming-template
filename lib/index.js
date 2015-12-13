import esprima from 'esprima';
import estraverse from 'estraverse';
import escodegen from 'escodegen';
import _ from 'lodash';

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

  toString() {
    return this.getFlaver('string');
  }
}

Argument.prototype.toStatement = function () {
  const ast = this.getAstWithFlaver('statement');

  return _.size(ast.body) === 1 ? ast.body[0] : {
    type: 'BlockStatement',
    body: ast.body
  };
};

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
