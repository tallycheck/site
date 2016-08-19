'use strict';

define(
  function(require, exports, module) {

    var $ = require('jquery');
    var _ = require('underscore');

    class HandlerContainer {
      constructor(initialHandlers){
        var _JustKeys = _.mapObject(initialHandlers, function(val, key) {
          return null;
        });
        _.extend(this, _JustKeys);
        this.pushHandlers(initialHandlers);
      }

      pushHandlers(){
        var _this = this;
        var _handlers = this;
        var handlerNames = _.keys(_handlers);
        if(handlerNames.length == 0){
          return this;
        }
        var newHandlers = _.without(_.flatten(arguments), null, undefined);
        if(newHandlers.length == 0){
          return this;
        }
        _.each(handlerNames, function(name){
          var handlers4Name = _handlers[name];
          if(_.isNull(handlers4Name) || _.isUndefined(handlers4Name)){
            _handlers[name] = [];
          }
          if(!_.isArray(_handlers[name])){
            throw new Error("handler container for '" + name + "' should be an array");
          }
        });
        _.each(newHandlers, function(newHandler){
          var pickedHandler = _.pick(newHandler, handlerNames);
          _.each(handlerNames, function(name){
            var handlers4Name = _handlers[name];
            var handler = pickedHandler[name];
            var handlersToPush =[];
            if(_.isArray(handler)){
              handlersToPush = _.flatten(handler);
            }else if(_.isObject(handler)){
              handlersToPush = [handler];
            }
            _.each(_.without(handlersToPush, null, undefined), function(h){
              handlers4Name.push(h);
            })
          });
        });
        return this;
      }

    }

    exports.HandlerContainer = HandlerContainer;

  });