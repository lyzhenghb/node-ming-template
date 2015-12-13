import esprima from 'esprima';
import _ from 'lodash';

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

export default Argument;
