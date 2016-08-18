define(
  function(require, exports, module) {
    var Debugger = require('debugger');
    var EntityRequest = require('entity-request');
    var ENABLE_HANDLER_DEBUG = true;

    class TFormHandler {
      onWillRequest(tform) {
      }

      onSuccess(tform, response) {
      }

      onFail(tform, response) {
      }

      onError(tform) {
      }

      onComplete(tform) {
      }
    }

    class TFormRequestHandler {
      constructor(tform, tformHandler) {
        this.tform = tform;
        this.tformHandler = tformHandler;
      }

      onWillRequest(param){
        this.tformHandler.onWillRequest(this.tform);
      }

      onSuccess(data, param) {
        this.tformHandler.onSuccess(this.tform, data);
      }

      onFail(data, param) {
        this.tformHandler.onFail(this.tform, data);
      }

      onError() {
        this.tformHandler.onError(this.tform);
      }

      onComplete() {
        this.tformHandler.onComplete(this.tform);
      }
    }

    function redirectUrl(url){
      if (_.isObject(url)) {
        if (url.operation == 'redirect') {
          url = url.url;
        }
      }
      return (_.isString(url) ? url : '');
    }
    function redirect(url) {
      url = redirectUrl(url);
      Debugger.log(ENABLE_HANDLER_DEBUG, "REDIRECT: " + url);

      if (_.isString(url)) {
        window.location.replace(url);
      }
    }

    var TFormSubmitHandlers = {
      UpdateOnFail: {
        onFail: function (tform, response) {
          tform.updateStateBy(response.data);
        }
      },
      ReloadOnSuccess: {
        onWillRequest: function (tform){
          tform.setState({loading: true});
        },
        onSuccess: function (tform, response) {
          tform.setState({loading: true}, function(){
            var url = redirectUrl(response);
            var readParam = {url : url};
            EntityRequest.read(readParam, null, {
              onSuccess:function(data, param){
                tform.updateStateBy(data.data, true);
              },
              onFail:function(data, param){
                window.location.replace(url);
              }
            });
          });
        },
      },
      RedirectOnSuccess: {
        onSuccess: function (tform, response) {
          redirect(response);
        },
      }
    }

    var TFormDeleteHandlers = {
      RedirectOnSuccess : {
        onSuccess: function (tform, response) {
          redirect(response);
        }
      }
    }

    exports.TFormHandler = TFormHandler;
    exports.TFormRequestHandler = TFormRequestHandler;
    exports.TFormSubmitHandlers = TFormSubmitHandlers;
    exports.TFormDeleteHandlers = TFormDeleteHandlers;
  });