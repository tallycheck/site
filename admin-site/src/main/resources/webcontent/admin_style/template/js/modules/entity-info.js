define(
  function(require, exports, module) {
    var _ = require('underscore');
    var basic = require('basic');

    var filterKey = function (fieldinfo){
      return fieldinfo.name;
    }

    var sorterKey = function (fieldinfo){
      return "sort_"+fieldinfo.name;
    }

    function gridQueryKeys(gridInfo){
      var keys = [];
      _.each(gridInfo.fields, function(fi){
        if(fi.supportSort) {
          var sKey = sorterKey(fi);
          keys.push(sKey);
        }
        if(fi.supportFilter) {
          var fKey = filterKey(fi);
          keys.push(fKey);
        }
      });
      return keys;

    }

    exports.filterKey = filterKey;
    exports.sorterKey = sorterKey;
    exports.gridQueryKeys = gridQueryKeys;
  });