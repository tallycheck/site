'use strict';

define(
  function(require, exports, module) {
    var _ = require('underscore');


    function beanProperty(bean, propertyPath) {
      var pieces = propertyPath.split('.');
      var pro = bean;
      pieces.some(function (t, i) {
        if (t) {
          pro = pro[t];
          if (pro == null)
            return true;
        }
      });
      return pro;
    }

    var propertiesWithKeyPrefix = function (object, prefix) {
      var refsKeys = _.keys(object);
      var fitKeys = _.filter(refsKeys, function (key) {
        return key.startsWith(prefix);
      });
      return _.map(fitKeys, function (tn) {
        return object[tn];
      });
    }

    exports.beanProperty = beanProperty;
    exports.propertiesWithKeyPrefix = propertiesWithKeyPrefix;
  });
