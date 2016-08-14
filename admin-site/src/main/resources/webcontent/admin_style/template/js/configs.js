/**
 * Created by Gao Yuan on 2016/3/24.
 */
requirejs.config({
  baseUrl: '/js/admin',
  waitSeconds: 200,
  paths: {
    //react support
    "react":"/lib/react/react-with-addons",
    "react-dom":"/lib/react/react-dom",
    "JSXTransformer": "JSXTransformer",

    //libs
    "jquery": "/lib/jquery/jquery-2.1.4",
    "underscore" : "/lib/underscore/underscore-min",
    "bootstrap":"/lib/bootstrap-3.3.7/js/bootstrap",
    "jquery-ui": "/lib/jquery-ui/jquery-ui.min",
    "jquery.dotimeout":"/lib/jquery/plugins/jquery.ba-dotimeout",
    "jquery-ui-timepicker":"/lib/timepicker/jquery-ui-timepicker-addon",
    "perfectScrollbarJQuery": "/lib/perfect-scrollbar/js/perfect-scrollbar.jquery",
    "perfectScrollbar": "/lib/perfect-scrollbar/js//perfect-scrollbar",
    "ResizeSensor":"/lib/css-element-queries/ResizeSensor",
    "UriTemplate" :"/lib/uri/uri-templates",
    "url-parser" : "/lib/js-url-2.3.0/url",
    "summernote" : "/lib/summernote-0.6.16/summernote.min",

    //modules
    "modules" : "../modules",
    "datamap": '/js/modules/datamap',
    "math": '/js/modules/math',
    "ajax" : "/js/modules/ajax",
    "url-utility" : "/js/modules/url-utility",
    "basic" :"/js/modules/basic",

    "entity-info" :"/js/modules/entity-info",
    "entity-request" :"/js/modules/entity-request",
    "entity-response" :"/js/modules/entity-response",

    //app
    "app" : "../app"
  },
  shim: {
    'jquery': {
      exports: '$'
    },
    'underscore': {
      exports: '_'
    },
    "bootstrap" : {
      "deps" :['jquery']
    },
    'jquery-ui':{
      deps: ['jquery'],
      exports: '$.ui'
    },
    'jquery-ui-timepicker':{
      deps: ['jquery', 'jquery-ui'],
    },
    'jquery.dotimeout':{
      deps: ['jquery'],
      exports: 'jQuery.doTimeout'
    },
    'url-parser' :{
      exports : 'window.url'
    },
    "summernote" :{
      deps: ['jquery','bootstrap'],
    }
  },
  jsx: {
    fileExtension: '.jsx'
  }
});
