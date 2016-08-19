'use strict';

define(
  function(require, exports, module){
    var $ = require('jquery');
    var _ = require('underscore');
    var basic = require('basic');
    var Debugger = require('debugger');
    var TFilters = require('jsx!./filters');
    var EntityMsg = require('i18n!../nls/entity');
    var EntityInfo = require('entity-info');

    var React = require('react');
    var ReactDOM = require('react-dom');

    var ENABLE_STATE_UPDATE_LOG = false;

    var Orders = TFilters.Orders;

    var version_init = -1;
    var version_do_load = -2;
    class FilterHolder extends React.Component{
      static getFilterName (fh){
      var fi = fh.props.fieldinfo;
      return fi.name;
    }
      static getFilterKey(fh){
      var fi = fh.props.fieldinfo;
      return EntityInfo.filterKey(fi);
    }
      static getSorterKey(fh){
      var fi = fh.props.fieldinfo;
      return EntityInfo.sorterKey(fi);
    }

      constructor(props) {
        super(props);
        var filterKey = FilterHolder.getFilterKey(this);
        var sorterKey = FilterHolder.getSorterKey(this);
        this.state = {
          filterShown: false,
          filterKey: filterKey,
          filterVal: "",
          sorterKey: sorterKey,
          sorterVal: Orders.DEFAULT,
          version: version_init,  //the rendering version
        };
        this.dirty = false;
        this.onEventClickDocument =this.onEventClickDocument.bind(this);
      }
      leadingAhead (version){
        if(version != this.state.version)
          return true;
        return this.dirty;
      }
      componentDidMount() {
        $(document).on('click', this, this.onEventClickDocument);
        var fire = this.refs.filter.refs.fire;
        $(fire).on("click", this, this.onEventClickFilterButton);
        $(this.refs.resizer).on("mousedown", this, this.onEventResizerMouseDown);
      }
      componentWillUnmount() {
        $(document).off('click', this.onEventClickDocument);
        var fire = this.refs.filter.refs.fire;
        $(fire).off("click", this.onEventClickFilterButton);
        $(this.refs.resizer).off("mousedown", this.onEventResizerMouseDown);
      }
      changeString (ps, ns) {
        var oldFVal = ps.filterVal;
        var newFVal = ns.filterVal;
        var oldSVal = ps.sorterVal;
        var newSVal = ns.sorterVal;
        var cs = " [" + oldFVal + " -> " + newFVal + ", " + oldSVal + " -> " + newSVal + "] " +
          "v: " + ps.version + "->" + ns.version + (this.dirty ? ", dirty" : "")+
          " show: " + ns.filterShown;
        return "" + FilterHolder.getFilterName(this) + cs;
      }
      shouldComponentUpdate(nextProps, nextState, nextContext){
        var ps = this.state;
        var ns = nextState;
        if(ps.version == version_init){
          return true;
        }
        if(ps.version != ns.version)
          this.dirty = false;
        var oldState = _.extend({}, ps, {version:0});
        var newState = _.extend({}, ns, {version:0});
        return (!_.isEqual(nextProps, this.props) ||
          !_.isEqual(newState, oldState) ||
          !_.isEqual(nextContext, this.context));
      }
      componentWillUpdate(nextProps, nextState, nextContext, transaction){
        var ps = this.state;
        var ns = nextState;

        Debugger.log(ENABLE_STATE_UPDATE_LOG, "holder will update: " + this.changeString(ps, ns));
      }
      componentDidUpdate(prevProps, prevState){
        var grid = this.props.grid;
        var ps = prevState;
        var ns = this.state;
        if(ps.filterShown && !(ns.filterShown)) {
          //close
          var filter = this.refs.filter;
          var pParam = ps.filterVal;
          var param = filter.getParam();
          if (pParam != param) {
            this.setState({filterVal: param, version: version_do_load});
          }
        }
        if(ps.version == version_init){
          return;
        }
        Debugger.log(ENABLE_STATE_UPDATE_LOG, "holder did update: " + this.changeString(ps, ns));
        var requireUpdate = (ps.filterVal != ns.filterVal || ps.sorterVal != ns.sorterVal);
        if(requireUpdate || this.dirty || ps.version == version_do_load){
          this.dirty = true;
          Debugger.log(ENABLE_STATE_UPDATE_LOG, "Fire do filter: " + this.changeString(ps, ns));
          grid.requestDoFilterByFilters(this);
        }
      }
      setState(){
        var grid = this.props.grid;
        if(!grid.busy()){
          super.setState.apply(this, arguments);
        }
      }
      onEventClickDocument(e) {
        if (ReactDOM.findDOMNode(this).contains(e.target)) {// Inside of the component.
        } else {
          if(this.state.filterShown) {
            // 1. close filter, trigger reload if param updated.
            this.setState({filterShown: false});
          }
        }
      }
      onEventClickFilterButton (){
        if(this.state.filterShown){
          // 1. close filter,
          // 2. trigger reload anyway.
          this.setState({filterShown : false, version:version_do_load});
        }else{
          var grid = this.props.grid;
          grid.requestDoFilterByFilters(this);
        }
      }
      onEventClickFilterIcon  (){
        // 1. toggle filter, trigger reload if param updated.
        this.setState({filterShown : !this.state.filterShown});
      }
      onEventClickSortIcon  (){
        var nextSortVal = Orders.calcNextOrder(this.state.sorterVal);
        var header = this.props.grid.refs.header;
        header.unsetSorterExcept(this);
        // 1. trigger reload if param updated.
        this.setState({sorterVal : nextSortVal});
      }
      onEventResizerMouseDown (event){
        this.props.onResizerMouseDown(this, event.pageX);
      }
      onKeyPress (event){
        if (event.charCode == 13) {
          this.onEventClickFilterButton();
        }
      }
      render  (){
        var fi = this.props.fieldinfo;
        var grid = this.props.grid;
        var gns = grid.state.namespace;
        var FilterType = this.props.filterType;

        var sortIcon = "";
        if(fi.supportSort){
          var sortActive = Orders.active(this.state.sorterVal);
          var sortActiveCn = sortActive? "sort-active" : "";
          var sortFa = Orders.fa(this.state.sorterVal);
          sortIcon = <i ref="sortIcon"
                        onClick={this.onEventClickSortIcon.bind(this)}
                        className={"sort-icon fa fa-sort " + sortFa}></i>;
        }
        var filterIcon = '';
        if(fi.supportFilter){
          var filterActiveCn = (!!this.state.filterVal)? "filter-active" : "";
          filterIcon = <i ref="filterIcon"
                          onClick={this.onEventClickFilterIcon.bind(this)}
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
                <ul ref="filterBox" onKeyPress={this.onKeyPress.bind(this)} style={{"display":this.state.filterShown ? "block" : "none"}} className="entity-filter no-hover">
                  <FilterType ref="filter" fieldinfo={fi}  gridNamespace={gns}/>
                </ul>
              </div>
            </div>
            <div ref="resizer" className="resizer">||</div>
          </div>
        </th>);
      }
    };
    FilterHolder.RefPrefix = "filterholder.";

    exports.FilterHolder = FilterHolder;
  }
);
