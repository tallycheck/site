'use strict';

define(['jquery'],
  function ($){
    function getCsrfToken() {
      var csrfTokenInput = $('input[name="_csrf"]');
      if (csrfTokenInput.length == 0) {
        return null;
      }

      return csrfTokenInput.val();
    }

    var AJAX_DEFAULT_OPTIONS={
      handleRedirect : true,
      skipAjaxDefaultHandler : false
    }

    class Interrupter {
      preSuccess(data, textStatus, jqXHR, opts) {
        if ('true' == jqXHR.getResponseHeader('loginpage')) {
          location.reload();
          opts.skipAjaxDefaultHandler = true;
          return;
        }
      }

      postSuccess(data, textStatus, jqXHR, opts) {
        //if (opts.skipAjaxDefaultHandler)
        //  return;
        //
        //if (typeof data == "object") {
        //  var operation = data.operation;
        //  if (opts.handleRedirect) {
        //    if (operation == 'redirect') {
        //      window.location.replace(data.url);
        //    }
        //  }
        //}
      }

      preError(jqXHR, textStatus, errorThrown, opts) {

      }

      postError(jqXHR, textStatus, errorThrown, opts) {

      }

    }

    function ajax(options, callback){
      var mopts = $.extend({}, AJAX_DEFAULT_OPTIONS, options,
        $.isPlainObject(callback)? callback : null);
      if($.isFunction(callback)) {mopts.success = callback;}

      var interrupter = options.interrupter;
      interrupter = interrupter || (new Interrupter());

      mopts.type = mopts.type || 'GET';
      mopts.error = mopts.error || function(){};

      if(!mopts.success.enhanced){
        var oldSuccess = mopts.success;
        var newSuccess = function(data, textStatus, jqXHR){
          interrupter.preSuccess(data, textStatus, jqXHR, mopts);
          if(!mopts.skipAjaxDefaultHandler){
            oldSuccess(data, textStatus, jqXHR, mopts);
          }
          if(!mopts.skipAjaxDefaultHandler){
            interrupter.postSuccess(data, textStatus, jqXHR, mopts);
          }
        };
        newSuccess.enhanced = true;
        mopts.success = newSuccess;
      }

      if(!mopts.error.enhanced){
        var oldError = mopts.error;
        var newError = function(jqXHR, textStatus, errorThrown){
          interrupter.preError(jqXHR, textStatus, errorThrown, mopts);
          if(!mopts.skipAjaxDefaultHandler){
            oldError(jqXHR, textStatus, errorThrown, mopts);
          }
          if(!mopts.skipAjaxDefaultHandler){
            interrupter.postError(jqXHR, textStatus, errorThrown, mopts);
          }
        }
        newError.enhanced = true;
        mopts.error = newError;
      };

      return $.ajax(mopts);
    }

    ajax.get = function(options, callback){
      if(options==null){
        options ={};
      }
      options.type='GET';
      return ajax(options, callback);
    }
    ajax.post = function(options, callback){
      if(options==null){
        options ={};
      }
      options.type='POST';
      return ajax(options, callback);
    }
    ajax.ajax = ajax;

    return ajax;
  });