'use strict';

define(
  function(require, exports, module){
    var _ = require('underscore');

    var Debugger ={
      log : function(enabler /*param*/){
        if(enabler){
          var args = Array.prototype.slice.call(arguments, 1);
          console.log.apply(console, args);
        }
      }
    }

    _.extend(exports, Debugger);
  });