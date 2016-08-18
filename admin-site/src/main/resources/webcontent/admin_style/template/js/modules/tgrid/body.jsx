'use strict';

define(['jquery',
    'underscore',
    'math',
    'i18n!nls/entityText',
    'jsx!./rows',
    'perfectScrollbar'],
  function ($, _, math,
            entityText, TGridRows,
            Ps) {
    var React = require('react');
    var ReactDOM = require('react-dom');

    var Range = math.Range;
    var Ranges = math.Ranges;
    var Row = TGridRows.Row;
    var PaddingRow = TGridRows.PaddingRow;
    var NoRecordRow = TGridRows.NoRecordRow;

    var Spinner = React.createClass({
      getInitialState: function () {
        return {
          loadingIndex : -1,
          iconHeight : 0
        }
      },
      componentDidMount:function(){
        var si = this.refs.spinnerIcon;
        var node = ReactDOM.findDOMNode(si);
        this.setState({iconHeight : 10});
      },
      render: function () {
        var loadingIndex = this.state.loadingIndex;
        var iconHeight = this.state.iconHeight;
        var rowHeight = this.props.body.rowHeight;

        var visible = (iconHeight > 0) && (
          loadingIndex >= 0);
        var visibleStype = {"display" : (visible ? "block" : "none")};

        var offset = (loadingIndex * rowHeight) + ((rowHeight - iconHeight) / 2);
        var offsetStyle = {"top" : "" + offset + "px"};

        var style = _.extend({}, visibleStype, offsetStyle);

        return (<span className="body-spinner" style={style}>
          <i ref="spinnerIcon" className="spinner-item fa fa-spin fa-spinner"></i>
        </span>);
      },
      setLoadingIndex:function(index){
        if(index === null || index === undefined) index = -1;
        this.setState({loadingIndex : index});
      }
    });

    var InBodyHeader = React.createClass({
      initialized : false,
      getDefaultProps:function(){
        return {};
      },
      cloneHeaderColumns : function(){
        var header = this.props.header;
        if(header == null)
          return;
        var innerHtml = header.calcBodyHeaderRowHtml();
        var htmlSlot = $(this.refs.slot);
        htmlSlot.html(innerHtml);
        this.initialized = true;
      },
      componentDidMount() {
        this.cloneHeaderColumns();
      },
      componentDidUpdate:function(prevProps, prevState){
        if(!_.isEqual(prevProps.gridinfo, this.props.gridinfo)) {
          this.cloneHeaderColumns();
        }
        if(!this.initialized){
          this.cloneHeaderColumns();
        }
      },
      render : function(){
        return <thead ref='slot'>
        </thead>
      }
    });

    var Body = React.createClass({
      rowHeight: 0,
      updateRowHeight: function (height) {
        if (this.rowHeight == 0) {
          this.rowHeight = height;
        }
      },
      getDefaultProps: function () {
        return {
          visibleRangeUpdate: function () {
            var _this = this;
            var topIndex = _this.visibleTopIndex();
            var bottomIndex = _this.visibleBottomIndex();

            console.log("[" + topIndex + " " + bottomIndex + "]");
          }
        };
      },
      getInitialState: function () {
        return {
          selectedIndex : -1
        }
      },
      onScroll: function (e) {
        var _this = e.data;
        var updater = _this.props.visibleRangeUpdate;
        updater.call(_this);
      },
      visibleRange: function () {
        return new Range(this.visibleTopIndex(), this.visibleBottomIndex());
      },
      visibleTopIndex: function () {
        return Math.floor(this.visibleTopFloatIndex());
      },
      visibleBottomIndex: function () {
        return Math.ceil(this.visibleBottomFloatIndex());
      },
      visibleTopFloatIndex: function () {
        if (this.rowHeight == 0)
          return 0;
        var node = ReactDOM.findDOMNode(this);
        var $node = $(node).find('.ps-scrollbar-y-rail');
        var offset = $node[0].offsetTop;
        return offset / this.rowHeight;
      },
      visibleBottomFloatIndex: function () {
        if (this.rowHeight == 0)
          return 0;
        var node = ReactDOM.findDOMNode(this);
        var $node = $(node);
        var $scrollbar = $(node).find('.ps-scrollbar-y-rail');
        var offset = $scrollbar[0].offsetTop;
        offset = offset + $node.height();
        return offset / this.rowHeight;
      },
      componentDidMount: function () {
        var node = ReactDOM.findDOMNode(this);
        var $node = $(node);
        Ps.initialize(node);
        $node.on('ps-scroll-y', this, this.onScroll);
      },
      componentDidUpdate:function(prevProps, prevState, prevContext, rootNode){
        if((prevState.selectedIndex) != (this.state.selectedIndex)){
          var entities = this.props.entities;
          var oldIndex = prevState.selectedIndex;
          var newIndex = this.state.selectedIndex;

          var oldBean = (oldIndex >= 0) ? entities.beansMap[oldIndex] : undefined;
          var newBean = (newIndex >= 0) ? entities.beansMap[newIndex] : undefined;
          
          this.props.grid.onSelectedIndexChanged(oldBean, newBean, oldIndex, newIndex);
        }
        this.updatePaddingRowHeight();
      },
      updatePaddingRowHeight: function () {
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
        var colspan = gridinfo ? gridinfo.fields.length : 1;
        var beanSegs = entities.recordRanges.makeSegements(new Range(0, entities.totalRecords));
        var theBody = this;
        var hasRecord = entities.totalRecords > 0;
        var rows = [];
        var selectedIndex = this.state.selectedIndex;
        _.each(beanSegs, function (seg) {
          var range = seg.r;
          var cover = seg.cover;
          if (!cover) {
            rows.push(<PaddingRow key={range.toString()} range={range}/>);
          } else {
            range.each(function (i) {
              var bean = entities.beansMap[i];
              if(_.isNull(bean)||_.isUndefined(bean)){
                rows.push(<PaddingRow key={i} range={new Range(i, i+1)}/>);
              }else {
                var row = <Row key={i} selected={selectedIndex == i} entityContext={entityContext} info={gridinfo}
                               bean={bean} beanIndex={i} body={theBody}/>;
                rows.push(row);
              }
            })
          }
        });
        var header = this.props.grid.refs.header;

        return (<div className="body" ref="scrollContainer">
          <table className="table body-table table-condensed table-hover" onClick={this.onTableClick}>
            <InBodyHeader ref="inbodyHeader" gridinfo={gridinfo} header={header}/>
            <tbody className="real-data">
            <NoRecordRow hasRecord={hasRecord} colspan={colspan}/>
            {rows}
            </tbody>
          </table>
          <Spinner ref="spinner" body={this}/>
        </div>);
      },
      selectedBean : function(){
        var selectedIdx = this.state.selectedIndex;
        var beansMap = this.props.entities.beansMap;
        if(selectedIdx < 0) return null;
        return beansMap[selectedIdx];
      },
      selectIndex : function(index){
        if(index < 0)
          this.setState({selectedIndex : -1});

        var beansMap = this.props.entities.beansMap;
        var bean = beansMap[index];
        if(bean){
          this.setState({selectedIndex : index});
        }
      },
      onTableClick:function(e){
        var body = this;
        var $el = $(e.target),
          $row = $el.closest('tr.data-row'),
          newIndex = -1;
        if ($row.length == 0) {
          newIndex = -1;
        }else{
          newIndex = $row.attr('data-row-index');
        }
        var oldIndex = body.state.selectedIndex;
        if(newIndex == oldIndex)
          newIndex = -1;
        this.selectIndex(newIndex);
      },
      syncHeaderColumns(){
        this.refs.inbodyHeader.cloneHeaderColumns();
      }
    });

    return {
      Body: Body
    };
  });
