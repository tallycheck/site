define(
  function(require, exports, module) {

    var $ = require('jquery');
    var _ = require('underscore');
    var basic = require('basic');
    var Debugger = require('debugger');
    var dm = require('datamap');
    var math = require('math');
    var modal = require('jsx!modules/modal');
    var UriTemplate = require('UriTemplate');
    var UrlUtil = require('url-utility');
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

    var version_init = -1;
    var fetchDebounce = 200;
    var lockDebounce = 200;
    var updateUrlDebounce = 800;
    var ENABLE_DEBUG_LOG_4_SCROLL = true;
    var ENABLE_DEBUG_LOG_4_ACTION = true;
    var HIDE_URL_PAGESIZE = true;

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
        },
        csrf: function () {
          return $("form[name=formtemplate] input[name=_csrf]").val();
        }
      },
      AJAX_LOCK: 0,
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
      maxHeight: 0,
      //TGrid.stateUpdate -> Header.stateUpdate -> FilterHolder.stateUpdate -(X)-> TGrid.stateUpdate
      //avoid Inverse data Flow
      updateVersion: version_init,
      getDefaultProps: function () {
        return {
          isMain: false,
          namespace: 'gns_' + Math.floor(Math.random() * 1e15) + '.'
        };
      },
      getInitialState: function () {
        var beansMap = new Object();
        var ranges = new Ranges();
        var csrf = TGrid.csrf();
        return {
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
      },
      setMaxHeight: function (height) {
        height = height || TGrid.DefaultMaxHeight;
        var node = ReactDOM.findDOMNode(this);
        var $node = $(node);
        this.maxHeight = height;
        $node.css('max-height', '' + height + 'px');

        this.updateBodyMaxHeight();
      },
      updateBodyMaxHeight: function () {
        var headerGroup = $(ReactDOM.findDOMNode(this.refs.headerGroup));
        var body = $(ReactDOM.findDOMNode(this.refs.body));
        var footerGroup = $(ReactDOM.findDOMNode(this.refs.footerGroup));
        var maxBodyHeight = this.maxHeight - headerGroup.height() - footerGroup.height();
        body.css('max-height', '' + maxBodyHeight + 'px');
      },
      getSpinner(){
        return this.refs.body.refs.spinner;
      },
      doResize: function () {
        var header = this.refs.header;
        var headerFilterGroup = header.refs.filterGroup;
        var body = this.refs.body;
        var widths = headerFilterGroup.calcStartingWidths();
        headerFilterGroup.updateColumnWidth(widths);
        body.syncHeaderColumns();
      },
      componentDidMount: function () {
        var node = ReactDOM.findDOMNode(this);
        new ResizeSensor(node, this.doResize);
        this.setMaxHeight();
      },
      componentWillUnmount: function () {
        var node = ReactDOM.findDOMNode(this);
        ResizeSensor.detach(node, this.doResize);
      },
      shouldComponentUpdate: function (nextProps, nextState, nextContext) {
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
      },
      componentWillUpdate: function (nextProps, nextState, nextContext, transaction) {
        var ps = this.state;
        var ns = nextState;
        if ((ps.cparameter != ns.cparameter) || (version_init == this.updateVersion)) {
        }
        console.log("GRID will update");
      },
      componentDidUpdate: function (prevProps, prevState, prevContext, rootNode) {
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
        if ((ps.searchKey) != (ns.searchKey)) {
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
            <div ref="bodyGroup">
              <Body ref="body" entityContext={entityContext}
                    info={info}
                    entities={this.state}
                    onScroll={this.onScroll}
                    grid={this}
                    visibleRangeUpdate={this.onVisibleRangeUpdate}/>
            </div>
            <div ref="footerGroup">
              <Footer ref="footer"/>
            </div>
          </div>
        );
      },
      onSelectedIndexChanged: function (oldBean, newBean, oldIndex, newIndex) {
        console.log("selected index changed: " + oldIndex + " -> " + newIndex);
        if (newBean) {
          var idField = this.state.entityContext.idField;
          var id = basic.beanProperty(newBean, idField);
          this.refs.toolbar.focuseToId('' + id);
        } else {
          this.refs.toolbar.focuseToId('');
        }
      },
      onVisibleRangeUpdate: function () {
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
      },
      onScroll: function () {

      },
      updateMainUrl: function (all) {
        //if all: parameter update
        //else: just update startIndex
        var grid = this;
        var body = this.refs.body;
        var startIndex = body.visibleTopIndex();
        var startIndexParam = ((startIndex > 0) ? startIndex : null);
        if (this.props.isMain) {
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
      },
      updateHeaderParameter: function (prevCparam, nextCparam) {
        var header = this.refs.header;
        var headerVersion = header.state.version;
        if ((headerVersion < this.updateVersion) || (nextCparam != prevCparam)) {
          header.setState({
            cparameter: nextCparam,
            version: this.updateVersion
          });
        }
      },
      updateToolbarSearchText: function (searchField, prevSearchText, nextSearchText) {
        if (nextSearchText === prevSearchText)
          return;
        var search = this.refs.toolbar.refs.search;

        search.setState({
          searchField: searchField,
          inputting: undefined,
          presenting: nextSearchText
        });
      },
      onEventCreateButtonClick: function (e) {
        var grid = this;
        var body = this.refs.body;
        var readUri = this.state.links.create;
        var uri = readUri;
        require([EntityModalSpecsPath], function (EMSpecs) {
          var FormSubmitHandler = {
            onSuccess(tform, response){
              Debugger.log(ENABLE_DEBUG_LOG_4_ACTION, "create success ....");
              grid.doReload();
            }
          }
          var FormSubmitModalHandler = {
            onSuccess(modal, tform, response){
              modal.hide();
            }
          }
          class CreateSpec extends EMSpecs.Create {
          }
          var ms = ModalStack.getPageStack();
          ms.pushModalSpec(new CreateSpec({
            url: uri,
            createSubmitHandler: FormSubmitHandler,
            createSubmitModalHandler : FormSubmitModalHandler
          }));
        });
      },
      onEventUpdateButtonClick: function (e) {
        var grid = this;
        var body = this.refs.body;
        var bean = body.selectedBean();
        var readUriTemplate = this.state.links.read;
        var idObj = this.state.entityContext.getStandardIdObject(bean);
        var uri = new UriTemplate(readUriTemplate).fill(idObj);
        require([EntityModalSpecsPath], function (EMSpecs) {
          var FormSubmitHandler = {
            onSuccess(tform, response){
              Debugger.log(ENABLE_DEBUG_LOG_4_ACTION, "update success ....");
              grid.doReload();
            }
          }
          var FormSubmitModalHandler = {
            onSuccess(modal, tform, response){
              modal.hide();
            }
          }
          class ReadSpec extends EMSpecs.Read {
          }
          var ms = ModalStack.getPageStack();
          ms.pushModalSpec(new ReadSpec({
            url: uri,
            updateSubmitHandler :FormSubmitHandler,
            updateSubmitModalHandler : FormSubmitModalHandler
          }));
        });
      },
      onEventDeleteButtonClick: function (e) {
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
          ceilingType: entityContext.ceilingType,
          deleteExtraHandler: {
            onSuccess: function () {
              body.selectIndex(-1);
              grid.doLoadByFilters();
            }
          }
        };

        require([EntityModalSpecsPath], function (EMSpecs) {
          var EMSpecs = require(EntityModalSpecsPath);
          class DeleteSpec extends EMSpecs.Delete {
          }
          ;

          var ms = ModalStack.getPageStack();
          ms.pushModalSpec(new DeleteSpec(delOpts));
        });
      },
      dataAccess: function () {
        return new GridDataAccess(this);
      },
      requestDoFilterByFilters: function (caller) {
        if (caller.constructor.displayName != 'FilterHolder')
          throw new Error("Type error.");
        console.log("grid requestDoFilterByFilters");
        if (caller.leadingAhead(this.updateVersion)) {
          this.doLoadByFilters();
        }
      },
      doReload: function () {
        var da = this.dataAccess();
        var queryParam = da.buildQueryParam();
        var url = (new EntityRequest.QueryHandler()).buildUrl(queryParam);
        this.doLoadByUrl(url, true);
      },
      doLoadByUrl: function (url, fresh) {
        this.ajaxLoadData({url: url}, fresh);
      },
      doLoadByFilters: function () {
        var da = this.dataAccess();
        var cparam = da.gatherCriteriaParameter();
        this.setState({'cparameter': cparam}, function () {
          var queryParam = da.buildQueryParam();
          var url = (new EntityRequest.QueryHandler()).buildUrl(queryParam);
          this.doLoadByUrl(url, true);
        });
      },
      doLoadPending: function () {
        var da = this.dataAccess();
        var pendingRange = da.screenPendingRange();
        if (pendingRange == null) {
          return;
        }
        var pendingQueryParam = da.buildQueryParam(pendingRange);
        this.ajaxLoadData(pendingQueryParam, false);
      },
      triggerLoadPending: function () {
        var _this = this;
        doTimeout("loadpending", fetchDebounce, function () {
          _this.doLoadPending();
        });
      },
      ajaxLoadData: function (queryParam, fresh) {
        if (_.isObject(queryParam)) {
          var range = queryParam.range;
          if (range) {
            var loadAlign = range.fromEnd ? (range.hi - 1) : range.lo;
            this.getSpinner().setLoadingIndex(loadAlign);
          }
        }
        if (queryParam == null) return;
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

        class QueryHandler extends EntityRequest.QueryHandler {
          onSuccess(data, param) {
            var response = data;
            var queryResult = response.data;
            TGrid.updateStateBy(_grid, queryResult, ffresh);
            _grid.triggerLoadPending();
          }

          onComplete(param) {
            _grid.releaseLock();
            _grid.getSpinner().setLoadingIndex(null);
            _grid.updateMainUrl(true, param);
          }
        }
        EntityRequest.query(queryParam, new QueryHandler());
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