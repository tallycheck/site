/**
 * Created by Gao Yuan on 2016/3/24.
 */
requirejs.config({
  baseUrl: '/js/admin',
  paths: {
//        "menu": 'jsx!/js/modules/menu',
    "modules" : "../modules",
    "datamap": '/js/modules/datamap',
    "math": '/js/modules/math',
    "react":"/lib/react/react-with-addons",
    "react-dom":"/lib/react/react-dom",
    "JSXTransformer": "JSXTransformer",
    "jquery": "/lib/jquery/jquery-2.1.4.min",
    "jquery-ui": "/lib/jquery-ui/jquery-ui.min",
    "jquery.dotimeout":"/lib/jquery/plugins/jquery.ba-dotimeout",
    "jquery-ui-timepicker":"/lib/timepicker/jquery-ui-timepicker-addon",
    "underscore" : "/lib/underscore/underscore-min",
    "bootstrap":"/lib/bootstrap-3.3.4/js/bootstrap",
    "perfectScrollbarJQuery": "/lib/perfect-scrollbar/js/perfect-scrollbar.jquery",
    "perfectScrollbar": "/lib/perfect-scrollbar/js//perfect-scrollbar",
    "ResizeSensor":"/lib/css-element-queries/ResizeSensor",
    "UriTemplate" :"/lib/uri/uri-templates",
    "ajax" : "/js/modules/ajax",
    "url-parser" : "/lib/js-url-2.3.0/url",
    "url-utility" : "/js/modules/url-utility",
    'messages-dict' : "/js/modules/messages"
  },
  shim: {
    'underscore': {
      exports: '_'
    },
    'jquery': {
      exports: '$'
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
    }
  },
  jsx: {
    fileExtension: '.jsx'
  }
});

// Start the main app logic.
requirejs(['react', 'react-dom',
    'jsx!modules/menu', 'jsx!modules/tgrid', "datamap"],
  function   (React, ReactDom, menu, tgrid,datamap) {
    var menuData = datamap.data("menu");
    var menuPath = datamap.data("menuPath");
    menu.renderMenu( menuData, menuPath, document.getElementById('sideMenu'));
    menu.renderBreadcrumb( menuData, menuPath, document.getElementById('breadcrumbSection'));

    //var tgrid = require('jsx!../modules/tgrid');
    var queryResult = datamap.data("queryResult");
    tgrid.renderGrid(queryResult, document.getElementById("viewSlot"));
    //jQuery, canvas and the app/sub module are all
    //loaded and can be used here now.
  });