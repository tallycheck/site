define(["jquery",
    "underscore",
    "math",
    "i18n!nls/entitytext",
    'url-utility',
    'jsx!./tgrid-rows',
    "perfectScrollbar"],
  function ($, _, math,
            entitytext, UrlUtil, TGridRows,
            Ps) {
    var React = require('react');
    var ReactDOM = require('react-dom');

    var Range = math.Range;
    var Ranges = math.Ranges;
    var Row = TGridRows.Row;
    var PaddingRow = TGridRows.PaddingRow;
    var NoRecordRow = TGridRows.NoRecordRow;

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
      componentDidUpdate: function () {
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
        var cols = _.map(gridinfo.fields, function (fi) {
          return (<th key={fi.name} className="column explicit-size"
                      scope="col"></th>);
        });
        var colspan = cols.length;
        var beanSegs = entities.recordRanges.makeSegements(new Range(0, entities.totalRecords));
        var theBody = this;
        var hasRecord = entities.totalRecords > 0;
        var rows = [];
        _.each(beanSegs, function (seg) {
          var range = seg.r;
          var cover = seg.cover;
          if (!cover) {
            rows.push(<PaddingRow key={range.toString()} range={range}/>);
          } else {
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

    return {
      Body: Body
    };
  });
