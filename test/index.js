import { expect } from 'chai';
import MingTemplate from '../lib';

describe('MingTemplate', function () {

  it('should be a class', () => {
    expect(MingTemplate).to.be.a('function');
    expect(new MingTemplate()).to.be.instanceof(MingTemplate);
  });

  const template = `
    //
    // @ming NAME some body's name
    // @ming STATEMENT some statements
    //
    function hello_$NAME$() {
      console.log('Hello, $NAME$');
      $STATEMENT$;
    }
  `;

  it('should collect the MINGs', () => {
    const tmpl = new MingTemplate(template);
    expect(tmpl.mings).to.be.deep.equal({
      NAME: 'some body\'s name',
      STATEMENT: 'some statements'
    });
  });

  it('should render the template', () => {
    const tmpl = new MingTemplate(template);
    const result = tmpl.render({
      NAME: 'World',
      STATEMENT: 'console.log("lalala...")'
    });
    const exp = `function hello_World() {\n    console.log('Hello, World');\n    console.log('lalala...');\n}`;
    expect(result).to.equal(exp);

  });

});
