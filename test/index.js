import { expect } from 'chai';
import MingTemplate from '../lib';
import Promise from 'bluebird';
import _ from 'lodash';
import fs from 'fs';
import path from 'path';

const p$readFile = Promise.promisify(fs.readFile);

describe('MingTemplate', () => {

  it('should be a class', () => {
    expect(MingTemplate).to.be.a('function');
    expect(new MingTemplate()).to.be.instanceof(MingTemplate);
  });

  it('should collect the MINGs', (done) => {
    p$readFile(path.join(__dirname, 'files', 'hello.template.js'))
      .then(buffer => buffer.toString())
      .then(content => new MingTemplate(content).mings)
      .then(mings => {
        expect(mings).to.be.deep.equal({
          NAME: 'some body\'s name',
          STATEMENT: 'some statements',
          declarations: 'variable declarartions',
          funcdecl: 'function declaration'
        });
        done();
      })
      .catch(done);
  });

  describe('render', () => {
    function testCase(message, options) {
      it(`should ${message}`, (done) => {
        _.chain(options)
          .pick('template', 'output')
          .map(name => path.join(__dirname, 'files', name))
          .map(name => p$readFile(name))
          .thru(Promise.all)
          .value()
          .map(buffer => buffer.toString().trim())
          .then(contents => {
            const tmpl = new MingTemplate(contents[0]);
            expect(tmpl.render(options.input)).to.equal(contents[1]);
            done();
          })
          .catch(done);
      });
    }

    testCase('render the general template', {
      template: 'hello.template.js',
      input: {
        NAME: 'World',
        STATEMENT: {
          statement: 'console.log("lalala...");',
          expression: '"console.log(\'lalala...\');"'
        },
        declarations: 'var a = 1; var b = 2;',
        funcdecl: {
          expression: 'function fun() {}'
        }
      },
      output: 'hello.general.output.js'
    });

  });

});
