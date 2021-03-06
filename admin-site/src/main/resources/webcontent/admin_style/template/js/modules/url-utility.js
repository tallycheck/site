'use strict';

define(
  function(require, exports, module){
    var _ = require('underscore');
    var urlparser = require('url-parser');

    var websanovaJsUrl = urlparser;

    var UrlParamsUtils = {
      stringToData : function (paramsStr, keepEmpty /*keep keys with null value*/) {
        keepEmpty = (keepEmpty == undefined ? false : !!keepEmpty);
        if((paramsStr == null) || (paramsStr == '')){
          return {};
        }
        var obj = {};
        var pathAndParam = paramsStr.split('?');
        var params = (pathAndParam.length == 2)?pathAndParam[1]:pathAndParam[0];
        var pairs = params.split('&');
        _.each(pairs, function(pair, i, array){
          var kv = pair.split('=');
          var k = kv[0];
          var v = kv[1];
          if(keepEmpty || (v != '')){
            if(obj[k] == undefined){obj[k] = [];}
            if(v != ''){obj[k].push(v);}
          }
        });
        return obj;
      },
      dataToString : function (obj, includeEmpty) {
        var paramsUrl ='';

        var objProps = _.pairs(obj);
        var pairs = _.flatten(_.map(objProps, function(objProp){
          var k = objProp[0];
          var vs = objProp[1];
          var sameKeyPairs = [];
          if(includeEmpty || vs){
            sameKeyPairs = _.map(vs, function(v){return ''+k+'='+v;});
          }
          return sameKeyPairs;
        }))
        return pairs.join('&');
      },
      addValue : function (obj, k, v) {
        if(obj[k] == undefined){obj[k] = [];}
        obj[k].push(v);
      },
      setValue : function (obj, k, v) {
        obj[k] = [v];
      },
      hasKey : function (obj, k) {
        var v = obj[k];
        return (_.isArray(v)) && (v.length > 0);
      },
      deleteKey : function (obj, k) {
        delete obj[k];
      },
      /**
       * remove duplicated kv pairs
       * http://xxx.com/abc?a=1&b=2&b=2&b=3 -> http://xxx.com/abc?a=1&b=2&b=3
       * @param paramObj
       */
      removeDuplicates : function (obj) {
        for(let k in obj){
          var vs = obj[k];
          var ovs=_.uniq(vs);
          obj[k]=ovs;
        }
      },
      merge : function(/* arguments in strings or objects*/){
        var merged ={};
        _.each(arguments, function(obj){
          if(_.isString(obj)){
            obj = UrlParams.stringToData(obj);
          }
          if(_.isObject(obj)){
            for(let k in obj){
              var vs = obj[k];
              var mvs = merged[k];
              merged[k] = ((!!mvs)? (mvs.concat(vs)) : ([].concat(vs)));
            }
          }
        })
        this.removeDuplicates(merged);
        return merged;
      },
      mergeAsString : function(){
        var merged = UrlParams.merge.apply(null, arguments);
        return UrlParams.dataToString(merged);
      }
    };

    var Url={
      ParamsUtils: _.extend({}, UrlParamsUtils, {
        connect:function(){
          //var merged  =Array.prototype.slice.call(arguments);
          var merged =[];
          for(let i=0;i<arguments.length;i++){
            var node = arguments[i];
            if(node){//ignore empty
              merged.push(node);
            }
          }
          return merged.join('&');
        }
      }),

      getPath : function(url){
        return websanovaJsUrl('path', url);
      },
      getParameter:function(url) {
        url = url || window.location.href;
        return websanovaJsUrl('query', url);
      },
      getParametersObject : function(url) {
        return this.ParamsUtils.stringToData(this.getParameter(url));
      },

      getUrlWithParameter : function(param, value, state, url) {
        return this._getUrlWithParameter(param, value, null , state, url);
      },
      getUrlWithParameterObj : function(paramObj, state, url) {
        return this._getUrlWithParameter(null, null, paramObj , state, url);
      },
      getUrlWithParameterString : function(paramStr, state, url) {
        var paramObj = UrlParamsUtils.stringToData(paramStr);
        return this.getUrlWithParameterObj(paramObj, state, url);
      },
      _getUrlWithParameter : function(param, value, paramObj, state, url) {
        url = url || window.location.href;

        var urlAndParams = url.split('?');
        var baseUrl = urlAndParams[0];
        var urlParams = urlAndParams[1];

        // Parse the current url parameters into an object
        var newParamObj = UrlParamsUtils.stringToData(urlParams);

        if (value == null || value === "") {
          UrlParamsUtils.deleteKey(newParamObj, param);
        } else {
          // Update the desired parameter to its new value
          if (_.isArray(param)) {
            _(param).each(function(index, param) {
              var k = param[index]; var v = value[index];
              UrlParamsUtils.setValue(newParamObj,k,v);
            });
          } else {
            UrlParamsUtils.setValue(newParamObj,param,value);
          }
        }
        newParamObj = UrlParamsUtils.merge(newParamObj, paramObj);

        // Reassemble the new url
        var paramStr = UrlParamsUtils.dataToString(newParamObj);
        if('' == paramStr)return baseUrl;
        return [baseUrl, paramStr].join('?');
      },

      connectUrl : function (/* optional paths */) {
        var segs  =Array.prototype.slice.call(arguments);
        var result = segs.reduce(function (prev, cur, index, array) {
          if(cur == null) cur = '';
          if(typeof(cur) != 'string') cur = cur.toString();
          if(cur == null || ('' == cur)){return prev;}
          if(prev == null || ('' == prev)){return cur;}
          var slash = (prev.endsWith('/')?1:0) +(cur.startsWith('/')?1:0);
          if(slash == 0)cur='/'+cur;
          else if(slash == 2)cur = cur.substring(1);
          return prev + cur;
        });
        return result;
      }
    };

    var History ={

      pushUrl : function(url, state) {

      },

      replaceUrl : function(url, state) {
        // Assuming the user is on a browser from the 21st century, update the url
        if (!!(window.history && history.pushState)) {
          history.replaceState(state, '', url);
        }
      },

      replaceUrlParameter : function(param, value, state) {
        var newUrl = Url.getUrlWithParameter(param, value, state);
        this.replaceUrl(newUrl, state);
      }
    };

    Url.HistoryUtility = History;

    _.extend(exports, Url);
  });