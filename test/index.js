import { expect } from 'chai';
import MingTemplate from '../lib';

describe('MingTemplate', function () {

  it('should be a class', () => {
    expect(MingTemplate).to.be.a('function');
    expect(new MingTemplate()).to.be.instanceof(MingTemplate);
  });

});
