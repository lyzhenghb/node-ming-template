import esprima from 'esprima';
import estraverse from 'estraverse';
import escodegen from 'escodegen';
import _ from 'lodash';

function getWholeExpName(name) {
  const m = name.match(/^\$(\w+)\$$/);
  return m && m[1];
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

  renderStatement(arg) {
    if (arg.statement) {
      return this.renderStatement(arg.statement);
    }

    const ast = _.isString(arg) ? esprima.parse(arg) : arg;

    if (_.size(ast.body) === 1) {
      return ast.body[0];
    } else {
      return {
        type: 'BlockStatement',
        body: ast.body
      };
    }
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
    estraverse.replace(ast, {
      enter: node => {
        let n = node;
        let expName = null;

        if (n.type === 'ExpressionStatement' && n.expression.type === 'Identifier') {
          expName = getWholeExpName(n.expression.name);
          if (_.has(this.mings, expName)) {
            n = this.renderStatement(args[expName]);
          }
        } else if (n.type === 'Identifier') {
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
