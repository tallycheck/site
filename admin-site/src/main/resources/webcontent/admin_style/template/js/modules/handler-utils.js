'use strict';

define(
  function(require, exports, module) {
    var _ = require('underscore');

    var BatchExecuteProxy = {
      get: function(target, method, receiver){
        //target : {ah: null, extra: []}
        var _leader = target.leader;
        var _followers = target.followers;

        var _leaderFunc = _leader[method];
        if(_.isFunction(_leaderFunc)){
          var ehfs = _.without(_.map(_followers, function(eh){
            var ef = eh[method];
            return _.isFunction(ef)? [eh, ef] : null;
          }), undefined, null);
          if(ehfs.length == 0) {
            return _leaderFunc;
          }
          return function(){
            var args = arguments;
            var leaderRet = _leaderFunc.apply(_leader, args);
            _.each(ehfs, function(ehf){
              var eh = ehf[0];
              var ef = ehf[1];
              ef.apply(eh, args);
            })
            return leaderRet;
          }
        }
        return _leaderFunc;
      }
    };

    function batchExecutor(leader, followers /*optional*/){
      var l = leader;
      var fs = _.without(_.flatten(_.rest(arguments, 1)), null, undefined);
      var params = {leader:l, followers:fs};
      return new Proxy(params, BatchExecuteProxy);
    }

    exports.handlerExecutor = batchExecutor;


    var InsertLeadingArgumentsCallProxy = {
      get: function(target, method, receiver){
        var leadingArgs = target.leadingArgs; //array
        var withLeadingHandler =target.withLeadingHandler;

        var func = withLeadingHandler[method];
        if(_.isFunction(func)){
          return function(){
            var args = Array.prototype.slice.call(arguments,0);
            Array.prototype.unshift.apply(args, leadingArgs);
            return func.apply(withLeadingHandler, args)
          }
        }
        return func;
      }
    }
    //returns a without leading handler
    function insertLeadingArgumentHandler(leadingArgs, withLeadingHandler) {
      if(arguments.length != 2){
        throw new Error("Parameter size error.");
      }
      var target = {
        leadingArgs : leadingArgs,
        withLeadingHandler : withLeadingHandler
      }
      return new Proxy(target, InsertLeadingArgumentsCallProxy);
    }
    exports.insertLeadingArgumentHandler = insertLeadingArgumentHandler;

  });
