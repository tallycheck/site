define(
  function(require, exports, module) {
    var Debugger = require('debugger');
    var EntityRequest = require('entity-request');
    var ENABLE_HANDLER_DEBUG = true;

    class ModalHandler {
      onWillRequest(modal) {
      }

      onSuccess(modal, response) {
      }

      onFail(modal, response) {
      }

      onError(modal) {
      }

      onComplete(modal) {
      }
    }

    class ModalRequestHandler {
      constructor(modal, modalHandler) {
        this.modal = modal;
        this.modalHandler = modalHandler;
      }

      onWillRequest(param){
        this.modalHandler.onWillRequest(this.modal);
      }

      onSuccess(data, param) {
        this.modalHandler.onSuccess(this.modal, data);
      }

      onFail(data, param) {
        this.modalHandler.onFail(this.modal, data);
      }

      onError() {
        this.modalHandler.onError(this.modal);
      }

      onComplete() {
        this.modalHandler.onComplete(this.modal);
      }
    }

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