'use strict';

define(
  function(require, exports, module) {
    var $ = require('jquery');
    var UriTemplate = require('UriTemplate');

    function getDataMap() {
      return $(".data-map p").data("data-map");
    }

    function getData(name) {
      return getDataMap()[name];
    }


    exports.dataMap = getDataMap;
    exports.data = getData;

  });