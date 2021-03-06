'use strict';

define(
  function(require, exports, module) {
    var $ = require('jquery');
    var _ = require('underscore');
    var EntityMsg = require('i18n!../nls/entity');
    var UrlUtil = require('url-utility');

    var React = require('react');
    var ReactDOM = require('react-dom');

    var Utility = (function () {
      var InputDelete = function (input, del) {
        this.input = input;
        this.del = del;
      }
      InputDelete.prototype = {
        handleInputChanged: function (e) {
          var _this = e.data;
          var val = _this.input.value;
          var $del = $(_this.del);
          (!!val) ? $del.show() : $del.hide();
        },
        handleDelClick: function (e) {
          var _this = e.data;
          _this.input.value = "";
          $(_this.del).hide();
          _this.input.focus();
        },
        bindEvent: function () {
          $(this.input).on('keyup change focusin', this, this.handleInputChanged);
          $(this.del).on('click', this, this.handleDelClick);
        },
        unbindEvent: function () {
          $(this.input).off('keyup change focusin', this.handleInputChanged);
          $(this.del).off('click', this.handleDelClick);
        }
      }

      var ResetButton = function (btn, filter) {
        this.btn = btn;
        this.filter = filter;
      }
      ResetButton.prototype = {
        handleResetButton: function (e) {
          var _this = e.data;
          _this.filter.setParam('');
        },
        bindEvent: function () {
          $(this.btn).on('click', this, this.handleResetButton);
        },
        unbindEvent: function () {
          $(this.btn).off('click', this.handleResetButton);
        }
      }

      return {
        InputDelete: InputDelete,
        ResetButton: ResetButton
      }
    })();
    var Orders = {
      DEFAULT: '', ASC: 'asc', DESC: 'desc',
      calcNextOrder: function (order) {
        switch (order) {
          case this.DEFAULT:
            return this.ASC;
          case this.ASC:
            return this.DESC;
          case this.DESC:
            return this.DEFAULT;
          default :
            return this.DEFAULT;
        }
      },
      active: function (order) {
        switch (order) {
          case this.ASC:
          case this.DESC:
            return true;
          default :
            return false;
        }
      },
      fa: function (order) {
        switch (order) {
          case this.ASC:
            return 'fa-sort-amount-asc';
          case this.DESC:
            return 'fa-sort-amount-desc';
          default :
            return '';
        }
      }
    };

    var Filters = (function () {
      class BaseFilter extends React.Component {
        constructor() {
          super();
          this.multiValue = false;
        }

        setParamByValueArray(val) {
          var finalVal = '';
          val = val || [];
          if (_.isArray(val)) {
            var multi = this.multiValue;
            if (multi) {
              finalVal = JSON.stringify(val);
            } else {
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
          } else {
            throw new Error("Unexpected type")
          }
          return this.setParam(finalVal);
        }

        setParam(val) {
        }

        getParam() {
        }

        resetParam() {
          this.setParam('');
        }
      }

      class StringFilter extends BaseFilter {
        setParam(val) {
          this.refs.input.value = val;
        }

        getParam() {
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

        render() {
          var fi = this.props.fieldinfo;
          return (<li>
            <div className="filter-fields" data-action="">
              <div className="text-filter-control">
                <button ref='fire' className="filter-button btn btn-info">
                  <i className="fa fa-filter"></i>
                </button><span className="input-line">
                <span className="input-element">
                  <i className="fa fa-search embed-hint"></i>
                  <input ref="input" className="filter-input" data-name="resource" placeholder={fi.friendlyName}
                         type="text"/>
                    <i ref="delIcon" className="fa fa-times-circle  embed-delete" style={{'display': 'none'}}></i>
                  </span></span>
              </div>
            </div>
          </li>);
        }
      }
      class EnumFilter extends BaseFilter {
        constructor() {
          super();
          this.multiValue = true;
        }

        setParam(val) {
          var selectedVals = [];
          if (val) {
            selectedVals = JSON.parse(val);
          }
          var optionsGroup = this.refs.optionsGroup;
          var $options = $('.option input[type=checkbox]', optionsGroup);
          $options.each(function (index, item) {
            var $item = $(item);
            var val = $item.attr('value');
            item.checked = !!(selectedVals.indexOf(val) >= 0);
          })
        }

        getParam() {
          var optionsGroup = this.refs.optionsGroup;
          var $options = $('.option input[type=checkbox]', optionsGroup);
          var checkedVals = [];
          $options.filter(function (index, item) {
            return item.checked;
          })
            .each(function (index, item) {
              checkedVals.push($(item).attr('value'));
            });
          if (checkedVals.length == 0)
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

        render() {
          var fi = this.props.fieldinfo;
          var gns = this.props.gridNamespace;
          var ops = _.map(fi.options, function (op, i) {
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
                  <a ref='reset' className="filter-reset-button" href="#">{EntityMsg.RESET}</a>
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
        constructor() {
          super();
          this.state = _.extend({}, this.state, {
            checked: ''
          });
        }

        setParam(val) {
          var $optionsGroup = $(this.refs.optionsGroup);

          var trueRadio = $optionsGroup.find('input[type=radio][value=true]');
          var falseRadio = $optionsGroup.find('input[type=radio][value=false]');
          if (val === undefined || val === null || '' == val) {
            trueRadio[0].checked = false;
            falseRadio[0].checked = false;
          } else {
            val = (val == 'true');
            trueRadio[0].checked = val;
            falseRadio[0].checked = !val;
          }
        }

        getParam() {
          var optionsGroup = this.refs.optionsGroup;

          var valStr = $(optionsGroup).find('input[type=radio]:checked').val();
          if (!!valStr) {
            return ('true' == valStr.toLowerCase()) ? 'true' : 'false';
          } else {
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

        render() {
          var fi = this.props.fieldinfo;
          var gns = this.props.gridNamespace;

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
                  <a ref='reset' className="filter-reset-button" href="#">{EntityMsg.RESET}</a>
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
        'name': StringFilter,
        'enumeration': EnumFilter,
        'boolean': BooleanFilter,
        'default': StringFilter,
        getComponentType: function (fieldType) {
          var FilterType = this[fieldType.toLowerCase()];
          if (FilterType == undefined)
            FilterType = this['default'];
          return FilterType;
        }
      }
    })();

    exports.Filters = Filters;
    exports.Orders = Orders;
  }
);
