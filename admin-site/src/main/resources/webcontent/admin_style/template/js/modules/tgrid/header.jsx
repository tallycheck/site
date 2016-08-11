define(["jquery",
    "underscore",
    'jsx!./filters',
    "i18n!nls/entityText",
    'url-utility',
    "jquery-ui"],
  function ($, _,
            TFilters, entityText, UrlUtil,
            jui) {
    var React = require('react');
    var ReactDOM = require('react-dom');

    var Orders = TFilters.Orders;
    var Filters = TFilters.Filters;

    var FilterHolder = React.createClass({
      statics : {
        getFilterName :function(fh){
          var fi = fh.props.fieldinfo;
          return fi.name;
        },
        getFilterKey:function(fh){
          var fi = fh.props.fieldinfo;
          return fi.name;
        },
        getSorterKey:function(fh){
          var fi = fh.props.fieldinfo;
          return "sort_"+fi.name;
        },
        getFilterGroup :function(fh){
          var header = fh.props.header;
          return header.refs.colsGroup;
        }
      },
      getInitialState :function() {
        var filterKey = FilterHolder.getFilterKey(this);
        var sorterKey = FilterHolder.getSorterKey(this);
        return {
          filterShown: false,
          filterKey: filterKey,
          filterVal: "",
          sorterKey: sorterKey,
          sorterVal: Orders.DEFAULT,
          version: 0  //the rendering version
        };
      },
      componentDidMount: function() {
        $(document).on('click', this, this.onEventClickDocument);
        var fire = this.refs.filter.refs.fire;
        if(fire){
          $(fire).on("click", this, this.onEventClickFilterButton);
        }
      },
      componentWillUnmount: function() {
        $(document).off('click', this.onEventClickDocument);
        var fire = this.refs.filter.refs.fire;
        if(fire){
          $(fire).off("click", this.onEventClickFilterButton);
        }
      },
      changeString : function(ps, ns) {
        var oldFVal = ps.filterVal;
        var newFVal = ns.filterVal;
        var oldSVal = ps.sorterVal;
        var newSVal = ns.sorterVal;
        var cs = " [" + oldFVal + " -> " + newFVal + ", " + oldSVal + " -> " + newSVal + "]";
        return "" + FilterHolder.getFilterName(this) + cs;
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
      componentWillUpdate:function(nextProps, nextState, nextContext, transaction){
        var ps = this.state;
        var ns = nextState;

        console.log("holder will update: " + this.changeString(ps, ns));
      },
      componentDidUpdate:function(prevProps, prevState){
        if(prevState.filterShown && !(this.state.filterShown)){
          //close
          var filter = this.refs.filter;
          var param = filter.getParam();
          this.setState({filterVal : param});
        }
        var ps = prevState;
        var ns = this.state;
        console.log("holder did update: " + this.changeString(ps, ns));
        var requireUpdate = (prevState.filterVal != this.state.filterVal ||
          prevState.sorterVal != this.state.sorterVal);
        if(requireUpdate){
          var grid = this.props.grid;
          grid.requestDoFilterByFilters(this);
        }
      },
      onEventClickDocument: function(e) {
        if (ReactDOM.findDOMNode(this).contains(e.target)) {// Inside of the component.
        } else {
          if(this.state.filterShown) {
            this.setState({filterShown: false, version:0});
          }
        }
      },
      onEventClickFilterButton : function(){
        if(this.state.filterShown){
          this.setState({filterShown : false, version:0});
        }
      },
      onEventClickFilterIcon :function (){
        this.setState({filterShown : !this.state.filterShown});
      },
      onEventClickSortIcon :function (){
        var nextSortVal = Orders.calcNextOrder(this.state.sorterVal);
        var header = this.props.grid.refs.header;
        header.unsetSorterExcept(this.props.refName);
        this.setState({sorterVal : nextSortVal, version:0});
      },
      bindResizeEvent:function(bind){
        var resizer = this.refs.resizer;
        var filterGroup = FilterHolder.getFilterGroup(this);
        if(bind) {
          $(resizer).on('mousedown', this, filterGroup.onResizerMouseDown);
        }else{
          $(resizer).off('mousedown', filterGroup.onResizerMouseDown);
        }
      },
      render  :function(){
        var fi = this.props.fieldinfo;
        var grid = this.props.grid;
        var gns = grid.props.namespace;
        var FilterType = this.props.filterType;

        var sortIcon = "";
        if(fi.supportSort){
          var sortActive = Orders.active(this.state.sorterVal);
          var sortActiveCn = sortActive? "sort-active" : "";
          var sortFa = Orders.fa(this.state.sorterVal);
          sortIcon = <i ref="sortIcon"
                        onClick={this.onEventClickSortIcon}
                        className={"sort-icon fa fa-sort " + sortFa}></i>;
        }
        var filterIcon = '';
        if(fi.supportFilter){
          var filterActiveCn = (!!this.state.filterVal)? "filter-active" : "";
          filterIcon = <i ref="filterIcon"
                          onClick={this.onEventClickFilterIcon}
                          className="filter-icon fa fa-filter"></i>;
        }

        var visStyle = fi.gridVisible ? {} : {display:'none'};

        return (<th ref="holder" className="column explicit-size" scope="col" style={visStyle}>
          <div href="#" className="column-header dropdown" data-column-key="name">
            <div className="title">
              <span className="col-name">{fi.friendlyName}</span>
              <div className={"filter-sort-container " + sortActiveCn + " " + filterActiveCn}>
                {sortIcon}
                {filterIcon}
                <ul ref="filterBox" style={{"display":this.state.filterShown ? "block" : "none"}} className="entity-filter no-hover">
                  <FilterType ref="filter" fieldinfo={fi}  gridNamespace={gns}/>
                </ul>
              </div>
            </div>
            <div ref="resizer" className="resizer">||</div>
          </div>
        </th>);
      }
    });

    var FilterGroup = React.createClass({
      resizing : {
        columnIndex:-1, // if < 0, inactive; if >= 0, active
        startX:undefined,
        startWidths:undefined,
        totalWidth:0,
        active : function(){
          return this.columnIndex >= 0;
        }
      },
      calcStartingWidths : function(){
        var widths = [];
        _.each(this.props.header.getAllFilterHolder(), function(fh){
          var $fh = $(ReactDOM.findDOMNode(fh));
          var width = $fh.outerWidth();
          widths.push(width);
        });
        return widths;
      },
      enterResizing : function(columnIndex, startX){
        var resizing = this.resizing;
        resizing.columnIndex = columnIndex;
        resizing.startX = startX;
        resizing.startWidths = this.calcStartingWidths();;
        resizing.totalWidth = 0;

        _.each(resizing.startWidths, function(w){
          resizing.totalWidth += w;
        });

        $(document).disableSelection();
      },
      leaveResizing : function(){
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
        var visibles = _.map(children, function(child){
          var fi = child.props.fieldinfo;
          var visi = (fi.gridVisible ? 1 : 0);
          visibleTotal += visi;
          return visi;
        });
        if(visibleTotal == 0)visibleTotal=1;
        var visPer = _.map(visibles, function(t,i){
          return 1.0*t/visibleTotal;
        });

        return {visibles : visibles, visiblePercents : visPer};
      },
      componentDidMount: function() {
        $(document).on('mousemove', this, this.onResizerMouseMove);
        $(document).on('mouseup', this, this.onResizerMouseUp);
      },
      componentWillUnmount: function() {
        $(document).off('mousemove', this, this.onResizerMouseMove);
        $(document).off('mouseup', this, this.onResizerMouseUp);
      },
      render : function(){
        return (<tr>{this.props.children}</tr>);
      },
      onResizerMouseDown : function(e){
        var filterHolder = e.data;
        var index = filterHolder.props.index;

        this.enterResizing(index, e.pageX);

        console.log('resizer mouse down ' + index);
      },
      onResizerMouseMove : function(e){
        if(this.resizing.active()){
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

          var widthPercents = _.map(newWidths, function(t,i){
            return 1.0*t/resizing.totalWidth;
          });
          this.setState({visiblePercents : widthPercents});
          this.updateColumnWidth(newWidths);
        }
      },
      onResizerMouseUp : function(e){
        if(this.resizing.active()){
          this.leaveResizing();
        }
      },
      onEventClickDocument: function(e) {
        if (ReactDOM.findDOMNode(this).contains(e.target)) {// Inside of the component.
        } else {
          if (this.resizing) {
            this.resizing = false;
          }
        }
      },
      _calcBodyHeaderRowHtml : function(){
        var $node = $(ReactDOM.findDOMNode(this)).clone();
        $node.find('th').empty();
        return $node.html();
      },
      updateColumnWidth:function(widths, totalWidth){
        var newWidths = widths;
        if(!!totalWidth){
          newWidths = _.map(widths, function(t){return totalWidth*t;});
        }
        _.each(this.props.header.getAllFilterHolder(), function(fh, i) {
          var $fh = $(ReactDOM.findDOMNode(fh));
          $fh.outerWidth(newWidths[i]);
        });
        var grid = this.props.header.props.grid;
        var body = grid.refs.body;
        var inBodyHeader = body.refs.inbodyHeader;
        if(inBodyHeader){
          inBodyHeader.cloneHeaderColumns();
        }
      }
    });

    var Header = React.createClass({
      getDefaultProps : function(){
        return {
          info : undefined,
          gridNamespace : ''
        };
      },
      getInitialState: function () {
        return {
          cparameter:"",
          sorter : '',
          version : 0
        };
      },
      componentDidMount: function() {
        var fhs = this.getAllFilterHolder();
        _.each(fhs, function(fh){
          fh.bindResizeEvent(true);
        });
      },
      componentWillUnmount: function() {
        var fhs = this.getAllFilterHolder();
        _.each(fhs, function(fh){
          fh.bindResizeEvent(false);
        });
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
      componentDidUpdate:function(prevProps, prevState){
        if((prevState.cparameter) != (this.state.cparameter)){
          var cparam = this.state.cparameter;
          var version = this.state.version;
          var paramObj = UrlUtil.ParamsUtils.stringToData(cparam);
          var fhs = this.getAllFilterHolder();
          _.each(fhs, function(fh){
            var fi = fh.props.fieldinfo;
            var filter = fh.refs.filter;
            var fhPartialState = {};
            var stateUpdated = false;
            if(fi.supportFilter){
              var filterKey = fh.state.filterKey;
              var filterVal = paramObj[filterKey];
              filter.setParamByValueArray(filterVal);
              filterVal = filter.getParam();
              stateUpdated = true;
              fhPartialState.filterVal = filterVal;
            }
            if(fi.supportSort){
              var sorterKey = fh.state.sorterKey;
              var sorterVal = paramObj[sorterKey];
              if(_.isArray(sorterVal) && sorterVal.length == 1){
                sorterVal = sorterVal[0];
              }else{
                sorterVal = Orders.DEFAULT;
              }
              stateUpdated = true;
              fhPartialState.sorterVal = sorterVal;
            }
            if(stateUpdated){
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
        var colsNames =[];
        var fhs = _.map(gridinfo ? gridinfo.fields : [], function (fi, idx) {
          var fieldName = fi.name;
          var FilterType = Filters.getComponentType(fi.fieldType);
          var refName = grid.props.namespace + fieldName;
          colsNames.push(refName);

          var fh = (<FilterHolder ref={refName} index={idx} refName={refName} key={fieldName} fieldinfo={fi}
                                filterType={FilterType} grid={grid} header={_header}></FilterHolder>);
          return fh;
        });
        this.ColumnsNames = colsNames;
        return (
          <div className="header">
            <table className="table header-table table-condensed table-hover">
              <thead>
              <FilterGroup ref="colsGroup" header = {_header}>
                {fhs}
              </FilterGroup>
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
      },
      unsetSorterExcept : function(refName){
        var fhs = this.getAllFilterHolder();
        _.each(fhs, function(fh){
          var rn = fh.props.refName;
          if(refName != rn){
            fh.setState({sorterVal:''});
          }
        });
      },
      calcBodyHeaderRowHtml : function(){
        var headerGrp = this.refs.colsGroup;
        return headerGrp._calcBodyHeaderRowHtml();
      }
    });

    return {
      Header : Header,
      Orders : Orders
    };
  }
);
