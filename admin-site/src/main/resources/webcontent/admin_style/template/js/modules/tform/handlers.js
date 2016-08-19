define(
  function(require, exports, module) {
    var Debugger = require('debugger');
    var EntityRequest = require('entity-request');
    var HandlerUtils = require('handler-utils');
    var ENABLE_HANDLER_DEBUG = true;

    class TFormHandler {
      onWillRequest(tform) {
      }

      onResultWillProcess(tform, success, response) {
      }

      onSuccess(tform, response) {
      }

      onFail(tform, response) {
      }

      onResultDidProcess(tform, success, response) {
      }

      onError(tform) {
      }

      onComplete(tform) {
      }
    }

    function TFormRequestHandler(tform, tformHandler) {
      return HandlerUtils.insertLeadingArgumentHandler([tform], tformHandler);
    }

    class TFormRequestHandlerCls {
      constructor(tform, tformHandler) {
        this.tform = tform;
        if(arguments.length != 2){
          throw new Error("Parameter size error.");
        }
        this.tformHandler = tformHandler;
      }

      onWillRequest(param){
        this.tformHandler.onWillRequest(this.tform);
      }

      onResultWillProcess(success, data, param) {
        this.tformHandler.onResultWillProcess(this.tform, success, data);
      }

      onSuccess(data, param) {
        this.tformHandler.onSuccess(this.tform, data);
      }

      onFail(data, param) {
        this.tformHandler.onFail(this.tform, data);
      }

      onResultDidProcess(success, data, param) {
        this.tformHandler.onResultDidProcess(this.tform, success, data);
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

    var SubmitTFormHandlers = {
      UpdateOnFail: {
        onFail: function (tform, response) {
          tform.updateStateBy(response.data);
        },
      },
      ReloadOnSuccess: {
        onSuccess: function (tform, response) {
          var url = redirectUrl(response);
          var readParam = {url: url};
          EntityRequest.read(readParam, null, {
            onWillRequest: function (){
              tform.setState({loading: true});
            },
            onSuccess: function (data, param) {
              tform.updateStateBy(data.data, true);
            },
            onFail: function (data, param) {
              window.location.replace(url);
            },
            onComplete: function () {
              tform.setState({loading: false});
            }
          });
        },
      },
      RedirectOnSuccess: {
        onSuccess: function (tform, response) {
          redirect(response);
        },
      }
    }

    var DeleteTFormHandlers = {
      RedirectOnSuccess : {
        onSuccess: function (tform, response) {
          redirect(response);
        }
      }
    }

    exports.TFormHandler = TFormHandler;
    exports.TFormRequestHandler = TFormRequestHandler;
    exports.SubmitTFormHandlers = SubmitTFormHandlers;
    exports.DeleteTFormHandlers = DeleteTFormHandlers;
  });