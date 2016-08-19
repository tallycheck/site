define(
  function(require, exports, module) {
    var HandlerUtils = require('handler-utils');

    class TGridHandler {
      onWillRequest(tgrid) {
      }

      onResultWillProcess(tgrid, success, response) {
      }

      onSuccess(tgrid, response) {
      }

      onFail(tgrid, response) {
      }

      onResultDidProcess(tgrid, success, response) {
      }

      onError(tgrid) {
      }

      onComplete(tgrid) {
      }
    }

    function TGridRequestHandler(tgrid, tgridHandler) {
      return HandlerUtils.insertLeadingArgumentHandler([tgrid], tgridHandler);
    }

    class TGridRequestHandlerCls {
      constructor(tgrid, tgridHandler) {
        this.tgrid = tgrid;
        if (arguments.length != 2) {
          throw new Error("Parameter size error.");
        }
        this.tgridHandler = tgridHandler;
      }

      onWillRequest(param) {
        this.tgridHandler.onWillRequest(this.tgrid);
      }

      onResultWillProcess(success, data, param) {
        this.tgridHandler.onResultWillProcess(this.tgrid, success, data);
      }

      onSuccess(data, param) {
        this.tgridHandler.onSuccess(this.tgrid, data);
      }

      onFail(data, param) {
        this.tgridHandler.onFail(this.tgrid, data);
      }

      onResultDidProcess(success, data, param) {
        this.tgridHandler.onResultDidProcess(this.tgrid, success, data);
      }

      onError() {
        this.tgridHandler.onError(this.tgrid);
      }

      onComplete() {
        this.tgridHandler.onComplete(this.tgrid);
      }
    }

    var TGridSubmitHandlers = {
      UpdateOnFail: {
        onFail: function (tgrid, response) {
          tgrid.updateStateBy(response.data);
        }
      },
      RedirectOnSuccess: {
        onFail: function (tgrid, response) {
          tgrid.updateStateBy(response.data);
        }
      }
    }

    exports.TGridHandler = TGridHandler;
    exports.TGridRequestHandler = TGridRequestHandler;
    exports.TGridSubmitHandlers = TGridSubmitHandlers;
  });