define(
  function(require, exports, module){

    var $ = require('jquery');
    var _ = require('underscore');
    var basic = require('basic');
    var dm = require('datamap');
    var math = require('math');
    var modal = require('jsx!modules/modal');
    var UriTemplate = require('UriTemplate');
    var TGridDA = require('./tgrid/data');
    var TGridToolbar = require('jsx!./tgrid/toolbar');
    var TGridHeader = require('jsx!./tgrid/header');
    var TGridBody = require('jsx!./tgrid/body');
    var TGridIndicator = require('jsx!./tgrid/indicator');
    var doTimeout = require('jquery.dotimeout');
    var entityText = require('i18n!nls/entityText');
    var ResizeSensor = require('ResizeSensor');
    var ajax = require('ajax');
    var EntityModalSpecsPath = 'jsx!./entity-modal-specs';
    var EntityRequest = require('entity-request');
    var EntityResponse = require('entity-response');

    var React = require('react');
    var ReactDOM = require('react-dom');
    var Range = math.Range;
    var Ranges = math.Ranges;
    var Body = TGridBody.Body;
    var Toolbar = TGridToolbar.Toolbar;
    var GridDataAccess = TGridDA.GridDataAccess;
    var Header = TGridHeader.Header;
    var Footer = TGridIndicator.Footer;

    var ModalStack = modal.ModalStack;
    var ModalContent = modal.Contents.ModalContent;

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

    var TGrid = React.createClass({
      statics: {
        DefaultMaxHeight: 400,
        updateStateBy: function (grid, queryResult, fresh) {
          fresh = !!(fresh);
          var origState = grid.state;
          var queryResponse = EntityResponse.QueryResponse.newInstance(queryResult);
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
          var paramObj = queryResponse.splitParameter(fullQuery);

          var newState = {
            queryUri : queryResult.queryUri,
            entityContext:queryResponse.entityContext(),
            actions:queryResponse.actions(),
            links:queryResponse.linksObj(),

            totalRecords: entities.totalCount,
            recordRanges: ranges,
            pageSize: pageSize,
            parameter: paramObj.parameter,
            cparameter: paramObj.cparameter,
            searchField : paramObj.searchField,
            searchKey : paramObj.searchKey,
            beansMap: beansMap
          };
          grid.setState(newState);
        },
        LoadSource: {UI: "ui", URL: "url", PARAMETER: 'parameter', NONE: 'none'},
        csrf : function(){
          return $("form[name=formtemplate] input[name=_csrf]").val();
        }
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

      //TGrid.stateUpdate -> Header.stateUpdate -> FilterHolder.stateUpdate -(X)-> TGrid.stateUpdate
      //avoid Inverse data Flow
      updateVersion : -1,
      getDefaultProps: function () {
        return {
          isMain: false,
          namespace : 'gns_' + Math.floor(Math.random() * 1e15) + '.'
        };
      },
      getInitialState: function () {
        var beansMap = new Object();
        var ranges = new Ranges();
        var csrf = TGrid.csrf();
        return {
          queryUri : undefined,
          entityContext:undefined,
          actions:undefined,
          links : undefined,

          totalRecords:0,
          recordRanges:ranges,
          parameter:"",
          cparameter:"",
          searchField : '',
          searchKey : '',
          beansMap : beansMap,

          loading : false,
          csrf : csrf,
          version : this.updateVersion
        };
      },
      setMaxHeight:function(height){
        height = height || TGrid.DefaultMaxHeight;
        var node = ReactDOM.findDOMNode(this);
        var $node = $(node);
        this.maxHeight = height;
        $node.css('max-height', ''+height+'px');

        this.updateBodyMaxHeight();
      },
      updateBodyMaxHeight : function(){
        var headerGroup = $(ReactDOM.findDOMNode(this.refs.headerGroup));
        var body = $(ReactDOM.findDOMNode(this.refs.body));
        var footerGroup = $(ReactDOM.findDOMNode(this.refs.footerGroup));
        var maxBodyHeight = this.maxHeight - headerGroup.height() - footerGroup.height();
        body.css('max-height', ''+maxBodyHeight+'px');
      },
      getSpinner(){
        return this.refs.body.refs.spinner;
      },
      doResize:function(){
        var header = this.refs.header;
        var headerFilterGroup = header.refs.filterGroup;
        var body = this.refs.body;
        var widths = headerFilterGroup.calcStartingWidths();
        headerFilterGroup.updateColumnWidth(widths);
        body.syncHeaderColumns();
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
        var ps = this.state;
        var ns = nextState;
        var oldState = _.extend({}, ps, {version:0});
        var newState = _.extend({}, ns, {version:0});
        if(!_.isEqual(nextProps, this.props) ||
          !_.isEqual(newState, oldState) ||
          !_.isEqual(nextContext, this.context)){
          return true;
        }
        return false;
      },
      componentWillUpdate:function(nextProps, nextState,nextContext, transaction){
        var ps = this.state;
        var ns = nextState;
        if((ps.cparameter) != (ns.cparameter)){
          this.updateVersion ++;
          this.setState({version: this.updateVersion});
        }
        console.log("GRID will update");
      },
      componentDidUpdate:function(prevProps, prevState, prevContext, rootNode){
        var ps = prevState;
        var ns = this.state;
        if((ps.cparameter) != (ns.cparameter)){
          console.log("GRID cparameter changed: [ '" + ps.cparameter + "' -> '" + ns.cparameter+"' ]");
          this.updateHeaderParameter(ps.cparameter, ns.cparameter);
        }
        if((ps.searchKey) != (ns.searchKey)){
          this.updateToolbarSearchText(ns.searchField, ps.searchKey, ns.searchKey);
        }
        this.doResize();
        this.updateBodyMaxHeight();
        this.onVisibleRangeUpdate();
        console.log("GRID did update");
      },
      render: function () {
        var entityContext = this.state.entityContext;
        var info = entityContext ? entityContext.info : null;
        return (
          <div className="entity-grid-container">
            <div ref="headerGroup">
              <Toolbar ref="toolbar" info={info} grid={this} actions={this.state.actions} links={this.state.links}/>
              <Header ref="header" info={info} grid={this} gridNamespace={this.props.namespace}/>
            </div>
            <div ref="bodyGroup" >
              <Body ref="body" entityContext={entityContext}
                    info={info}
                    entities={this.state}
                    onScroll ={this.onScroll}
                    grid = {this}
                    visibleRangeUpdate={this.onVisibleRangeUpdate}/>
            </div>
            <div ref="footerGroup">
              <Footer ref="footer"/>
            </div>
          </div>
          );
      },
      onSelectedIndexChanged : function(oldBean, newBean, oldIndex, newIndex ){
        console.log("selected index changed: " + oldIndex + " -> " + newIndex);
        if(newBean){
          var idField = this.state.entityContext.idField;
          var id = basic.beanProperty(newBean, idField);
          this.refs.toolbar.focuseToId('' + id);
        }else{
          this.refs.toolbar.focuseToId('');
        }
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
      onScroll:function(){

      },
      updateHeaderParameter : function(prevCparam, nextCparam){
        if(nextCparam == prevCparam)
          return;
        var header = this.refs.header;

        header.setState({
          cparameter : nextCparam,
          version: this.updateVersion
        });
      },
      updateToolbarSearchText : function(searchField, prevSearchText, nextSearchText) {
        if (nextSearchText === prevSearchText)
          return;
        var search = this.refs.toolbar.refs.search;

        search.setState({
          searchField : searchField,
          inputting : undefined,
          presenting: nextSearchText
        });
      },
      onEventCreateButtonClick : function(e){
        var grid = this;
        var body = this.refs.body;
        var readUri = this.state.links.create;
        var uri = readUri;
        require([EntityModalSpecsPath], function(EMSpecs){
          class CreateSpec extends EMSpecs.Create{
          }
          var ms = ModalStack.getPageStack();
          ms.pushModalSpec(new CreateSpec({
            url : uri
          }));
        });
      },
      onEventUpdateButtonClick : function(e){
        var grid = this;
        var body = this.refs.body;
        var bean = body.selectedBean();
        var readUriTemplate = this.state.links.read;
        var idObj = this.state.entityContext.getStandardIdObject(bean);
        var uri = new UriTemplate(readUriTemplate).fill(idObj);
        require([EntityModalSpecsPath], function(EMSpecs){
          class ReadSpec extends EMSpecs.Read{
          }
          var ms = ModalStack.getPageStack();
          ms.pushModalSpec(new ReadSpec({
            url : uri
          }));
        });
      },
      onEventDeleteButtonClick : function(e){
        var grid = this;
        var body = this.refs.body;
        var bean = body.selectedBean();
        var deleteUriTemplate = this.state.links.delete;
        var idObj = this.state.entityContext.getStandardIdObject(bean);
        var uri = new UriTemplate(deleteUriTemplate).fill(idObj);
        var entityContext = this.state.entityContext;
        var csrf = this.state.csrf;
        var delOpts = {
          url : uri,
          csrf : csrf,
          type : entityContext.type,
          ceilingType : entityContext.ceilingType,
          deleteExtraHandler : {
            onSuccess:function(){
              body.selectIndex(-1);
              grid.doLoadByFilters();
            }
          }
        };

        require([EntityModalSpecsPath], function(EMSpecs){
          var EMSpecs = require(EntityModalSpecsPath);
          class DeleteSpec extends EMSpecs.Delete{
          };

          var ms = ModalStack.getPageStack();
          ms.pushModalSpec(new DeleteSpec(delOpts));
        });
      },
      dataAccess : function(){
        return new GridDataAccess(this);
      },
      requestDoFilterByFilters : function (caller) {
        if(caller.constructor.displayName != 'FilterHolder')
          throw new Error("Type error.");
        console.log("grid requestDoFilterByFilters");
        if(caller.leadingAhead(this.updateVersion)){
          this.doLoadByFilters();
        }
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
        this.ajaxLoadData({url : url}, fresh);
      },
      doLoadByFilters : function(){
        var da = this.dataAccess();
        var cparam = da.gatherCriteriaParameter();
        this.setState({'cparameter' : cparam}, function(){
          var pendingQueryParam = da.buildQueryParam();
          var url = (new EntityRequest.QueryHandler()).buildUrl(pendingQueryParam);
          this.doLoadByUrl(url, true);
        });
      },
      triggerLoadPending:function(){
        var _this = this;
        doTimeout("loadpending", fetchDebounce, function(){
          _this.doLoadPending();
        });
      },
      doLoadPending : function () {
        var da = this.dataAccess();
        var pendingRange = da.screenPendingRange();
        if(pendingRange == null){
          return;
        }
        var pendingQueryParam = da.buildQueryParam(pendingRange);
        this.ajaxLoadData(pendingQueryParam, false);
      },
      ajaxLoadData : function(queryParam, fresh){
        if(_.isObject(queryParam)) {
          var range = queryParam.range;
          if (range) {
            var loadAlign = range.fromEnd ? (range.hi - 1) : range.lo;
            this.getSpinner().setLoadingIndex(loadAlign);
          }
        }
        if(queryParam == null) return;
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

        class QueryHandler extends EntityRequest.QueryHandler{
          onSuccess (data, param){
            var response = data;
            var queryResult = response.data;
            TGrid.updateStateBy(_grid, queryResult, ffresh);
            _grid.triggerLoadPending();
          }
          onComplete (){
            _grid.releaseLock();
            _grid.getSpinner().setLoadingIndex(null);
          }
        }
        EntityRequest.query( queryParam, new QueryHandler());
      }
    });

    function renderGrid(queryResult, div, isMain) {
      var gridEle = <TGrid isMain={isMain}/>;

      var grid = ReactDOM.render(gridEle, div);

      TGrid.updateStateBy(grid, queryResult);
    }

    exports.TGrid = TGrid;
    exports.renderGrid = renderGrid;
  });