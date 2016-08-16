define(
  function(require, exports, module) {
    var $ = require('jquery');
    var _ = require('underscore');
    var basic = require('basic');
    var TFilters = require('jsx!./filters');
    var entityText = require('i18n!nls/entityText');
    var UrlUtil = require('url-utility');
    var jui = require('jquery-ui');

    var React = require('react');
    var ReactDOM = require('react-dom');

    var Orders = TFilters.Orders;
    var Filters = TFilters.Filters;
    var FilterHolderComp = require('jsx!./filter-holder');
    var FilterHolder = FilterHolderComp.FilterHolder;

    var FilterGroup = React.createClass({
      resizing: {
        columnIndex: -1, // if < 0, inactive; if >= 0, active
        startX: undefined,
        startWidths: undefined,
        totalWidth: 0,
        active: function () {
          return this.columnIndex >= 0;
        }
      },
      calcStartingWidths: function () {
        var widths = [];
        _.each(this.props.header.filterHolders(), function (fh) {
          var $fh = $(ReactDOM.findDOMNode(fh));
          var width = $fh.outerWidth();
          widths.push(width);
        });
        return widths;
      },
      enterResizing: function (columnIndex, startX) {
        var resizing = this.resizing;
        resizing.columnIndex = columnIndex;
        resizing.startX = startX;
        resizing.startWidths = this.calcStartingWidths();
        ;
        resizing.totalWidth = 0;

        _.each(resizing.startWidths, function (w) {
          resizing.totalWidth += w;
        });

        $(document).disableSelection();
      },
      leaveResizing: function () {
        var resizing = this.resizing;
        resizing.columnIndex = -1;
        resizing.startX = undefined;
        resizing.startWidths = undefined;
        resizing.totalWidth = 0;

        $(document).enableSelection();
      },
      getInitialState: function () {
        var children = this.props.children;
        var visibleTotal = 0;
        var visibles = _.map(children, function (child) {
          var fi = child.props.fieldinfo;
          var visi = (fi.gridVisible ? 1 : 0);
          visibleTotal += visi;
          return visi;
        });
        if (visibleTotal == 0)visibleTotal = 1;
        var visPer = _.map(visibles, function (t, i) {
          return 1.0 * t / visibleTotal;
        });

        return {visibles: visibles, visiblePercents: visPer};
      },
      componentDidMount: function () {
        $(document).on('mousemove', this, this.onResizerMouseMove);
        $(document).on('mouseup', this, this.onResizerMouseUp);
      },
      componentWillUnmount: function () {
        $(document).off('mousemove', this.onResizerMouseMove);
        $(document).off('mouseup', this.onResizerMouseUp);
      },
      render: function () {
        return (<tr ref="filterGroupRoot">{this.props.children}</tr>);
      },
      onResizerMouseMove: function (e) {
        if (this.resizing.active()) {
          var resizing = this.resizing;
          var $groupNode = $(ReactDOM.findDOMNode(this));
          var groupOffset = $groupNode.offset();
          var mx = e.pageX, my = e.pageY;
          if (mx < (groupOffset.left - 100) || mx > (groupOffset.left + $groupNode.width() + 100) ||
            (my < (groupOffset.top - 100)) || (my > (groupOffset.top + $groupNode.height() + 100))) {
            this.leaveResizing();
            return;
          }

          var minColumnWidth = 30;
          var index = resizing.columnIndex;
          var widthDiff = (mx - resizing.startX);
          var minAllow = -resizing.startWidths[index] + minColumnWidth;
          var maxAllow = resizing.startWidths[index + 1] - minColumnWidth;

          if (widthDiff < minAllow) {
            widthDiff = minAllow;
          } else if (widthDiff > maxAllow) {
            widthDiff = maxAllow;
          }

          var newLeftWidth = resizing.startWidths[index] + widthDiff;
          var newRightWidth = resizing.startWidths[index + 1] - widthDiff;

          var newWidths = resizing.startWidths.slice(0);
          newWidths[index] = newLeftWidth;
          newWidths[index + 1] = newRightWidth;

          var widthPercents = _.map(newWidths, function (t, i) {
            return 1.0 * t / resizing.totalWidth;
          });
          this.setState({visiblePercents: widthPercents});
          this.updateColumnWidth(newWidths);
        }
      },
      onResizerMouseUp: function (e) {
        if (this.resizing.active()) {
          this.leaveResizing();
        }
      },
      onEventClickDocument: function (e) {
        if (ReactDOM.findDOMNode(this).contains(e.target)) {// Inside of the component.
        } else {
          if (this.resizing) {
            this.resizing = false;
          }
        }
      },
      _calcBodyHeaderRowHtml: function () {
        var $node = $(ReactDOM.findDOMNode(this)).clone();
        $node.find('th').empty();
        return $node.html();
      },
      updateColumnWidth: function (widths, totalWidth) {
        var newWidths = widths;
        if (!!totalWidth) {
          newWidths = _.map(widths, function (t) {
            return totalWidth * t;
          });
        }
        _.each(this.props.header.filterHolders(), function (fh, i) {
          var $fh = $(ReactDOM.findDOMNode(fh));
          $fh.outerWidth(newWidths[i]);
        });
        var grid = this.props.header.props.grid;
        var body = grid.refs.body;
        var inBodyHeader = body.refs.inbodyHeader;
        if (inBodyHeader) {
          inBodyHeader.cloneHeaderColumns();
        }
      }
    });

    var version_init = -1;
    var Header = React.createClass({
      getDefaultProps: function () {
        return {
          info: undefined,
          gridNamespace: ''
        };
      },
      getInitialState: function () {
        return {
          cparameter: "",
          sorter: '',
          version: version_init
        };
      },
      componentDidMount: function () {
      },
      componentWillUnmount: function () {
      },
      shouldComponentUpdate: function (nextProps, nextState, nextContext) {
        var ps = this.state;
        var ns = nextState;
        if(ps.version == version_init){
          return true;
        }
        var oldState = _.extend({}, ps, {version: 0});
        var newState = _.extend({}, ns, {version: 0});
        if (!_.isEqual(nextProps, this.props) || !_.isEqual(newState, oldState) || !_.isEqual(nextContext, this.context)) {
          return true;
        }
        return false;
      },
      componentDidUpdate: function (prevProps, prevState) {
        var ps = prevState;
        var ns = this.state;

        if ((ps.cparameter != ns.cparameter) || (ps.version == version_init)) {
          var cparam = this.state.cparameter;
          var version = this.state.version;
          var paramObj = UrlUtil.ParamsUtils.stringToData(cparam);
          _.each(this.filterHolders(), function (fh) {
            var fi = fh.props.fieldinfo;
            var filter = fh.refs.filter;
            var fhPartialState = {};
            var stateUpdated = false;
            if (fi.supportFilter) {
              var filterKey = fh.state.filterKey;
              var filterVal = paramObj[filterKey];
              filter.setParamByValueArray(filterVal);
              filterVal = filter.getParam();
              stateUpdated = true;
              fhPartialState.filterVal = filterVal;
            }
            if (fi.supportSort) {
              var sorterKey = fh.state.sorterKey;
              var sorterVal = paramObj[sorterKey];
              if (_.isArray(sorterVal) && sorterVal.length == 1) {
                sorterVal = sorterVal[0];
              } else {
                sorterVal = Orders.DEFAULT;
              }
              stateUpdated = true;
              fhPartialState.sorterVal = sorterVal;
            }
            if (stateUpdated) {
              fhPartialState.version = version;
              fh.setState(fhPartialState);
            }
          });
        }
      },
      render: function () {
        var _header = this;
        var gridinfo = this.props.info;
        var grid = this.props.grid;
        var fhs = _.map(gridinfo ? gridinfo.fields : [], function (fi, idx) {
          var fieldName = fi.name;
          var FilterType = Filters.getComponentType(fi.fieldType);

          var fh = (<FilterHolder grid={grid} header={_header}
                                  ref={FilterHolder.RefPrefix + fieldName}
                                  onResizerMouseDown={_header.onEventResizerMouseDown}
                                  index={idx}
                                  key={fieldName}
                                  fieldinfo={fi}
                                  filterType={FilterType}></FilterHolder>);
          return fh;
        });
        return (
          <div className="header">
            <table className="table header-table table-condensed table-hover">
              <thead>
              <FilterGroup ref="filterGroup" header={_header}>
                {fhs}
              </FilterGroup>
              </thead>
            </table>
          </div>);
      },
      filterHolders: function () {
        return basic.propertiesWithKeyPrefix(this.refs, FilterHolder.RefPrefix);
      },
      updateFilterHolderFilterVal : function(filterKey, filterVal){
        var fhs = this.filterHolders();
        _.each(fhs, function (fh) {
          if (fh.state.filterKey === filterKey) {
            fh.setState({filterVal: filterVal});
          }
        });
      },
      unsetSorterExcept: function (filterHolder) {
        var fhs = this.filterHolders();
        _.each(fhs, function (fh) {
          if (fh !== filterHolder) {
            fh.setState({sorterVal: ''});
          }
        });
      },
      calcBodyHeaderRowHtml: function () {
        var filterGroup = this.refs.filterGroup;
        return filterGroup._calcBodyHeaderRowHtml();
      },
      onEventResizerMouseDown: function (filterHolder, x) {
        var filterGroup = this.refs.filterGroup;
        filterGroup.enterResizing(filterHolder.props.index, x);
      }
    });

    exports.Header = Header;
    exports.Orders = Orders;
  }
);
