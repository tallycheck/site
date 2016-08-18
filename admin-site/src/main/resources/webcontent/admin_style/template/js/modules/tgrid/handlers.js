define(
  function(require, exports, module) {
    class TGridHandler {
      onWillRequest(tgrid) {
      }

      onResultWillProcess(success, tform, response) {
      }

      onSuccess(tgrid, response) {
      }

      onFail(tgrid, response) {
      }

      onResultDidProcess(success, tform, response) {
      }

      onError(tgrid) {
      }

      onComplete(tgrid) {
      }
    }

    class TGridRequestHandler {
      constructor(tgrid, tgridHandler) {
        this.tgrid = tgrid;
        this.tgridHandler = tgridHandler;
      }

      onWillRequest(param){
        this.tgridHandler.onWillRequest(this.tgrid);
      }

      onResultWillProcess(success, data, param) {
        this.tgridHandler.onResultWillProcess(success, this.tform, data);
      }

      onSuccess(data, param) {
        this.tgridHandler.onSuccess(this.tgrid, data);
      }

      onFail(data, param) {
        this.tgridHandler.onFail(this.tgrid, data);
      }

      onResultDidProcess(success, data, param) {
        this.tgridHandler.onResultDidProcess(success, this.tform, data);
      }

      onError() {
        this.tgridHandler.onError(this.tgrid);
      }

      onComplete() {
        this.tgridHandler.onComplete(this.tgrid);
      }
    }

    var TGridSubmitHandlers = {
      UpdateOnFail : {
        onFail: function (tgrid, response) {
          tgrid.updateStateBy(response.data);
        }
      },
      RedirectOnSuccess :{
        onFail: function (tgrid, response) {
          tgrid.updateStateBy(response.data);
        }
      }
    }

    exports.TGridHandler = TGridHandler;
    exports.TGridRequestHandler=TGridRequestHandler;
    exports.TGridSubmitHandlers = TGridSubmitHandlers;
  });