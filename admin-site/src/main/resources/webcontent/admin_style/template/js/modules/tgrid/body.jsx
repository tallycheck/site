'use strict';

define(
  function(require, exports, module) {
    var $ = require('jquery');
    var _ = require('underscore');
    var math = require('math');
    var EntityMsg = require('i18n!../nls/entity');
    var TGridRows = require('jsx!./rows');
    var Ps = require('perfectScrollbar');

    var React = require('react');
    var ReactDOM = require('react-dom');

    var Range = math.Range;
    var Ranges = math.Ranges;
    var Row = TGridRows.Row;
    var PaddingRow = TGridRows.PaddingRow;
    var NoRecordRow = TGridRows.NoRecordRow;

    class Spinner extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          loadingIndex: -1,
          iconHeight: 0
        };
      }

      componentDidMount() {
        var si = this.refs.spinnerIcon;
        var node = ReactDOM.findDOMNode(si);
        this.setState({iconHeight: 10});
      }

      render() {
        var loadingIndex = this.state.loadingIndex;
        var iconHeight = this.state.iconHeight;
        var rowHeight = this.props.body.rowHeight;

        var visible = (iconHeight > 0) && (
          loadingIndex >= 0);
        var visibleStype = {"display": (visible ? "block" : "none")};

        var offset = (loadingIndex * rowHeight) + ((rowHeight - iconHeight) / 2);
        var offsetStyle = {"top": "" + offset + "px"};

        var style = _.extend({}, visibleStype, offsetStyle);

        return (<span className="body-spinner" style={style}>
          <i ref="spinnerIcon" className="spinner-item fa fa-spin fa-spinner"></i>
        </span>);
      }

      setLoadingIndex(index) {
        if (index === null || index === undefined) index = -1;
        this.setState({loadingIndex: index});
      }
    }

    class InBodyHeader extends React.Component {
      constructor(props) {
        super(props);
        this.initialized = false;
      }

      cloneHeaderColumns() {
        var header = this.props.header;
        if (header == null)
          return;
        var innerHtml = header.calcBodyHeaderRowHtml();
        var htmlSlot = $(this.refs.slot);
        htmlSlot.html(innerHtml);
        this.initialized = true;
      }

      componentDidMount() {
        this.cloneHeaderColumns();
      }

      componentDidUpdate(prevProps, prevState) {
        if (!_.isEqual(prevProps.gridinfo, this.props.gridinfo)) {
          this.cloneHeaderColumns();
        }
        if (!this.initialized) {
          this.cloneHeaderColumns();
        }
      }

      render() {
        return <thead ref='slot'>
        </thead>
      }
    }

    var BodyDefaultProps = {
      visibleRangeUpdate: function () {
        var _this = this;
        var topIndex = _this.visibleTopIndex();
        var bottomIndex = _this.visibleBottomIndex();

        console.log("[" + topIndex + " " + bottomIndex + "]");
      }
    }
    var BodyStatics = {
      defaultProps: BodyDefaultProps
    }
    class Body extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          selectedIndex: -1
        };
        this.rowHeight = 0;
        this.onScroll = this.onScroll.bind(this);
        this.onTableDbClick = this.onTableDbClick.bind(this);
        this.onTableClick = this.onTableClick.bind(this);
      }

      updateRowHeight(height) {
        if (this.rowHeight == 0) {
          this.rowHeight = height;
        }
      }

      onScroll(e) {
        var _this = e.data;
        var updater = _this.props.visibleRangeUpdate;
        updater.call(_this);
      }

      visibleRange(float) {
        return new Range(this.visibleTopIndex(float), this.visibleBottomIndex(float));
      }

      visibleTopIndex(float) {
        if (this.rowHeight == 0)
          return 0;
        var node = ReactDOM.findDOMNode(this);
        var $node = $(node).find('.ps-scrollbar-y-rail');
        var offset = $node[0].offsetTop;
        var index = offset / this.rowHeight;
        return float ? index : Math.floor(index);
      }

      visibleBottomIndex(float) {
        if (this.rowHeight == 0)
          return 0;
        var node = ReactDOM.findDOMNode(this);
        var $node = $(node);
        var $scrollbar = $(node).find('.ps-scrollbar-y-rail');
        var offset = $scrollbar[0].offsetTop;
        offset = offset + $node.height();
        var index = offset / this.rowHeight;
        return float ? index : Math.ceil(index);
      }

      bindEvent(bind){
        var $bodyTable = $(this.refs.bodyTable);
        if(bind){
          this.bindEvent(false);

          $bodyTable.on("dblclick", this, this.onTableDbClick);
          $bodyTable.on("click", this, this.onTableClick);
        }else{
          $bodyTable.off("dblclick", this.onTableDbClick);
          $bodyTable.off("click", this.onTableClick);
        }
      }

      componentDidMount() {
        var node = ReactDOM.findDOMNode(this);
        var $node = $(node);
        Ps.initialize(node);
        $node.on('ps-scroll-y', this, this.onScroll);
        this.bindEvent(true);
      }

      componentWillUnmount() {
        this.bindEvent(false);
      }

      componentWillUpdate(nextProps, nextState, nextContext, transaction) {
        var ps = this.state;
        var ns = nextState;
        if (ps.selectedIndex != ns.selectedIndex) {
          var entities = this.props.entities;
          var oldIndex = ps.selectedIndex;
          var newIndex = ns.selectedIndex;

          var oldBean = (oldIndex >= 0) ? entities.beansMap[oldIndex] : undefined;
          var newBean = (newIndex >= 0) ? entities.beansMap[newIndex] : undefined;

          this.props.grid.onSelectedIndexWillChange(oldBean, newBean, oldIndex, newIndex);
        }
      }

      componentDidUpdate(prevProps, prevState, prevContext, rootNode) {
        var ps = prevState;
        var ns = this.state;
        if (ps.selectedIndex != ns.selectedIndex) {
          var entities = this.props.entities;
          var oldIndex = ps.selectedIndex;
          var newIndex = ns.selectedIndex;

          var oldBean = (oldIndex >= 0) ? entities.beansMap[oldIndex] : undefined;
          var newBean = (newIndex >= 0) ? entities.beansMap[newIndex] : undefined;

          this.props.grid.onSelectedIndexChanged(oldBean, newBean, oldIndex, newIndex);
        }
        this.updatePaddingRowHeight();
        this.bindEvent(true);
      }

      updatePaddingRowHeight() {
        var node = ReactDOM.findDOMNode(this);
        var $paddingRows = $(node).find("tr.padding-row");
        var rowHeight = this.rowHeight;
        $paddingRows.each(function (idx, item) {
          var $row = $(item);
          var rowCount = $row.data("row-count");
          var height = rowHeight * rowCount;
          $row.height(height);
        });
      }

      render() {
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
              if (_.isNull(bean) || _.isUndefined(bean)) {
                rows.push(<PaddingRow key={i} range={new Range(i, i+1)}/>);
              } else {
                var row = <Row key={i} selected={selectedIndex == i} entityContext={entityContext} info={gridinfo}
                               bean={bean} beanIndex={i} body={theBody}/>;
                rows.push(row);
              }
            })
          }
        });
        var header = this.props.grid.refs.header;

        return (<div className="body" ref="scrollContainer">
          <table ref="bodyTable" className="table body-table table-condensed table-hover" >
            <InBodyHeader ref="inbodyHeader" gridinfo={gridinfo} header={header}/>
            <tbody className="real-data">
            <NoRecordRow hasRecord={hasRecord} colspan={colspan}/>
            {rows}
            </tbody>
          </table>
          <Spinner ref="spinner" body={this}/>
        </div>);
      }

      selectedBean() {
        var selectedIdx = this.state.selectedIndex;
        var beansMap = this.props.entities.beansMap;
        if (selectedIdx < 0) return null;
        return beansMap[selectedIdx];
      }

      selectIndex(index) {
        if (index < 0)
          this.setState({selectedIndex: -1});

        var beansMap = this.props.entities.beansMap;
        var bean = beansMap[index];
        if (bean) {
          this.setState({selectedIndex: index});
        }
      }

      findRowIndex(e) {
        var body = this;
        var $el = $(e.target),
          $row = $el.closest('tr.data-row'),
          newIndex = -1;
        if ($row.length == 0) {
          newIndex = -1;
        } else {
          newIndex = $row.attr('data-row-index');
        }
        var oldIndex = body.state.selectedIndex;
        if (newIndex == oldIndex)
          newIndex = -1;
        return newIndex;
      }

      onTableDbClick(e) {
        var grid = this.props.grid;
        var entities = this.props.entities;
        var rowIndex = this.findRowIndex(e);
        var rowBean = (rowIndex >= 0) ? entities.beansMap[rowIndex] : undefined;

        grid.notifyRowDoubleClick(rowIndex, rowBean);
      }

      onTableClick(e) {
        console.log("click");
        var rowIndex = this.findRowIndex(e);
        this.selectIndex(rowIndex);
      }

      syncHeaderColumns() {
        this.refs.inbodyHeader.cloneHeaderColumns();
      }
    }
    _.extend(Body, BodyStatics);

    exports.Body = Body;
  });
