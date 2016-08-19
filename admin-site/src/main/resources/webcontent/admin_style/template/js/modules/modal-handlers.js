define(
  function(require, exports, module) {
    var Debugger = require('debugger');
    var EntityRequest = require('entity-request');
    var HandlerUtils = require('handler-utils');
    var ENABLE_HANDLER_DEBUG = true;

    class ModalHandler {
      onWillRequest(modal) {
      }

      onResultWillProcess(modal, success, response) {
      }

      onSuccess(modal, response) {
      }

      onFail(modal, response) {
      }

      onResultDidProcess(modal, success, response) {
      }

      onError(modal) {
      }

      onComplete(modal) {
      }
    }


    class _ModalRequestHandler {
      constructor(modal, modalHandler) {
        this.modal = modal;
        if(arguments.length != 2){
          throw new Error("Parameter size error.");
        }
        this.modalHandler = modalHandler;
      }

      onWillRequest(param) {
        this.modalHandler.onWillRequest(this.modal);
      }

      onResultWillProcess(success, data, param) {
        this.modalHandler.onResultWillProcess(this.modal, success, data);
      }

      onSuccess(data, param) {
        this.modalHandler.onSuccess(this.modal, data);
      }

      onFail(data, param) {
        this.modalHandler.onFail(this.modal, data);
      }

      onResultDidProcess(success, data, param) {
        this.modalHandler.onResultDidProcess(this.modal, success, data);
      }

      onError() {
        this.modalHandler.onError(this.modal);
      }

      onComplete() {
        this.modalHandler.onComplete(this.modal);
      }
    }

    var ModalRequestHandlerComplex = function(modal, modalHandler){
      return new _ModalRequestHandler(modal, modalHandler);
    }

    function ModalRequestHandlerEasy(modal, modalHandler) {
      return HandlerUtils.insertLeadingArgumentHandler([modal], modalHandler);
    }

    var ModalRequestHandler = ModalRequestHandlerEasy;

    var ModalHandlers = {
      HideOnSuccess: {
        onSuccess: function (modal, response) {
          modal.hide();
        }
      }
    }

    exports.ModalHandler = ModalHandler;
    exports.ModalRequestHandler = ModalRequestHandler;
    exports.ModalHandlers = ModalHandlers;
  });