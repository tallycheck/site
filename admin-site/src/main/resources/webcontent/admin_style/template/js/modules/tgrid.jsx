'use strict';

define(
  function(require, exports, module) {

    var $ = require('jquery');
    var _ = require('underscore');
    var basic = require('basic');
    var Debugger = require('debugger');
    var math = require('math');
    var modal = require('jsx!modules/modal');
    var HandlersComp = require('./handlers');
    var UriTemplate = require('UriTemplate');
    var UrlUtil = require('url-utility');
    var TGridDA = require('./tgrid/data');
    var TGridToolbar = require('jsx!./tgrid/toolbar');
    var TGridHeader = require('jsx!./tgrid/header');
    var TGridBody = require('jsx!./tgrid/body');
    var TGridIndicator = require('jsx!./tgrid/indicator');
    var doTimeout = require('jquery.dotimeout');
    var EntityMsg = require('i18n!./nls/entity');
    var ResizeSensor = require('ResizeSensor');
    var EntityRequest = require('entity-request');
    var EntityResponse = require('entity-response');
    var ModalHandlersPath = './modal-handlers';
    var EntityModalSpecsPath = 'jsx!./entity-modal-specs';
    var HandlerUtils = require('handler-utils');
    var BatchExecutor = HandlerUtils.batchExecutor;

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

    var version_init = -1;
    var fetchDebounce = 200;
    var lockDebounce = 200;
    var updateUrlDebounce = 800;
    var ENABLE_DEBUG_LOG_4_SCROLL = true;
    var ENABLE_DEBUG_LOG_4_ACTION = true;
    var HIDE_URL_PAGESIZE = true;

    var SelectedIndexChangeHandlerTemplate = {
      onSelectedIndexWillChange: null, //function(oldIndex, newIndex, oldBean, newBean)
      onSelectedIndexChanged: null, //function(oldIndex, newIndex, oldBean, newBean)
      onDoubleClick:null, // function(rowIndex, rowBean)
    }
    var TGridHandlersTemplate = {
      actionsHandlers: null, //SelectedIndexChangeHandlerTemplate
    }
    var TGridDefaultProps = {
      isMain: false,
    }
    class TGrid extends React.Component {

      static csrf() {
        return $("form[name=formtemplate] input[name=_csrf]").val();
      }

      constructor(props) {
        super(props);
        this.AJAX_LOCK = 0;
        this.maxHeight = 0;
        //TGrid.stateUpdate -> Header.stateUpdate -> FilterHolder.stateUpdate -(X)-> TGrid.stateUpdate
        //avoid Inverse data Flow
        this.updateVersion = version_init;

        var beansMap = new Object();
        var ranges = new Ranges();
        var csrf = TGrid.csrf();
        this.state = {
          namespace: 'gns_' + Math.floor(Math.random() * 1e15) + '.',

          queryUri: undefined,
          entityContext: undefined,
          actions: undefined,
          links: undefined,

          totalRecords: 0,
          recordRanges: ranges,
          parameter: "",
          cparameter: "",
          searchField: '',
          searchKey: '',
          beansMap: beansMap,

          loading: false,
          csrf: csrf,
          version: this.updateVersion
        };
        this.handlers = new HandlersComp.HandlerContainer(TGridHandlersTemplate);
        this.handlers.pushHandlers(props.handlers);
        this.doResize = this.doResize.bind(this);
      }

      updateStateBy(queryResult, fresh) {
        var grid = this;
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
          queryUri: queryResult.queryUri,
          entityContext: queryResponse.entityContext(),
          actions: queryResponse.actions(),
          links: queryResponse.linksObj(),

          totalRecords: entities.totalCount,
          recordRanges: ranges,
          pageSize: pageSize,
          parameter: paramObj.parameter,
          cparameter: paramObj.cparameter,
          searchField: paramObj.searchField,
          searchKey: paramObj.searchKey,
          beansMap: beansMap
        };
        grid.setState(newState);
      }

      busy(){
        return this.AJAX_LOCK != 0;
      }

      acquireLock() {
        if (this.AJAX_LOCK == 0) {
          this.AJAX_LOCK = 1;
          return true;
        }
        return false;
      }

      releaseLock() {
        this.AJAX_LOCK = 0;
      }

      setMaxHeight(height) {
        height = height || TGrid.DefaultMaxHeight;
        var node = ReactDOM.findDOMNode(this);
        var $node = $(node);
        this.maxHeight = height;
        $node.css('max-height', '' + height + 'px');

        this.updateBodyMaxHeight();
      }

      updateBodyMaxHeight() {
        var headerGroup = $(ReactDOM.findDOMNode(this.refs.headerGroup));
        var body = $(ReactDOM.findDOMNode(this.refs.body));
        var footerGroup = $(ReactDOM.findDOMNode(this.refs.footerGroup));
        var maxBodyHeight = this.maxHeight - headerGroup.height() - footerGroup.height();
        body.css('max-height', '' + maxBodyHeight + 'px');
      }

      getSpinner() {
        return this.refs.body.refs.spinner;
      }

      doResize() {
        var header = this.refs.header;
        var headerFilterGroup = header.refs.filterGroup;
        var body = this.refs.body;
        var widths = headerFilterGroup.calcStartingWidths();
        headerFilterGroup.updateColumnWidth(widths);
        body.syncHeaderColumns();
      }

      setState(){
        var oldBeansMap = this.state.beansMap;
        var newBeansMap = arguments[0].beansMap;
        super.setState.apply(this, arguments);
      }

      componentDidMount() {
        var node = ReactDOM.findDOMNode(this);
        new ResizeSensor(node, this.doResize);
        this.setMaxHeight();
      }

      componentWillUnmount() {
        var node = ReactDOM.findDOMNode(this);
        ResizeSensor.detach(node, this.doResize);
        $.doTimeout('updateurl-all');
        $.doTimeout('updateurl');
        $.doTimeout('loadpending');
        $.doTimeout('acquirelock');
      }

      shouldComponentUpdate(nextProps, nextState, nextContext) {
        var ps = this.state;
        var ns = nextState;
        if (ps.version == version_init) {
          return true;
        }
        var oldState = _.extend({}, ps, {version: 0});
        var newState = _.extend({}, ns, {version: 0});
        if (!_.isEqual(nextProps, this.props) || !_.isEqual(newState, oldState) || !_.isEqual(nextContext, this.context)) {
          return true;
        }
        return false;
      }

      componentWillUpdate(nextProps, nextState, nextContext, transaction) {
        var ps = this.state;
        var ns = nextState;
        if ((ps.cparameter != ns.cparameter) || (version_init == this.updateVersion)) {
        }
        console.log("GRID will update");
      }

      componentDidUpdate(prevProps, prevState, prevContext, rootNode) {
        var ps = prevState;
        var ns = this.state;
        if ((ps.cparameter != ns.cparameter) || (version_init == this.updateVersion)) {
          if (version_init == this.updateVersion) {
            this.updateVersion = 0;
          } else {
            this.updateVersion++;
          }
          this.setState({version: this.updateVersion});
          console.log("GRID cparameter changed: [ '" + ps.cparameter + "' -> '" + ns.cparameter + "' ]");
          this.updateHeaderParameter(ps.cparameter, ns.cparameter);
        }
        if ((ps.searchKey != ns.searchKey) || (ps.searchField != ns.searchField)) {
          this.updateToolbarSearchText(ps.searchField, ns.searchField, ps.searchKey, ns.searchKey);
        }
        this.doResize();
        this.updateBodyMaxHeight();
        this.onVisibleRangeUpdate();
        console.log("GRID did update");
      }

      render() {
        var entityContext = this.state.entityContext;
        var info = entityContext ? entityContext.info : null;
        return (
          <div className="entity-grid-container">
            <div ref="headerGroup">
              <Toolbar ref="toolbar" info={info} grid={this} actions={this.state.actions} links={this.state.links}/>
              <Header ref="header" info={info} grid={this} gridNamespace={this.state.namespace}/>
            </div>
            <div ref="bodyGroup">
              <Body ref="body" entityContext={entityContext}
                    info={info}
                    entities={this.state}
                    onScroll={this.onScroll.bind(this)}
                    grid={this}
                    visibleRangeUpdate={this.onVisibleRangeUpdate.bind(this)}/>
            </div>
            <div ref="footerGroup">
              <Footer ref="footer"/>
            </div>
          </div>
        );
      }

      onSelectedIndexWillChange(oldBean, newBean, oldIndex, newIndex) {
        var selIdxChangeHandler = BatchExecutor(this.handlers.actionsHandlers);
        selIdxChangeHandler.onSelectedIndexWillChange(oldIndex, newIndex, oldBean, newBean);
      }

      onSelectedIndexChanged(oldBean, newBean, oldIndex, newIndex) {
        var selIdxChangeHandler = BatchExecutor(this.handlers.actionsHandlers);
        selIdxChangeHandler.onSelectedIndexChanged(oldIndex, newIndex, oldBean, newBean);
        console.log("selected index changed: " + oldIndex + " -> " + newIndex);
        if (newBean) {
          var idField = this.state.entityContext.idField;
          var id = basic.beanProperty(newBean, idField);
          this.refs.toolbar.focuseToId('' + id);
        } else {
          this.refs.toolbar.focuseToId('');
        }
      }

      onVisibleRangeUpdate() {
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
        this.updateMainUrl();
      }

      onScroll() {

      }

      notifyRowDoubleClick(rowIndex, rowBean){
        var selIdxChangeHandler = BatchExecutor(this.handlers.actionsHandlers);
        selIdxChangeHandler.onDoubleClick(rowIndex, rowBean);

        console.log("dbClick " + rowIndex);

      }

      clearContentRows() {
        this.setState({beansMap: {}, recordRanges: new Ranges()});
      }

      scrollToIndex(index) {

      }

      updateMainUrl(all) {
        //if all: parameter update
        //else: just update startIndex
        if (!this.props.isMain)
          return;
        var grid = this;
        var body = this.refs.body;
        var startIndex = body.visibleTopIndex();
        var startIndexParam = ((startIndex > 0) ? startIndex : null);
        if (all) {
          $.doTimeout('updateurl-all', updateUrlDebounce, function () {
            var url = grid.dataAccess().buildUrl();
            var newurl = url;
            newurl = UrlUtil.getUrlWithParameter(
              EntityRequest.QueryUriReservedParams.StartIndex, startIndexParam, null, newurl);
            if (HIDE_URL_PAGESIZE) {
              newurl = UrlUtil.getUrlWithParameter(
                EntityRequest.QueryUriReservedParams.PageSize, null, null, newurl);
            }
            UrlUtil.HistoryUtility.replaceUrl(newurl);
          });
        } else {
          $.doTimeout('updateurl', updateUrlDebounce, function () {
            UrlUtil.HistoryUtility.replaceUrlParameter(
              EntityRequest.QueryUriReservedParams.StartIndex, startIndexParam);
          });
        }
      }

      updateHeaderParameter(prevCparam, nextCparam) {
        var header = this.refs.header;
        var headerVersion = header.state.version;
        if ((headerVersion < this.updateVersion) || (nextCparam != prevCparam)) {
          header.setState({
            cparameter: nextCparam,
            version: this.updateVersion
          });
        }
      }

      updateToolbarSearchText(preSearchField, nextSearchField, prevSearchText, nextSearchText) {
        if (nextSearchText === prevSearchText && preSearchField === nextSearchField)
          return;
        var search = this.refs.toolbar.refs.search;

        search.setState({
          searchField: nextSearchField,
          inputting: undefined,
          presenting: nextSearchText
        });
      }

      onEventCreateButtonClick(e) {
        var grid = this;
        var body = this.refs.body;
        var readUri = this.state.links.create;
        var uri = readUri;
        require([EntityModalSpecsPath, ModalHandlersPath], function (EMSpecs, ModalHandlersComp) {
          var ModalHandlers = ModalHandlersComp.ModalHandlers;
          var FormSubmitHandler = {
            onSuccess: function (tform, response) {
              grid.doReload();
            },
          }
          class CreateSpec extends EMSpecs.Create {
          }
          var ms = ModalStack.getPageStack();
          ms.pushModalSpec(new CreateSpec({
            url: uri,
          }).pushHandlers({
              createSubmitFormHandlers: FormSubmitHandler,
              createSubmitModalHandlers: ModalHandlers.HideOnSuccess
            }));
        });
      }

      onEventUpdateButtonClick(e) {
        var grid = this;
        var body = this.refs.body;
        var bean = body.selectedBean();
        var readUriTemplate = this.state.links.read;
        var idObj = this.state.entityContext.getStandardIdObject(bean);
        var uri = new UriTemplate(readUriTemplate).fill(idObj);
        require([EntityModalSpecsPath, ModalHandlersPath], function (EMSpecs, ModalHandlersComp) {
          var ModalHandlers = ModalHandlersComp.ModalHandlers;
          var FormSubmitHandler = {
            onSuccess: function (tform, response) {
              grid.doReload();
            },
          }
          var deleteRequestHandler = {
            onSuccess: function () {
              body.selectIndex(-1);
              grid.doLoadByFilters();
            }
          }
          class ReadSpec extends EMSpecs.Read {
          }

          var ms = ModalStack.getPageStack();
          ms.pushModalSpec(new ReadSpec({
            url: uri,
          }).pushHandlers({
              updateSubmitFormHandlers: FormSubmitHandler,
              updateSubmitModalHandlers: ModalHandlers.HideOnSuccess,
              deleteModalHandlers: ModalHandlers.HideOnSuccess,
              deleteRequestHandlers: deleteRequestHandler
            }));
        });
      }

      onEventDeleteButtonClick(e) {
        var grid = this;
        var body = this.refs.body;
        var bean = body.selectedBean();
        var deleteUriTemplate = this.state.links.delete;
        var idObj = this.state.entityContext.getStandardIdObject(bean);
        var uri = new UriTemplate(deleteUriTemplate).fill(idObj);
        var entityContext = this.state.entityContext;
        var csrf = this.state.csrf;
        var delOpts = {
          url: uri,
          csrf: csrf,
          type: entityContext.type,
          ceilingType: entityContext.ceilingType
        };

        require([EntityModalSpecsPath], function (EMSpecs) {
          class DeleteSpec extends EMSpecs.Delete {
          }

          var deleteRequestHandler = {
            onSuccess: function () {
              body.selectIndex(-1);
              grid.doLoadByFilters();
            }
          }

          var ms = ModalStack.getPageStack();
          ms.pushModalSpec(new DeleteSpec(delOpts).pushHandlers({
            deleteRequestHandlers: deleteRequestHandler
          }));
        });
      }

      dataAccess() {
        return new GridDataAccess(this);
      }

      selectedBean(){
        var body = this.refs.body;
        return body.selectedBean();
      }

      requestDoFilterByFilters(caller) {
        if (caller.constructor.name != 'FilterHolder')
          throw new Error("Type error.");
        console.log("grid requestDoFilterByFilters");
        if (caller.leadingAhead(this.updateVersion)) {
          this.doLoadByFilters();
        }
      }

      doReload() {
        var da = this.dataAccess();
        var queryParam = da.buildQueryParam();
        var url = (new EntityRequest.QueryHandler()).buildUrl(queryParam);
        this.doLoadByUrl(url, true);
      }

      doLoadByUrl(url, fresh) {
        this.ajaxLoadData({url: url}, fresh);
      }

      doLoadByFilters() {
        var da = this.dataAccess();
        var cparam = da.gatherCriteriaParameter();
        this.setState({'cparameter': cparam}, function () {
          var queryParam = da.buildQueryParam();
          var url = (new EntityRequest.QueryHandler()).buildUrl(queryParam);
          this.doLoadByUrl(url, true);
        });
      }

      doLoadPending() {
        var da = this.dataAccess();
        var pendingRange = da.screenPendingRange();
        if (pendingRange == null) {
          return;
        }
        var pendingQueryParam = da.buildQueryParam(pendingRange);
        this.ajaxLoadData(pendingQueryParam, false);
      }

      triggerLoadPending() {
        if(this.busy()) {
          return;
        }
        var _this = this;
        doTimeout("loadpending", fetchDebounce, function () {
          _this.doLoadPending();
        });
      }

      ajaxLoadData(queryParam, fresh) {
        var loadingIndexAlign = null;
        if (_.isObject(queryParam)) {
          var range = queryParam.range;
          if (range) {
            loadingIndexAlign = range.anchor || range.lo;
          }
        }
        if (queryParam == null) return;
        var _grid = this;
        var ffresh = (fresh === undefined) ? true : !!(fresh);
        if (ffresh) {
          loadingIndexAlign = 0;
        }
        var _args = arguments;

        while (!_grid.acquireLock()) {
          //console.log("Couldn't acquire lock. Will try again in " + lockDebounce + "ms");
          doTimeout('acquirelock', lockDebounce, function () {
            var callee = _grid.ajaxLoadData;
            callee.apply(_grid, _args);
          });
          return false;
        }

        var queryRequestHandler = {
          onWillRequest: function (param) {
            _grid.getSpinner().setLoadingIndex(loadingIndexAlign);
            if (ffresh) {
              _grid.clearContentRows();
              _grid.scrollToIndex(0);
            }
          },
          onSuccess: function (data, param) {
            var response = data;
            var queryResult = response.data;
            _grid.updateStateBy(queryResult, ffresh);
          },

          onResultDidProcess: function (success, param) {
            _grid.releaseLock();
            _grid.getSpinner().setLoadingIndex(null);
            if(success){
              _grid.triggerLoadPending();
              _grid.updateMainUrl(true, param);
            }
          }
        }
        EntityRequest.query(queryParam, null, queryRequestHandler);
      }
    }

    TGrid.defaultProps = TGridDefaultProps;
    TGrid.DefaultMaxHeight = 400;

    function renderGrid(queryResult, div, isMain) {
      var gridEle = <TGrid isMain={isMain}/>;

      var grid = ReactDOM.render(gridEle, div);

      grid.updateStateBy(queryResult);
    }

    exports.TGrid = TGrid;
    exports.renderGrid = renderGrid;
  });