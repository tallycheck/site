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

      onComplete() {
        console.log("Action complete");
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

    var PostEntityDefaultParam = {
      url : '',
      entityData : {}
    };
    class PostEntityHandler extends ActionHandler {
    };


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
        },
        complete:function(jqXHR, textStatus){
          handler.onComplete();
        }
      }
      ajax(ajaxOptions);
    }
    exports.createGet = _createGet;
    exports.CreateGetHandler = CreateGetHandler;

    var CreateDefaultParam = _.extend({}, PostEntityDefaultParam);
    class CreateHandler extends PostEntityHandler {
    }
    var _create = function (param, handler) {
      if (!handler instanceof CreateHandler)
        throw new Error("Type Error");
      var fParam = _.extend({}, CreateDefaultParam, param);
      var ajaxOptions = {
        url: fParam.url,
        type: "post",
        data: fParam.entityData,
        success: function (data, textStatus, jqXHR, opts) {
          if(response.success){
            handler.onSuccess(_this, response);
          }else{
            handler.onFail(_this, response);
          }
        },
        error: function () {
          handler.onError();
        },
        complete:function(jqXHR, textStatus){
          handler.onComplete();
        }
      };
      ajax(ajaxOptions);
    }
    exports.create = _create;
    exports.CreateHandler = CreateHandler;

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
        },
        complete:function(jqXHR, textStatus){
          handler.onComplete();
        }
      }
      ajax(ajaxOptions);
    }
    exports.read = _read;
    exports.ReadHandler = ReadHandler;

    var UpdateDefaultParam = _.extend({}, PostEntityDefaultParam);
    class UpdateHandler extends PostEntityHandler {
    }
    var _update = function (param, handler) {
      if (!handler instanceof UpdateHandler)
        throw new Error("Type Error");
      var fParam = _.extend({}, UpdateDefaultParam, param);
      var ajaxOptions = {
        url: fParam.url,
        type: "post",
        data: fParam.entityData,
        success: function (data, textStatus, jqXHR, opts) {
          if(response.success){
            handler.onSuccess(_this, response);
          }else{
            handler.onFail(_this, response);
          }
        },
        error: function () {
          handler.onError();
        },
        complete:function(jqXHR, textStatus){
          handler.onComplete();
        }
      };
      ajax(ajaxOptions);
    }
    exports.update = _update;
    exports.UpdateHandler = UpdateHandler;

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
        },
        complete:function(jqXHR, textStatus){
          handler.onComplete();
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
    var QueryUriPersistentParams = [
      QueryUriReservedParams.PageSize
    ];
    var QueryDefaultParam = {
      url : '',
      originUrl:undefined,
      queryUri: '',
      pageSize: undefined,
      parameter : '',
      cparameter: '',
      range: undefined,
    }
    class QueryHandler extends ActionHandler {
      buildUrl(param){
        if(!!param.url){
          if(_.isString(param.url)) {
            return param.url;
          } else if (_.isFunction(param.url)){
            return param.url();
          }
        }
        var queryUrl = (param.originUrl === undefined) ? param.queryUri :
          UrlUtil.connectUrl(param.originUrl, param.queryUri)
        var pageSize = param.pageSize;
        var parameter = param.parameter;
        var cparameter = param.cparameter;
        var range = param.range;

        var allParam = UrlUtil.ParamsUtils.connect(cparameter, parameter);
        var url = UrlUtil.getUrlWithParameterString(allParam, null, queryUrl);
        if(range){
          var start = range.lo; start = (start < 0)? null:start;
          url = UrlUtil.getUrlWithParameter(QueryUriReservedParams.StartIndex, start, null, url);
          pageSize = Math.min(range.width(), pageSize);
        }
        if(pageSize)
          url = UrlUtil.getUrlWithParameter(QueryUriReservedParams.PageSize, pageSize, null, url);
        return url;
      }
    }
    var _query = function (param, handler) {
      if (!handler instanceof QueryHandler)
        throw new Error("Type Error");
      var fParam = _.extend({}, QueryDefaultParam, param);
      var url = handler.buildUrl(fParam);
      if(url == null) return;

      console.log("will load url: " + url);
      var ajaxOptions = {
        url: url,
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
        },
        complete:function(jqXHR, textStatus){
          handler.onComplete();
        }
      }
      ajax(ajaxOptions);
    }
    exports.query = _query;
    exports.QueryUriReservedParams = QueryUriReservedParams;
    exports.QueryUriPersistentParams = QueryUriPersistentParams;
    exports.QueryHandler = QueryHandler;
  });