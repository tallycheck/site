define(["jquery", "underscore","datamap","math",
    './tgrid/tgrid-data',
    'jsx!./tgrid/tgrid-toolbar',
    'jsx!./tgrid/tgrid-header',
    'jsx!./tgrid/tgrid-body',
    'jsx!./tgrid/tgrid-indicator',
    "i18n!nls/entitytext",
    "ResizeSensor", "ajax","jquery.dotimeout"],
  function ($, _, dm, math,
            TGridDA,
            TGridToolbar,
            TGridHeader,
            TGridBody, TGridIndicator,
            entitytext, ResizeSensor, ajax, doTimeout) {
    var React = require('react');
    var ReactDOM = require('react-dom');
    var Range = math.Range;
    var Ranges = math.Ranges;
    var Body = TGridBody.Body;
    var Toolbar = TGridToolbar.Toolbar;
    var GridDataAccess = TGridDA.GridDataAccess;
    var Header = TGridHeader.Header;
    var Footer = TGridIndicator.Footer;
    var Spinner = TGridIndicator.Spinner;

    var fetchDebounce = 200;
    var lockDebounce = 200;
    var updateUrlDebounce = 800;

    var LoadEvent = function(source){
      this.source = LoadEvent.Source.UnifiedSource(source);
    }
    LoadEvent.prototype = {
      checkSourceIs : function(src){
        return this.source === src;
      },
    }
    LoadEvent.Source = {
      UI : "ui",
      URL : "url" ,
      PARAMETER : 'parameter',
      NONE : 'none',
      UnifiedSource : function(source){
        switch (source){
          case this.UI:
          case this.URL:
          case this.PARAMETER:
            return source;
          default :
            return this.NONE;
        }
      },
    }

    var Grid = React.createClass({
      statics: {
        DefaultMaxHeight: 400,
        updateStateBy: function (grid, queryResult, fresh) {
          fresh = !!(fresh);
          var origState = grid.state;
          var ranges = fresh ? new Ranges() : origState.recordRanges;
          var beansMap = fresh ? new Object() : _.extend({}, origState.beansMap);

          var entities = queryResult.entities;
          var beans = entities.beans;
          var startIdx = entities.startIndex;
          var beanCount = 0;
          if (beans != null) {
            _.each(beans, function (bean, i) {
              beansMap[startIdx + i] = bean;
            });
            beanCount = beans.length;
          }
          var range = new Range(entities.startIndex, entities.startIndex + beanCount);
          ranges.add(range);
          var pageSize = entities.pageSize;
          var fullQuery = queryResult.fullQuery;
          var paramObj = grid.dataAccess().splitParameter(fullQuery);

          var newState = {
            totalRecords: entities.totalCount,
            recordRanges: ranges,
            pageSize: pageSize,
            parameter: paramObj.parameter,
            cparameter: paramObj.cparameter,
            beansMap: beansMap
          };
          grid.setState(newState);
        },
        LoadSource: {UI: "ui", URL: "url", PARAMETER: 'parameter', NONE: 'none'}
      },
      AJAX_LOCK : 0,
      acquireLock: function () {
        if (this.AJAX_LOCK == 0) {
          this.AJAX_LOCK = 1;
          return true;
        }
        return false;
      },
      releaseLock: function () {
        this.AJAX_LOCK = 0;
      },
      maxHeight:0,
      //Grid.stateUpdate -> Header.stateUpdate -> FilterHolder.stateUpdate -(X)-> Grid.stateUpdate
      avoidReverseRequestByVersion : 1,
      getDefaultProps: function () {
        return {
          maxVisibleRows: undefined,
          actions : [],
          links : {},
          queryUri : '',
          namespace : 'gns_' + Math.floor(Math.random() * 10000000000) + '_'
        };
      },
      getInitialState: function () {
        var beansMap = new Object();
        var ranges = new Ranges();
        return {
          totalRecords:0,
          recordRanges:ranges,
          parameter:"",
          cparameter:"",
          beansMap : beansMap,
          loading : false
        };
      },
      setMaxHeight:function(height){
        height = height || Grid.DefaultMaxHeight;
        var node = ReactDOM.findDOMNode(this);
        var $node = $(node);
        this.maxHeight = height;
        $node.css('max-height', ''+height+'px');

        var headerGroup = $(ReactDOM.findDOMNode(this.refs.headerGroup));
        var body = $(ReactDOM.findDOMNode(this.refs.body));
        var footerGroup = $(ReactDOM.findDOMNode(this.refs.footerGroup));
        var maxBodyHeight = height - headerGroup.height() - footerGroup.height();
        body.css('max-height', ''+maxBodyHeight+'px');
      },
      doResize:function(){
        //var _this = this;
        //var node = ReactDOM.findDOMNode(_this);
        //var $node = $(node);
        //var maxHeight = $node.height();
        //this.setMaxHeight(maxHeight);
      },
      onVisibleRangeUpdate:function(){
        var body = this.refs.body;
        var footer = this.refs.footer;

        var startIndex = body.visibleTopIndex();
        var endIndex = body.visibleBottomIndex();
        var totalRecords = this.state.totalRecords;

        var obj = {
          range: new Range(startIndex, endIndex),
          total: totalRecords
        };
        footer.setState(obj);
        this.triggerLoadPending();
      },
      componentDidMount:function(){
        var node = ReactDOM.findDOMNode(this);
        new ResizeSensor(node, this.doResize);
        this.setMaxHeight();
      },
      componentWillUnmount:function(){
        var node = ReactDOM.findDOMNode(this);
        ResizeSensor.detach(node, this.doResize);
      },
      shouldComponentUpdate:function(nextProps, nextState, nextContext){
        if(!_.isEqual(nextProps, this.props) ||
          !_.isEqual(nextState, this.state) ||
          !_.isEqual(nextContext, this.context)){
          return true;
        }
        return false;
      },
      componentWillUpdate:function(nextProps, nextState,nextContext, transaction){
        if((this.state.cparameter) != (nextState.cparameter)){
          this.avoidReverseRequestByVersion ++;
        }
        console.log("GRID will update");
      },
      componentDidUpdate:function(prevProps, prevState, prevContext, rootNode){
        if((prevState.cparameter) != (this.state.cparameter)){
          this.onCriteriaParameterUpdate(prevState.cparameter, this.state.cparameter);
          console.log("GRID cparameter changed");
        }
        this.doResize();
        this.onVisibleRangeUpdate();
        console.log("GRID did update");
      },
      render: function () {
        var entityContext = this.props.entityContext;
        return (
          <div className="entity-grid-autofill entity-grid-container"
               data-recordranges="" data-totalrecords="" data-pagesize=""
               data-grid-scope="" data-align-type="" data-align-offset=""
               data-initialized="true"
               data-ceiling-type="" data-type=""
               data-actions="" data-entity-query-uri="" data-parameter="" data-criteria-parameter="">
            <div ref="headerGroup">
              <Toolbar ref="toolbar" info={entityContext.info} actions={this.props.actions} links={this.props.links}/>
              <Header ref="header" info={entityContext.info} gridnamespace={this.props.namespace} grid={this}/>
            </div>
            <div ref="bodyGroup" >
              <Body ref="body" entityContext={entityContext}
                    info={entityContext.info}
                    entities={this.state}
                    onScroll ={this.onScroll}
                    visibleRangeUpdate={this.onVisibleRangeUpdate}/>
              <Spinner ref="spinner" />
            </div>
            <div ref="footerGroup">
              <Footer ref="footer"/>
            </div>
          </div>
          );
      },
      onScroll:function(){

      },
      onCriteriaParameterUpdate : function(prevCparam, nextCparam){
        if(nextCparam == prevCparam)
          return;
        var header = this.refs.header;

        header.setState({cparameter : nextCparam, version:this.avoidReverseRequestByVersion});
      },
      dataAccess : function(){
        return new GridDataAccess(this);
      },
      requestDoFilterByFilters : function (caller) {
        console.log("requestDoFilterByFilters");
        var callerVersion = caller.state.version;
        if(this.avoidReverseRequestByVersion == callerVersion)
          return;
        this.doLoadByFilters();
      },
      doLoad : function(loadEvent){
        switch (loadEvent.source){
          case LoadEvent.Source.UI:
            this.doLoadByUi();
            return;
          case LoadEvent.Source.URL:
          case LoadEvent.Source.PARAMETER:
          default :
            return;
        }
      },
      doLoadByUrl : function (url, fresh) {
        this.ajaxLoadData(url, fresh);
      },
      doLoadByFilters : function(){
        var cparam = this.dataAccess().gatherCriteriaParameter();
        this.setState({'cparameter' : cparam});
        var url = this.dataAccess().buildLoadUrl();
        this.doLoadByUrl(url, true);
      },
      triggerLoadPending:function(){
        var _this = this;
        doTimeout("loadpending", fetchDebounce, function(){
          _this.doLoadPending();
        });
      },
      doLoadPending : function () {
        var url = this.dataAccess().buildInScreenLoadUrl();
        this.ajaxLoadData(url, false);
      },
      ajaxLoadData : function(url, fresh){
        if(url == null) return;
        var _grid = this;
        var ffresh = (fresh === undefined) ? true : !!(fresh);
        var _args = arguments;

        while (!_grid.acquireLock()) {
          //console.log("Couldn't acquire lock. Will try again in " + lockDebounce + "ms");
          doTimeout('acquirelock', lockDebounce, function () {
            var callee = _grid.ajaxLoadData;
            callee.apply(_grid, _args);
          });
          return false;
        }

        var handlers = {
          ondata: function (/*ondata*/ response) {
            var queryResult = response.data;
//            var queryResponse = dm.queryResponse(response.data);
            Grid.updateStateBy(_grid, queryResult, ffresh);
          },
          ondataloaded : function(){
            _grid.triggerLoadPending();
          }
        };
        var options = {
          url:url,
          success:function (response) {
            if (handlers.ondata) {
              handlers.ondata(response);
            }
            if(handlers.ondataloaded){
              handlers.ondataloaded();
            }
          },
          complete:function(jqXHR, textStatus){
            _grid.releaseLock();
          }
        };
        var optionsclone = $.extend({}, options);

        console.log("will load url: " + url);
        ajax.get(options);
      }
    });

    function renderGrid(queryResult, div) {
      var queryResponse = dm.queryResponse(queryResult);
      var gridEle = <Grid
        entityContext={queryResponse.entityContext()}
        actions={queryResponse.actions()}
        links={queryResponse.linksObj()}
        queryUri={queryResult.queryUri}/>;

      var grid = ReactDOM.render(gridEle, div);
      Grid.updateStateBy(grid, queryResult);
    }

    return {
      renderGrid: renderGrid
    };
  });