define(["jquery", "underscore",
    "i18n!nls/entitytext",
    'url-utility'],
  function ($, _, entitytext, UrlUtil) {
    var React = require('react');
    var ReactDOM = require('react-dom');

    var Utility = (function(){
      var InputDelete = function(input, del){
        this.input = input;
        this.del = del;
      }
      InputDelete.prototype={
        handleInputChanged : function(e){
          var _this = e.data;
          var val = _this.input.value;
          var $del = $(_this.del);
          (!!val) ? $del.show() : $del.hide();
        },
        handleDelClick: function (e) {
          var _this = e.data;
          _this.input.value="";
          $(_this.del).hide();
          _this.input.focus();
        },
        bindEvent :function(){
          $(this.input).on('keyup change focusin', this, this.handleInputChanged);
          $(this.del).on('click', this, this.handleDelClick);
        },
        unbindEvent :function(){
          $(this.input).off('keyup change focusin', this.handleInputChanged);
          $(this.del).off('click', this.handleDelClick);
        }
      }

      var ResetButton = function(btn, filter){
        this.btn = btn;
        this.filter =filter;
      }
      ResetButton.prototype={
        handleResetButton:function(e){
          var _this = e.data;
          _this.filter.setParam('');
        },
        bindEvent:function(){
          $(this.btn).on('click', this, this.handleResetButton);
        },
        unbindEvent:function(){
          $(this.btn).off('click', this.handleResetButton);
        }
      }

      return {
        InputDelete : InputDelete,
        ResetButton : ResetButton
      }
    })();
    var Orders = {
      DEFAULT: '', ASC: 'asc', DESC: 'desc',
      calcNextOrder: function (order) {
        switch (order) {
          case this.DEFAULT:return this.ASC;
          case this.ASC:return this.DESC;
          case this.DESC:return this.DEFAULT;
          default :return this.DEFAULT;
        }
      },
      active : function(order){
        switch (order){
          case this.ASC:
          case this.DESC:
            return true;
          default :
            return false;
        }
      },
      fa : function(order){
        switch (order){
          case this.ASC:
            return 'fa-sort-amount-asc';
          case this.DESC:
            return 'fa-sort-amount-desc';
          default :
            return '';
        }
      }
    };

    var FilterHolder = React.createClass({
      statics : {
        makeFilter: function (fieldinfo, gridinfo, grid) {
          var fi = fieldinfo;
          var fieldName = fi.name;
          var filterType = Filters.getComponentType(fi.fieldType);

          var refName = grid.props.namespace + fieldName;

          return (<FilterHolder ref={refName} refName={refName} key={fieldName} fieldinfo={fieldinfo}
                                filterType={filterType} grid={grid}>
          </FilterHolder>);
        }
      },
      getInitialState :function() {
        var filterKey = this.getFilterKey();
        var sorterKey = this.getSorterKey();
        return {
          isOpen: false,
          filterVal:"",
          sorterVal:Orders.DEFAULT,
          filterKey:filterKey,
          sorterKey:sorterKey
        };
      },
      clickDocument: function(e) {
        if (ReactDOM.findDOMNode(this).contains(e.target)) {// Inside of the component.
        } else {
          if(this.state.isOpen)
            this.setState({isOpen : false});
        }
      },
      fireFilter : function(){
        if(this.state.isOpen)
          this.setState({isOpen : false});
        var grid = this.props.grid;
        grid.doLoadByUi();
      },
      componentDidMount: function() {
        $(document).bind('click', this.clickDocument);
        var fire = this.refs.filter.refs.fire;
        if(fire){
          $(fire).on("click", this, this.fireFilter);
        }
      },
      componentWillUnmount: function() {
        $(document).unbind('click', this.clickDocument);
        var fire = this.refs.filter.refs.fire;
        if(fire){
          $(fire).off("click", this.fireFilter);
        }
      },
      componentDidUpdate:function(prevProps, prevState){
        if(prevState.isOpen && !(this.state.isOpen)){
          //close
          var filter = this.refs.filter;
          var param = filter.getParam();
          this.setState({filterVal : param}, this.fireFilter);
        }
      },
      handleFilterIconClick :function (){
        this.setState({isOpen : !this.state.isOpen});
      },
      handleSortIconClick :function (){
        var nextSortVal = Orders.calcNextOrder(this.state.sorterVal);
        var header = this.props.grid.refs.header;
        header.unsetSorterExcept(this.props.refName);
        this.setState({sorterVal : nextSortVal}, this.fireFilter);
      },
      getFilterKey:function(){
        var fi = this.props.fieldinfo;
        return fi.name;
      },
      getSorterKey:function(){
        var fi = this.props.fieldinfo;
        return "sort_"+fi.name;
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
                onClick={this.handleSortIconClick}
                className={"sort-icon fa fa-sort " + sortFa}></i>;
        }
        var filterIcon = '';
        if(fi.supportFilter){
          var filterActiveCn = (!!this.state.filterVal)? "filter-active" : "";
          filterIcon = <i ref="filterIcon"
                          onClick={this.handleFilterIconClick}
                          className="filter-icon fa fa-filter"></i>;
        }

        return (<th ref="holder" className="column explicit-size" scope="col">
          <div href="#" className="column-header dropdown" data-column-key="name">
            <div className="title">
              <span className="col-name">{fi.friendlyName}</span>
              <div className={"filter-sort-container " + sortActiveCn + " " + filterActiveCn}>
                {sortIcon}
                {filterIcon}
                <ul ref="filterBox" style={{"display":this.state.isOpen ? "block" : "none"}} className="entity-filter no-hover">
                  <FilterType ref="filter" fieldinfo={fi}  gridnamespace={gns}/>
                </ul>
              </div>
            </div>
            <div className="resizer">||</div>
          </div>
        </th>);
      }
    });

    var FilterGroup = React.createClass({
      getInitialState: function () {
        return {};
      },
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
      getInitialState: function () {
        return {
          cparameter:"",
          sorter : ''};
      },
      componentDidUpdate:function(prevProps, prevState){
        if((prevState.cparameter) != (this.state.cparameter)){
          var cparam = this.state.cparameter;
          var paramObj = UrlUtil.ParamsUtils.stringToData(cparam);
          var fhs = this.getAllFilterHolder();
          _.each(fhs, function(fh){
            var fi = fh.props.fieldinfo;
            var filter = fh.refs.filter;
            if(fi.supportFilter){
              var filterKey = fh.state.filterKey;
              var filterVal = paramObj[filterKey];
              filter.setParamByValueArray(filterVal);
              filterVal = filter.getParam();
              fh.setState({filterVal :filterVal});
            }
            if(fi.supportSort){
              var sorterKey = fh.state.sorterKey;
              var sorterVal = paramObj[sorterKey];
              if(_.isArray(sorterVal) && sorterVal.length == 1){
                sorterVal = sorterVal[0];
              }else{
                sorterVal = Orders.DEFAULT;
              }

              fh.setState({sorterVal :sorterVal});
            }
          });
//          this.onCriteriaParameterUpdate(prevState.cparameter, this.state.cparameter);
        }
      },
      render: function () {
        var gridinfo = this.props.info;
        var grid = this.props.grid;
        var colsNames =[];
        var cols = _.map(gridinfo.fields, function (fi) {
          var col = FilterHolder.makeFilter(fi, gridinfo, grid);
          colsNames.push(col.ref);
          return col;
        });
        this.ColumnsNames = colsNames;
        return (
          <div className="header">
            <table className="table header-table table-condensed table-hover">
              <thead>
              <FilterGroup ref="colsGroup">
                {cols}
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
      }
    });

    var Filters = (function(){
      class BaseFilter extends React.Component {
        constructor(){
          super();
          this.multiValue = false;
        }
        setParamByValueArray(val) {
          var finalVal = '';
          val = val || [];
          if (_.isArray(val)) {
            var multi = this.multiValue;
            if(multi){
              finalVal = JSON.stringify(val);
            }else {
              switch (val.length) {
                case 0:
                  finalVal = '';
                  break;
                case 1:
                  finalVal = val[0];
                  break;
                default :
                  throw new Error("Unexpected array")
              }
            }
          } else if (_.isString(val)) {
            finalVal = val;
          } else{
            throw new Error("Unexpected type")
          }
          return this.setParam(finalVal);
        }
        setParam (val){}
        getParam (){}
        resetParam (){this.setParam('');}
      }

      class StringFilter extends BaseFilter {
        setParam (val){
          this.refs.input.value = val;
        }
        getParam (){
          return this.refs.input.value;
        }
        componentDidMount() {
          var inputDel = new Utility.InputDelete(this.refs.input, this.refs.delIcon);
          inputDel.bindEvent();
        }
        componentWillUnmount() {
          var inputDel = new Utility.InputDelete(this.refs.input, this.refs.delIcon);
          inputDel.unbindEvent();
        }
        render(){
          var fi = this.props.fieldinfo;
          return (<li>
            <div className="filter-fields" data-action="">
              <div className="text-filter-control">
                <button ref='fire' className="filter-button btn btn-info">
                  <i className="fa fa-filter"></i>
                </button><span className="input-line">
                <span className="input-element">
                  <i className="fa fa-search embed-hint"></i>
                  <input ref="input" className="filter-input" data-name="resource" placeholder={fi.friendlyName} type="text"/>
                    <i ref="delIcon" className="fa fa-times-circle  embed-delete" style={{'display': 'none'}}></i>
                  </span></span>
              </div>
            </div>
          </li>);
        }
      }
      class EnumFilter extends BaseFilter {
        constructor(){
          super();
          this.multiValue = true;
        }
        setParam (val){
          var selectedVals = [];
          if(val){
            selectedVals = JSON.parse(val);
          }
          var optionsGroup = this.refs.optionsGroup;
          var $options = $('.option input[type=checkbox]', optionsGroup);
          $options.each(function(index, item){
            var $item = $(item);
            var val = $item.attr('value');
            item.checked = !!(selectedVals.indexOf(val) >= 0);
          })
        }
        getParam (){
          var optionsGroup = this.refs.optionsGroup;
          var $options = $('.option input[type=checkbox]', optionsGroup);
          var checkedVals = [];
          $options.filter(function(index, item){return item.checked;})
            .each(function(index, item){checkedVals.push($(item).attr('value'));});
          if(checkedVals.length == 0)
            return '';
          return JSON.stringify(checkedVals);
        }
        componentDidMount() {
          var resetBtn = new Utility.ResetButton(this.refs.reset, this);
          resetBtn.bindEvent();
        }
        componentWillUnmount() {
          var resetBtn = new Utility.ResetButton(this.refs.reset, this);
          resetBtn.unbindEvent();
        }
        render (){
          var fi = this.props.fieldinfo;
          var gns = this.props.gridnamespace;
          var ops = _.map(fi.options, function(op, i){
            var opF = fi.optionsFriendly[op];
            return (<label key={op} className="option">
              <input type="checkbox" name={gns + fi.name} value={op}/><span>{opF}</span>
            </label>);
          });
          return (<li className='option-filter enum-filter'>
            <div className="filter-fields" data-action="">
              <div className="option-filter-control">
                <div ref="optionsGroup" className="options">
                  {ops}
                </div>
                <hr/>
                <div className="bottom-control">
                  <a ref='reset' className="filter-reset-button" href="#">{entitytext.RESET}</a>
                  <button ref='fire' className="filter-button btn btn-info">
                    <i className="fa fa-filter"></i>
                  </button>
                </div>
              </div>
            </div>
          </li>);
        }
      }
      class BooleanFilter extends BaseFilter {
        constructor(){
          super();
          this.state = {
            checked: ''
          };
        }
        setParam (val){
          var $optionsGroup = $(this.refs.optionsGroup);

          var trueRadio = $optionsGroup.find('input[type=radio][value=true]');
          var falseRadio = $optionsGroup.find('input[type=radio][value=false]');
          if(val === undefined || val === null || '' == val){
            trueRadio[0].checked=false;
            falseRadio[0].checked=false;
          }else{
            val = (val == 'true');
            trueRadio[0].checked=val;
            falseRadio[0].checked=!val;
          }
        }
        getParam (){
          var optionsGroup = this.refs.optionsGroup;

          var valStr = $(optionsGroup).find('input[type=radio]:checked').val();
          if(!!valStr){
            return ('true' == valStr.toLowerCase())? 'true' : 'false';
          }else{
            return "";
          }
        }
        componentDidMount() {
          var resetBtn = new Utility.ResetButton(this.refs.reset, this);
          resetBtn.bindEvent();
        }
        componentWillUnmount() {
          var resetBtn = new Utility.ResetButton(this.refs.reset, this);
          resetBtn.unbindEvent();
        }
        render (){
          var fi = this.props.fieldinfo;
          var gns = this.props.gridnamespace;

          return (<li className='option-filter boolean-filter'>
            <div className="filter-fields" data-action="">
              <div className="option-filter-control">
                <div ref="optionsGroup" className="options">
                  <label className="option">
                    <input type="radio" name={gns + fi.name} value="true">
                    </input>
                      <span>{fi.options.t}</span>
                  </label>
                  <label className="option">
                    <input type="radio" name={gns + fi.name} value="false">
                    </input>
                      <span>{fi.options.f}</span>
                  </label>
                </div>
                <hr/>
                <div className="bottom-control">
                  <a ref='reset' className="filter-reset-button" href="#">{entitytext.RESET}</a>
                  <button ref='fire' className="filter-button btn btn-info">
                    <i className="fa fa-filter"></i>
                  </button>
                </div>
              </div>
            </div>
          </li>);
        }
      }
      return {
        'name' : StringFilter,
        'enumeration' : EnumFilter,
        'boolean' : BooleanFilter,
        'default' : StringFilter,
        getComponentType : function(fieldType){
          var FilterType = this[fieldType.toLowerCase()];
          if(FilterType == undefined)
            FilterType = this['default'];
          return FilterType;
        }
      }
    })();

    return {
      Header : Header,
      Orders : Orders
    };
  }
);
