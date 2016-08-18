'use strict';

define(
  function(require, exports, module) {
    var _ = require('underscore');


    var HandlerExecuteProxy = {
      get: function(target, method, receiver){
        //target : {ah: null, extra: []}
        var main = target.main;
        var extras = target.extras;

        var mainFunc = main[method];
        if(_.isFunction(mainFunc)){
          var ehfs = _.without(_.map(extras, function(eh){
            var ef = eh[method];
            return _.isFunction(ef)? [eh, ef] : null;
          }), undefined, null);
          if(ehfs.length == 0) {
            return mainFunc;
          }
          return function(){
            var args = arguments;
            var mainRet = mainFunc.apply(main, args);
            _.each(ehfs, function(ehf){
              var eh = ehf[0];
              var ef = ehf[1];
              ef.apply(eh, args);
            })
            return mainRet;
          }
        }
        return mainFunc;
      }
    };

    function handlerExecutor(mainHandler, extraHandlers /*optional*/){
      var main = mainHandler;
      var extras = _.without(_.flatten(_.rest(arguments, 1)), null, undefined);
      var params = {main:main, extras:extras};
      return new Proxy(params, HandlerExecuteProxy);
    }

    exports.handlerExecutor = handlerExecutor;
  });
