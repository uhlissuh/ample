module.exports =
function catchErrors (app) {
  for (const methodName of ['get', 'post', 'put', 'delete']) {
    const originalMethod = app[methodName];
    app[methodName] = function(url, handlerFunction) {
      if (typeof handlerFunction === 'function') {
        return originalMethod.call(this, url, (req, res, next) => {
          const promise = handlerFunction(req, res, next);
          if (promise && promise.catch) promise.catch(error => next(error));
        });
      } else {
        return originalMethod.apply(this, arguments);
      }
    };
  }
};
