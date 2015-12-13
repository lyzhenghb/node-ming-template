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

export default AstRewriter;
