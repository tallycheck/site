define(
  function(require, exports, module) {
    class TGridHandler {
      onSuccess(tgrid, response) {
      }

      onFail(tgrid, response) {
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

      onSuccess(data, param) {
        this.tgridHandler.onSuccess(this.tgrid, data);
      }

      onFail(data, param) {
        this.tgridHandler.onFail(this.tgrid, data);
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