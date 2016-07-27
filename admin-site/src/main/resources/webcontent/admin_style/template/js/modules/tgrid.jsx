define(["jquery", "underscore","datamap","math",
    "perfectScrollbar",
      'jsx!../modules/tgrid-filter',
      'jsx!../modules/tgrid-cell',
      "i18n!nls/entitytext", "ResizeSensor"],
  function ($, _, dm, math,
            Ps,
            TGridFilter, TGridCell,
            entitytext, ResizeSensor) {
    var React = require('react');
    var ReactDOM = require('react-dom');
    var Range = math.Range;
    var Ranges = math.Ranges;

    var GAS = {
      CREATE_ACTION:"create",
      READ_ACTION:"read",
      UPDATE_ACTION:"update",
      DELETE_ACTION:"delete"
    };

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

    var GridDataAccess = function(grid){
      this.grid = grid;
    }
    GridDataAccess.prototype = {
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
      }
    }

    var Grid = React.createClass({
      statics: {
        DefaultMaxHeight: 400,
        updateStateBy : function(grid, queryResult){
          var origState = grid.state;
          var ranges = origState.recordRanges;

          var entities = queryResult.entities;
          var beansMap = origState.beansMap;
          var beans = entities.beans;
          var startIdx = entities.startIndex;
          if(beans != null){
            _.each(beans, function(bean, i){
              beansMap[startIdx + i] = bean;
            });
          }
          var range = new Range(entities.startIndex, entities.startIndex + beans.length);
          ranges.add(range);
          var newState = {
            totalRecords:entities.totalCount,
            recordRanges:ranges,
            parameter:"",
            criterialParameter:"",
            beansMap : beansMap
          };
          grid.setState(newState);
        },
        LoadSource : {UI : "ui", URL : "url" , PARAMETER : 'parameter', NONE : 'none'}
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
          criterialParameter:"",
          beansMap : beansMap
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
          range: new Range(Math.floor(startIndex), Math.ceil(endIndex)),
          total: totalRecords
        };
        footer.setState(obj);
      },
      componentDidUpdate:function(){
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
      doLoadByUi : function(){
        var gridDataAccess = new GridDataAccess(this);
        return gridDataAccess.gatherCriteriaParameter();
      }
    });

    var Toolbar = React.createClass({
      render: function () {
        var gridInfo = this.props.info;
        return (
          <div className="toolbar row">
            <Search gridInfo={gridInfo} actions={this.props.actions} links={this.props.links}/>
            <Actions actions={this.props.actions} links={this.props.links}/>
            <form method="POST" className="post-agent" action="">
              <input type="hidden" name="_csrf" value="f9f562de-5b37-43ce-986e-8614b9737c75"/>
            </form>
          </div>
        );
      }
    });
    var Search = React.createClass({
      getInitialState: function () {
        return {searchText: ""};
      },
      handleDelClick: function (e) {
        var inputDom = this.refs.searchInput;
        var delDom = this.refs.deleteI;
        inputDom.value = "";
        inputDom.focus();
        this.setState({searchText: ""});
      },
      handleSearchTextChange: function (event) {
        var searchText = event.target.value;
        this.setState({searchText: searchText});
        var delDom = this.refs.deleteI;
        var delDisplay = (!!searchText ? "block" : "none");
      },
      render: function () {
        var gridinfo = this.props.gridInfo;
        if (gridinfo.primarySearchField) {
          var searchFieldName = gridinfo.primarySearchField;
          var searchField = _.find(gridinfo.fields, function (f) {
            return f.name == searchFieldName
          });
          var searchFieldNameFriendly = (searchField != null) ? searchField.friendlyName : searchFieldName;
          var searchText = this.state.searchText;
          var delStyle = {"display": (!!searchText ? "block" : "none")};

          return (
            <div className="search-group" data-search-column={searchFieldName}>
              <div className="input-group">
                <button className="btn search-btn" type="button"> <i className="fa fa-filter"></i> </button>
                <span className="search-text">
                  <span className="search-input-element">
                    <i className="fa fa-search embed-hint"></i>
                    <input className="search-input" ref="searchInput" data-name={searchFieldName}
                           placeholder={searchFieldNameFriendly} defaultValue={searchText}
                           onChange={this.handleSearchTextChange} type="text"/>
                    <i className="fa fa-times-circle embed-delete" ref="deleteI" onClick={this.handleDelClick}
                       style={delStyle}></i>
                  </span>
                </span>
              </div>
            </div>
          );
        } else {
          return (<div className="search-group"/>);
        }
      }
    });
    var Actions = React.createClass({
      actionObj : function(actionName){
        var links=this.props.links;
        var actionUri = links[actionName];
        var actionText = entitytext["GRID_ACTION_" + actionName];
        return {
          name:actionName,
          uri:actionUri,
          text:actionText};
      },
      makeActionButton: function (actionObject, isEntityAction, icon) {
        var ao = actionObject;
        var actionName = ao.name;
        var actionUri = ao.uri;
        var actionText = ao.text;
        var btn = (
          <button type="button" key={actionName} className={"btn btn-default action-control" + isEntityAction ? "entity-action":""}
                  data-action={actionName}
                  data-edit-in-modal="true" data-edit-success-redirect="false"
                  data-action-uri={actionUri}>
            <span className={"fa " + icon} aria-hidden="true"></span> {actionText}
          </button>);
        return btn;
      },
      render: function () {
        var actions=this.props.actions,
          links=this.props.links,
          btns = [];

        if(actions.includes(GAS.CREATE_ACTION)){
            var actionName = GAS.CREATE_ACTION;
            var ao = this.actionObj(actionName);
            var actionUri = ao.uri;
            var actionText = ao.text;
            var btn = (
              <button type="button" key={actionName} className="btn btn-default action-control" data-action={actionName}
                      data-edit-in-modal="true" data-edit-success-redirect="false"
                      data-action-uri={actionUri}>
                <span className="fa fa-plus" aria-hidden="true"></span> {actionText}
              </button>);
            btns.push(btn);
        }
        if(actions.includes(GAS.UPDATE_ACTION)){
            var actionName = GAS.UPDATE_ACTION;
            var ao = this.actionObj(actionName);
            var actionUri = ao.uri;
            var actionText = ao.text;
            var btn = (
                <button type="button" key={actionName} className="btn btn-default action-control entity-action" data-action={actionName}
                    data-edit-in-modal="true"
                    data-action-url="" data-edit-success-redirect="false" disabled="disabled"
                    data-action-uri={actionUri}>
                    <span className="fa fa-pencil-square-o" aria-hidden="true"></span> {actionText}
                </button>);
            btns.push(btn);
        }
        if(actions.includes(GAS.DELETE_ACTION)){
            var actionName = GAS.DELETE_ACTION;
            var ao = this.actionObj(actionName);
            var actionUri = ao.uri;
            var actionText = ao.text;
            var btn = (
              <button type="button" key={actionName} className="btn btn-default action-control entity-action" data-action={actionName}
                    data-action-url="" disabled="disabled"
                    data-action-uri={actionUri}>
                    <span className="fa fa-times" aria-hidden="true"></span> {actionText}</button>);
            btns.push(btn);
        }

        return (
          <div className="grid-action-group-container"><div className="action-group">{btns}</div></div>
        );
      }
    });
    var HeaderColsGroup = React.createClass({
      render : function(){
        return (<tr>{this.props.children}</tr>);
      }
    });
    var Header = React.createClass({
      getDefaultProps : function(){
        return {
          info : undefined,
          gridnamespace : ''
        };
      },
      render: function () {
        var gridinfo = this.props.info;
        var grid = this.props.grid;
        var colsNames =[];
        var cols = _.map(gridinfo.fields, function (fi) {
          var col = TGridFilter.makeFilter(fi, gridinfo, grid);
          colsNames.push(col.ref);
          return col;
        });
        this.ColumnsNames = colsNames;
        return (
          <div className="header">
            <table className="table header-table table-condensed table-hover">
              <thead>
              <HeaderColsGroup ref="colsGroup">
                {cols}
              </HeaderColsGroup>
              </thead>
            </table>
          </div>);
      },
      getAllFilterHolder : function(){
        var _this = this;
        var colsNames = this.ColumnsNames;
        var fhs = _.map(colsNames, function(cn){
          var fh = _this.refs[cn];
          return fh;
        });
        return fhs;
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
      visibleTopIndex : function(){
        if(this.rowHeight == 0)
          return 0;
        var node = ReactDOM.findDOMNode(this);
        var $node = $(node).find('.ps-scrollbar-y-rail');
        var offset = $node[0].offsetTop;
        return offset / this.rowHeight;
      },
      visibleBottomIndex : function(){
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
        console.log("Body componentDidMount, rowHeight: " + this.rowHeight);
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
    var Row = React.createClass({
      componentDidMount:function(){
        var body = this.props.body;
        if(body.rowHeight ==0){
          var node = ReactDOM.findDOMNode(this);
          var height = $(node).height();
          body.updateRowHeight(height);
        }
      },
      render: function () {
        var entityCtx = this.props.entityContext;
        var gridinfo = this.props.info;
        var bean = this.props.bean;
        var cells = TGridCell.makeCells(entityCtx, gridinfo, bean);
        return (<tr className="data-row">
          {cells}
        </tr>);
      }
    });
    var PaddingRow = React.createClass({
      render: function () {
        var range = this.props.range;
        var padRows = range.width();
        return (<tr className="padding-row" data-row-count={padRows}></tr>);
      }
    });
    var NoRecordRow = React.createClass({
      render: function () {
        var text = entitytext["NO_RECORDS_FOUND"];
        var span = this.props.colspan;
        var hasRec = this.props.hasRecord;
        var style = {"display" : hasRec ? "none" : ""};
        return (<tr className="empty-mark">
          <td className="entity-grid-no-results" colSpan={span} style={style}>{text}</td>
        </tr>);
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