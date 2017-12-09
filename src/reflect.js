const utils = require("./utils");

function advice(fn){
  fn.advice = 1;
  return fn;
}

function aspect(fn){
  return function(props) {
    return Object.keys(props).reduce(fn, props)
  };
};

function wove(target, props){
  const woved = Object.assign({}, props);

  for (let key in woved) {
    if(woved[key] instanceof Array && utils.isValidArraySignature(woved[key])) {
      woved[key] = createProxyFn(target, key, woved[key]);
    }
  }
  return woved;
}

function createProxyFn(target, key, functionStack) {
  return function() {
    let adviceIndex = -1;
    function commitNext() {
      adviceIndex++;
      if (functionStack[adviceIndex]) {
        const currentEntry = functionStack[adviceIndex];
        if (!utils.isMethod(currentEntry)) {
          currentEntry.call(undefined, adviceMetadata);
        } else if (!adviceMetadata.prevented) {
          try {
            adviceMetadata.result = currentEntry.apply(adviceMetadata.scope, adviceMetadata.args);
          } catch (e) {
            adviceMetadata.exception = e;
          }
        }
        if (!utils.isAsync(currentEntry)) adviceMetadata.commit();
      } else {
        if(adviceMetadata.exception) throw adviceMetadata.exception;
      }
    }

    const adviceMetadata = {
      args: Array.prototype.slice.call(arguments),
      scope: this,
      key: key,
      method: utils.getMethodFromArraySignature(functionStack),
      target: target,
      exception: undefined,
      prevented: undefined,
      result: undefined,
      commit: commitNext,
      prevent: function() {
        this.prevented = true;
      },
      handle: function() {
        const ext = this.exception;
        delete this.exception;
        return ext;
      },
      break: function() {
        adviceIndex = functionStack.findIndex(utils.isMethod) - 1;
      }
    }

    commitNext();

    return adviceMetadata.result;
  }
}

module.exports = {
  advice: advice,
  aspect: aspect,
  wove: wove,
  createProxyFn: createProxyFn,
};
