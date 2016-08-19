/**
 * Created by gaoyuan on 8/12/16.
 */
'use strict';

define(
  function(require, exports, module) {
    var _ = require('underscore');
    var ajax = require('ajax');
    var Debugger = require('debugger');
    var UrlUtil = require('url-utility');
    var HandlerUtils = require('handler-utils');
    var actionHandlerExecutor = HandlerUtils.handlerExecutor;
    var ENABLE_REQUEST_DEBUG = true;

    class RequestHandler {
      onWillRequest(param){
        Debugger.log(ENABLE_REQUEST_DEBUG, "Action will request");
      }

      onResultWillProcess(success, data, param) {
        Debugger.log(ENABLE_REQUEST_DEBUG, ("Action Will Process Result: " + (success ? "success" : "fail")));
      }

      onSuccess(data, param) {
        Debugger.log(ENABLE_REQUEST_DEBUG, "Action success");
      }

      onFail(data, param) {
        Debugger.log(ENABLE_REQUEST_DEBUG, "Action fail");
      }

      onResultDidProcess(success, data, param) {
        Debugger.log(ENABLE_REQUEST_DEBUG, ("Action Did Process Result: " + (success ? "success" : "fail")));
      }

      onError() {
        Debugger.log(ENABLE_REQUEST_DEBUG, "Action error");
      }

      onComplete() {
        Debugger.log(ENABLE_REQUEST_DEBUG, "Action complete");
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

    function makeGeneralAjaxOptions(fParam, fHandler){
      return {
        beforeSend: function (jqXHR, settings ){
          fHandler.onWillRequest(fParam);
        },
        success: function (data, textStatus, jqXHR, opts) {
          var response = data;
          var success = !!response.success;
          fHandler.onResultWillProcess(success, response, fParam);
          if (success) {
            fHandler.onSuccess(response, fParam);
          } else {
            fHandler.onFail(response, fParam);
          }
          fHandler.onResultDidProcess(success, response, fParam);
        },
        error: function () {
          fHandler.onError();
        },
        complete: function (jqXHR, textStatus) {
          fHandler.onComplete();
        }
      }
    }

    exports.RequestHandler = RequestHandler;

    var PostEntityDefaultParam = {
      url: '',
      entityData: {},
    };
    class PostEntityHandler extends RequestHandler {
    }

    function ensureHandler(handler, HandlerType){
      handler = handler || new HandlerType();
      if (!handler instanceof HandlerType)
        throw new Error("Type Error");
      return handler;
    }

    var CreateReadDefaultParam = {
      url: ""
    }
    class CreateGetHandler extends RequestHandler {
    }
    var _createGet = function (param, handler, optionalExtraHandlers /*optional*/) {
      handler = ensureHandler(handler, CreateGetHandler);
      var extraHandlers = _.rest(arguments, 2);
      var fParam = _.extend({}, CreateReadDefaultParam, param);
      var fHandler = actionHandlerExecutor(handler, extraHandlers);
      var request = {
        url: fParam.url,
        type: "get"
      }
      var ajaxOptions = _.extend(request, makeGeneralAjaxOptions(fParam, fHandler));
      ajax(ajaxOptions);
    }
    exports.createGet = _createGet;
    exports.CreateGetHandler = CreateGetHandler;

    var CreateDefaultParam = _.extend({}, PostEntityDefaultParam);
    class CreateHandler extends PostEntityHandler {
    }
    var _create = function (param, handler, optionalExtraHandlers /*optional*/) {
      handler = ensureHandler(handler, CreateHandler);
      var extraHandlers = _.rest(arguments, 2);
      var fParam = _.extend({}, CreateDefaultParam, param);
      var fHandler = actionHandlerExecutor(handler, extraHandlers);
      var request = {
        url: fParam.url,
        type: "post",
        data: fParam.entityData,
      }
      var ajaxOptions = _.extend(request, makeGeneralAjaxOptions(fParam, fHandler));
      ajax(ajaxOptions);
    }
    exports.create = _create;
    exports.CreateHandler = CreateHandler;

    var ReadDefaultParam = {
      url: "",
      extraHandlers:null
    }
    class ReadHandler extends RequestHandler {
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
    var _read = function (param, handler, optionalExtraHandlers /*optional*/) {
      handler = ensureHandler(handler, ReadHandler);
      var extraHandlers = _.rest(arguments, 2);
      var fParam = _.extend({}, ReadDefaultParam, param);
      var fHandler = actionHandlerExecutor(handler, extraHandlers);
      var request = {
        url: fParam.url,
        type: "get",
      }
      var ajaxOptions = _.extend(request, makeGeneralAjaxOptions(fParam, fHandler));
      ajax(ajaxOptions);
    }
    exports.read = _read;
    exports.ReadHandler = ReadHandler;

    var UpdateDefaultParam = _.extend({}, PostEntityDefaultParam);
    class UpdateHandler extends PostEntityHandler {
    }
    var _update = function (param, handler, optionalExtraHandlers /*optional*/) {
      handler = ensureHandler(handler, UpdateHandler);
      var extraHandlers = _.rest(arguments, 2);
      var fParam = _.extend({}, UpdateDefaultParam, param);
      var fHandler = actionHandlerExecutor(handler, extraHandlers);
      var request = {
        url: fParam.url,
        type: "post",
        data: fParam.entityData,
      }
      var ajaxOptions = _.extend(request, makeGeneralAjaxOptions(fParam, fHandler));
      ajax(ajaxOptions);
    }
    exports.update = _update;
    exports.UpdateHandler = UpdateHandler;

    var DeleteDefaultParam = {
      url: "",
      csrf: "",
      type: undefined,
      ceilingType: undefined,
    }
    class DeleteHandler extends RequestHandler {
      onSuccess(data, param) {
        console.log("Delete success");
      }

      onFail(data, param) {
        console.log("Delete fail");
      }

      onError() {
        console.log("Delete error");
      }

      onComplete() {
        console.log("Delete complete");
      }

    }
    var _delete = function (param, handler, optionalExtraHandlers /*optional*/) {
      handler = ensureHandler(handler, DeleteHandler);
      var extraHandlers = _.rest(arguments, 2);
      var fParam = _.extend({}, DeleteDefaultParam, param);
      var fHandler = actionHandlerExecutor(handler, extraHandlers);
      var postData = {
        _csrf: fParam.csrf,
        type: fParam.type,
        ceilingType: fParam.ceilingType
      };

      var request = {
        url: fParam.url,
        type: "post",
        data: postData,
      }
      var ajaxOptions = _.extend(request, makeGeneralAjaxOptions(fParam, fHandler));
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
      url: '',
      originUrl: undefined,
      queryUri: '',
      pageSize: undefined,
      parameter: '',
      cparameter: '',
      range: undefined,
    }
    class QueryHandler extends RequestHandler {
      buildUrl(param) {
        if (!!param.url) {
          if (_.isString(param.url)) {
            return param.url;
          } else if (_.isFunction(param.url)) {
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
        if (range) {
          var start = range.lo;
          start = (start < 0) ? null : start;
          url = UrlUtil.getUrlWithParameter(QueryUriReservedParams.StartIndex, start, null, url);
//          pageSize = Math.min(range.width(), pageSize);
        }
        if (pageSize)
          url = UrlUtil.getUrlWithParameter(QueryUriReservedParams.PageSize, pageSize, null, url);
        return url;
      }
    }
    var _query = function (param, handler, optionalExtraHandlers /*optional*/) {
      handler = ensureHandler(handler, QueryHandler);
      var extraHandlers = _.rest(arguments, 2);
      var fParam = _.extend({}, QueryDefaultParam, param);
      var fHandler = actionHandlerExecutor(handler, extraHandlers);
      var url = handler.buildUrl(fParam);
      if (url == null) return;

      console.log("will load url: " + url);
      var request = {
        url: url,
        type: "get",
      }
      var ajaxOptions = _.extend(request, makeGeneralAjaxOptions(fParam, fHandler));
      ajax(ajaxOptions);
    }
    exports.query = _query;
    exports.QueryUriReservedParams = QueryUriReservedParams;
    exports.QueryUriPersistentParams = QueryUriPersistentParams;
    exports.QueryHandler = QueryHandler;
  });