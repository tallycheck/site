define(["jquery",
    "underscore",
    "datamap",
    "math",
    "i18n!nls/entitytext",
    'url-utility'],
  function ($, _, dm, math,
            entitytext, UrlUtil) {
    var Range = math.Range;

    var ReservedParameter={
      StartIndex :'startIndex',
      PageSize : 'pageSize'
    };
    var PersistentUrlParams = [ReservedParameter.PageSize];

    var GridDataAccess = function(grid){
      this.grid = grid;
    }
    GridDataAccess.prototype = {
      getOriginUrl : function(){
        return window.location.origin;
      },
      getFullIndexRange : function(){
        var total = this.grid.state.totalRecords || 0;
        return new Range(0, total);
      },
      getVisibleRange : function(){
        var body = this.grid.refs.body;
        return body.visibleRange();
      },
      getLoadedRanges : function(){
        return this.grid.state.recordRanges;
      },
      getPageSize : function(){
        return this.grid.state.pageSize;
      },
      getQueryUri:function(){
        return this.grid.props.queryUri;
      },
      splitParameter : function(paramStr){
        var pu = UrlUtil.ParamsUtils;
        var paramObj = pu.stringToData(paramStr);
        var cParamKeys = this.gatherCriteriaParameterKeys();

        var cParamObj = {};
        cParamKeys.forEach(function(ckey, index){
          var pv = paramObj[ckey];
          cParamObj[ckey] = pv;
          if(pv !== undefined){
            delete paramObj[ckey];
          }
        });

        var resvParamObj={};
        for(var rkeyName in ReservedParameter){
          var rkey = ReservedParameter[rkeyName];
          var pv = paramObj[rkey];
          resvParamObj[rkey] = pv;
          if(pv !== undefined){
            if(PersistentUrlParams.indexOf(rkey) < 0){
              delete paramObj[rkey];
            }
          }
        }
        return {
          parameter : pu.dataToString(paramObj),
          cparameter : pu.dataToString(cParamObj),
          rparameter : pu.dataToString(resvParamObj)
        }
      },
      getParameter : function(){
        return this.grid.state.parameter;
      },
      getAllFilterHolder : function(){
        var header = this.grid.refs.header;
        return header.getAllFilterHolder();
      },
      gatherCriteriaParameterKeys : function(){
        var keys = [];
        var fhs = this.getAllFilterHolder();
        _.each(fhs, function(fn){
          var filter = fn.refs.filter;
          var fi = filter.props.fieldinfo;
          if(fi.supportSort) {
            var sorterKey = fn.state.sorterKey;
            keys.push(sorterKey);
          }
          if(fi.supportFilter) {
            var filterKey = fn.state.filterKey;
            keys.push(filterKey);
          }
        });
        return keys;
      },
      //make parameter string: http://abc.com/xxx?a=1&b=2&b=3&c=4 (support multi-value for a particular key)
      gatherCriteriaParameter : function(includeAll){
        var inputsWithVal = [];
        var pushInput = function(key, value){
          var $tmpInput = $('<input>', {'name': key, 'value': value});
          inputsWithVal.push($tmpInput[0]);
        }
        var fhs = this.getAllFilterHolder();
        _.each(fhs, function(fn){
          var filter = fn.refs.filter;
          var fi = filter.props.fieldinfo;
          if(fi.supportSort)
          {
            var sorterKey = fn.state.sorterKey;
            var sorterVal = fn.state.sorterVal;
            if (includeAll || !!(sorterVal)) {
              pushInput(sorterKey, sorterVal);
            }
          }
          if(fi.supportFilter)
          {
            var filterKey = fn.state.filterKey;
            var filterVal = fn.state.filterVal;
            var multiVal = filter.multiValue;
            if (includeAll || !!(filterVal)) {
              if(multiVal){
                var vals = JSON.parse(filterVal);
                vals.forEach(function(singleVal, index, array){
                  if($.isPlainObject(singleVal)){
                    singleVal = JSON.stringify(singleVal);
                  }
                  pushInput(filterKey,singleVal);
                });
              }else{
                pushInput(filterKey,filterVal);
              }
            }
          }
        });
        return $(inputsWithVal).serialize();
      },
      buildLoadUrl : function(range /* nullable */){
        var queryUrl = UrlUtil.connectUrl(this.getOriginUrl(), this.getQueryUri())
        var pageSize = this.getPageSize();
        var parameter = this.getParameter();
        var cparameter = this.gatherCriteriaParameter();
        var allParam = UrlUtil.ParamsUtils.connect(cparameter, parameter);
        var url = UrlUtil.getUrlWithParameterString(allParam, null, queryUrl);
        if(range){
          var start = range.lo; start = (start < 0)? null:start;
          url = UrlUtil.getUrlWithParameter(ReservedParameter.StartIndex, start, null, url);
          pageSize = Math.min(range.width(), pageSize);
        }
        if(pageSize)
          url = UrlUtil.getUrlWithParameter(ReservedParameter.PageSize, pageSize, null, url);
        return url;
      },
      buildInScreenLoadUrl : function(){
        var fullRange = this.getFullIndexRange();
        var visibleRange = this.getVisibleRange();

        var visibleMissingRange = fullRange.intersect(visibleRange);

        if(visibleMissingRange == null || visibleMissingRange.width() < 1){
          return null;
        }
        var loadedRanges = this.getLoadedRanges();
        var pageSize = this.getPageSize();
        var missingRanges = loadedRanges.findMissingRangesWithin(visibleMissingRange);
        var missing0 = missingRanges.first();
        if(missing0){
          missing0 = missing0.subRange(pageSize, (missing0.lo == visibleMissingRange.lo));
          var toLoadRange = fullRange.intersect(missing0);
          return this.buildLoadUrl(toLoadRange);
        }else{
          return null;
        }
      }
    }

    return {
      GridDataAccess : GridDataAccess
    }
  });