define([ "underscore"],
  function(_) {

    var propertiesWithKeyPrefix = function(object, prefix) {
      var refsKeys = _.keys(object);
      var fitKeys = _.filter(refsKeys, function(key){
        return key.startsWith(prefix);
      });
      return _.map(fitKeys, function(tn){
        return object[tn];
      });
    }

    return {
      propertiesWithKeyPrefix : propertiesWithKeyPrefix
    };
  });
