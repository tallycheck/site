/**
 * Created by gaoyuan on 8/12/16.
 */
define(
  function(require, exports, module) {
    var _ = require('underscore');
    var ajax = require('ajax');
    var UrlUtil = require('url-utility');

    class ActionHandler {

      onSuccess(data, param) {
        console.log("Action success");
      }

      onFail(data, param) {
        console.log("Action fail");
      }

      onError() {
        console.log("Action error");
      }

      redirect(url) {
        if (_.isObject(url)) {
          if (url.operation == 'redirect') {
            url = url.url;
          }
        }
        if (_.isString(url)) {
          window.location.replace(url);
        }
      }
    }
    var makeActionHandler = function (handlerObj, type) {
      if (type === undefined) type = ActionHandler;
      var handler = new type();
      _.extend(handler, handlerObj);
      return handler;
    }
    exports.ActionHandler = ActionHandler;
    exports.makeActionHandler = makeActionHandler;

    var CreateReadParam = {
      url: ""
    }
    class CreateGetHandler extends ActionHandler {
    }
    var _createGet = function (param, handler) {
      if (!handler instanceof CreateGetHandler)
        throw new Error("Type Error");
      var fParam = _.extend({}, CreateReadParam, param);
      var ajaxOptions = {
        url: fParam.url,
        type: "get",
        success: function (data, textStatus, jqXHR, opts) {
          if (typeof data == "object") {
            var operation = data.operation;
            if (operation == 'redirect') {
            } else {
              handler.onSuccess(data, fParam);
            }
          }
        },
        error: function () {
          handler.onError();
        }
      }
      ajax(ajaxOptions);
    }
    exports.createGet = _createGet;
    exports.CreateGetHandler = CreateGetHandler;

    var ReadDefaultParam = {
      url: ""
    }
    class ReadHandler extends ActionHandler {
      onSuccess(data, param) {
        console.log("Read success");
      }

      onFail(data, param) {
        console.log("Read fail");
      }

      onError() {
        console.log("Read error");
      }
    }
    var _read = function (param, handler) {
      if (!handler instanceof ReadHandler)
        throw new Error("Type Error");
      var fParam = _.extend({}, ReadDefaultParam, param);
      var ajaxOptions = {
        url: fParam.url,
        type: "get",
        success: function (data, textStatus, jqXHR, opts) {
          if (typeof data == "object") {
            var operation = data.operation;
            if (operation == 'redirect') {
            } else {
              handler.onSuccess(data, fParam);
            }
          }
        },
        error: function () {
          handler.onError();
        }
      }
      ajax(ajaxOptions);
    }
    exports.read = _read;
    exports.ReadHandler = ReadHandler;

    var DeleteDefaultParam = {
      url: "",
      csrf: "",
      type: undefined,
      ceilingType: undefined,
      successRedirect: false
    }
    class DeleteHandler extends ActionHandler {
      onSuccess(data, param) {
        console.log("Delete success");
      }

      onFail(data, param) {
        console.log("Delete fail");
      }

      onError() {
        console.log("Delete error");
      }
    }
    var _delete = function (param, handler) {
      if (!handler instanceof DeleteHandler)
        throw new Error("Type Error");
      var fParam = _.extend({}, DeleteDefaultParam, param);
      var postData = {
        _csrf: fParam.csrf,
        type: fParam.type,
        ceilingType: fParam.ceilingType
      };

      var ajaxOptions = {
        url: fParam.url,
        type: "post",
        data: postData,
        success: function (data, textStatus, jqXHR, opts) {
          if (typeof data == "object") {
            if (data.success) {
              if (param.successRedirect) {
                handler.redirect(data);
              }
              handler.onSuccess(data, fParam);
            } else {
              handler.onFail(data, fParam);
            }
          }
        },
        error: function () {
          handler.onError();
        }
      };
      ajax(ajaxOptions);
    }
    exports.delete = _delete;
    exports.DeleteHandler = DeleteHandler;

    var QueryUriReservedParams = {
      StartIndex: 'startIndex',
      PageSize: 'pageSize'
    };
    var QueryUriPersistentParams = [QueryUriReservedParams.PageSize];
    var QueryDefaultParam = {
      queryUri: '',
      pageSize: undefined,
      parameter : '',
      cparameter:'',
      range:'',
    }
    class QueryHandler extends ActionHandler {

    }
    var _query = function (param, handler) {
    }
    exports.query = _query;
    exports.QueryUriReservedParams = QueryUriReservedParams;
    exports.QueryUriPersistentParams = QueryUriPersistentParams;
    exports.QueryHandler = QueryHandler;
  });