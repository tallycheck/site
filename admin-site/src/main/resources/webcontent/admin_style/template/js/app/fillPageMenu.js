/**
 * Created by gaoyuan on 8/4/16.
 */
define(function (require) {

  var React =require('react'),
    ReactDom = require('react-dom'),
    menu = require('jsx!modules/menu'),
    datamap = require('datamap');

  var menuData = datamap.data("menu");
  var menuPath = datamap.data("menuPath");
  menu.renderMenu( menuData, menuPath, document.getElementById('sideMenu'));
  menu.renderBreadcrumb( menuData, menuPath, document.getElementById('breadcrumbSection'));

});
