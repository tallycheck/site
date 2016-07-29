define(["jquery", "underscore","datamap","math",
    "perfectScrollbar",
    './tgrid/tgrid-data',
    'jsx!./tgrid/tgrid-header',
    'jsx!./tgrid/tgrid-rows',
    'jsx!./tgrid/tgrid-toolbar',
    "i18n!nls/entitytext",
    "ResizeSensor", "ajax"],
  function ($, _, dm, math,
            Ps,
            TGridDA,
            TGridHeader,
            TGridRow, TGridToolbar,
            entitytext, ResizeSensor, ajax) {
    var React = require('react');
    var ReactDOM = require('react-dom');
    var Range = math.Range;
    var Ranges = math.Ranges;
    var Row = TGridRow.Row;
    var PaddingRow = TGridRow.PaddingRow;
    var NoRecordRow = TGridRow.NoRecordRow;
    var Toolbar = TGridToolbar.Toolbar;
    var GridDataAccess = TGridDA.GridDataAccess;
    var Header = TGridHeader.Header;

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
          var beansMap = fresh ? new Object() : origState.beansMap;

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
      maxHeight:0,
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
      },
      componentDidUpdate:function(prevProps, prevState){
        if((prevState.cparameter) != (this.state.cparameter)){
          this.onCriteriaParameterUpdate(prevState.cparameter, this.state.cparameter);
        }
        this.doResize();
        this.onVisibleRangeUpdate();
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
              <Body ref="body" entityContext={entityContext} info={entityContext.info} entities={this.state} visibleRangeUpdate={this.onVisibleRangeUpdate}/>
              <Spinner ref="spinner" />
            </div>
            <div ref="footerGroup">
              <Footer ref="footer"/>
            </div>
          </div>
          );
      },
      dataAccess : function(){
        return new GridDataAccess(this);
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
      loadByUrl : function (url, fresh) {
        var _grid = this;
        var handlers = {
          ondata: function (/*ondata*/ response) {
            var queryResponse = dm.queryResponse(response.data);
            Grid.updateStateBy(_grid, queryResponse, fresh);
          }
        };
        console.log("will load url: " + url);
        //ajax.get({
        //  url:url,
        //  success:function (response) {
        //    if (handlers.ondata) {
        //      handlers.ondata(response);
        //    }
        //  },
        //  complete:function(jqXHR, textStatus){
        //  }
        //
        //});
      },
      doLoadByUi : function(){
        var cparam = this.dataAccess().gatherCriteriaParameter();
        this.setState({'cparameter' : cparam});
      },
      onCriteriaParameterUpdate : function(prevCparam, nextCparam){
        if(nextCparam == prevCparam)
          return;
        var header = this.refs.header;
        header.setState({cparameter : nextCparam});
        var loadUrl = this.dataAccess().buildLoadUrl();
        this.loadByUrl(loadUrl, true);
      }
    });

    var Body = React.createClass({
      rowHeight : 0,
      updateRowHeight:function(height){
        if(this.rowHeight == 0){
          this.rowHeight = height;
        }
      },
      getDefaultProps: function () {
        return {
          visibleRangeUpdate : function(){
            var _this = this;
            var topIndex = _this.visibleTopIndex();
            var bottomIndex = _this.visibleBottomIndex();

            console.log("[" + topIndex + " " + bottomIndex + "]");
          }
        };
      },
      onScroll:function(e){
        var _this = e.data;
        var updater = _this.props.visibleRangeUpdate;
        updater.call(_this);
      },
      visibleRange:function(){
        return new Range(this.visibleTopIndex(), this.visibleBottomIndex());
      },
      visibleTopIndex : function(){
        return Math.floor(this.visibleTopFloatIndex());
      },
      visibleBottomIndex : function(){
        return Math.ceil(this.visibleBottomFloatIndex());
      },
      visibleTopFloatIndex : function(){
        if(this.rowHeight == 0)
          return 0;
        var node = ReactDOM.findDOMNode(this);
        var $node = $(node).find('.ps-scrollbar-y-rail');
        var offset = $node[0].offsetTop;
        return offset / this.rowHeight;
      },
      visibleBottomFloatIndex : function(){
        if(this.rowHeight == 0)
          return 0;
        var node = ReactDOM.findDOMNode(this);
        var $node = $(node);
        var $scrollbar = $(node).find('.ps-scrollbar-y-rail');
        var offset = $scrollbar[0].offsetTop;
        offset = offset + $node.height();
        return offset / this.rowHeight;
      },
      componentDidMount:function(){
        var node = ReactDOM.findDOMNode(this);
        var $node = $(node);
        Ps.initialize(node);
        $node.on('ps-scroll-y', this, this.onScroll);
      },
      componentDidUpdate:function(){
        this.updatePaddingRowHeight();
      },
      updatePaddingRowHeight:function(){
        var node = ReactDOM.findDOMNode(this);
        var $paddingRows = $(node).find("tr.padding-row");
        var rowHeight = this.rowHeight;
        $paddingRows.each(function (idx, item) {
          var $row = $(item);
          var rowCount = $row.data("row-count");
          var height = rowHeight * rowCount;
          $row.height(height);
        });
      },
      render: function () {
        var gridinfo = this.props.info;
        var entities = this.props.entities;
        var entityContext = this.props.entityContext;
        var cols = _.map(gridinfo.fields, function (fi) {
          return (<th key={fi.name} className="column explicit-size"
                      scope="col" ></th>);
        });
        var colspan = cols.length;
        var beanSegs = entities.recordRanges.makeSegements(new Range(0, entities.totalRecords));
        var theBody = this;
        var hasRecord = entities.totalRecords > 0;
        var rows = [];
        _.each(beanSegs, function(seg){
          var range = seg.r;
          var cover = seg.cover;
          if(!cover){
            rows.push(<PaddingRow key={range.toString()} range={range}/>);
          }else{
            range.each(function (i) {
              var bean = entities.beansMap[i];
              var row = <Row key={i} entityContext={entityContext} info={gridinfo}
                             bean={bean} beanIndex={i} body={theBody}/>;
              rows.push(row);
            })
          }
        });

        return (<div className="body" ref="scrollContainer">
          <table className="table body-table table-condensed table-hover">
            <thead>
            <tr data-col-visible="0,1,1,1,1,1,1"
                data-col-percents="0,0.16666666666666666,0.16666666666666666,0.16666666666666666,0.16666666666666666,0.16666666666666666,0.16666666666666666">
              {cols}
            </tr>
            </thead>
            <tbody className="real-data">
            <NoRecordRow hasRecord={hasRecord} colspan={colspan}/>
            {rows}
            </tbody>
          </table>
        </div>);
      }
    });

    var Spinner = React.createClass({
      render: function () {
        return (<span className="spinner">
          <i className="spinner-item fa fa-spin fa-spinner"></i>
        </span>);
      }
    });
    var Footer = React.createClass({
      getDefaultProps:function(){
        return {range : new Range(0,0), total : 0};
      },
      getInitialState:function(){
        var _this = this;
        return {range : _this.props.range, total : _this.props.total};
      },
      render: function () {
        var text = entitytext["GRID_DATA_RANGE"](this.state.range, this.state.total);
        return (<div className="footer">
          <div>
            <span>
              <span className="screen-range-of-results">
              {text}
              </span>
            </span>
          </div>
        </div>);
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