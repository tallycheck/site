'use strict';

define(
  function(require, exports, module) {
    var $ = require('jquery');
    var _ = require('underscore');
    var basic = require('basic');
    var dm = require('datamap');
    var modal = require('jsx!modules/modal');
    var CommonMsg = require('i18n!../nls/common');
    var EntityMsg = require('i18n!../nls/entity');
    var UriTemplate = require('UriTemplate');
    var jui = require('jquery-ui');
    var juitp = require('jquery-ui-timepicker');
    var summernote = require('summernote');
    var ModalStack = modal.ModalStack;

    var ModalHandlersPath = '../modal-handlers';
    var EntityModalSpecsPath = 'jsx!../entity-modal-specs';

    var React = require('react');
    var ReactDOM = require('react-dom');

    var FieldItems = (function () {
      class FieldItemBase extends React.Component {
        constructor(props) {
          super(props);
          this.state = _.extend({}, this.state, {
            readonly: !props.fieldinfo.editable,
            updatedValue: undefined
          });
        }

        fieldNameInForm() {
          var fns = this.props.formNamespace;
          var fieldName = this.props.fieldinfo.name;
          return fns + 'props[' + fieldName + ']';
        }

        render() {
          if (this.state.readonly) {
            return this.renderAsReadonly();
          }
          return this.doRender();
        }

        doRender() {
          return <div></div>;
        }

        renderAsReadonly() {
          var val = this.getValueInString();
          return <span>{val}</span>;
        }

        getInitValue() {
          return this.props.holder.props.initValue;
        }

        getUpdatedValue() {
          return this.state.updatedValue;
        }

        getValue() {
          var initValue = this.getInitValue();
          var updatedValue = this.getUpdatedValue();
          return updatedValue === undefined ? initValue : updatedValue;
        }

        getValueInString() {
          return "" + this.getValue();
        }

        updateValue(value) {
          if (value === this.getInitValue()) {
            value = undefined;
          }
          this.setState({updatedValue: value});
        }

        updated() {
          return this.state.updatedValue !== undefined;
        }
      }
      FieldItemBase.defaultProps = {
        formNamespace: "",
        entityContext: null,
        fieldinfo: null
      };

      class StringFieldItem extends FieldItemBase {
        constructor(props) {
          super(props);
        }

        doRender() {
          var fieldName = this.fieldNameInForm();
          var val = this.getValue();
          if (val === undefined || val === null) val = '';

          return (<input ref="input" type="text" className="form-control content" name={fieldName}
                         value={val}
                         onChange={(e) => this.onChangeValue(e)}/>);
        }

        onChangeValue(event) {
          var val = event.target.value;
          this.updateValue(val);
        }

        getValueInString() {
          return this.getValue();
        }
      }

      class EnumFieldItem extends FieldItemBase {
        doRender() {
          var fieldName = this.fieldNameInForm();
          var val = this.getValue();
          var fi = this.props.fieldinfo;
          var ops = _.map(fi.options, function (op, i) {
            var opF = fi.optionsFriendly[op];
            return (<option key={op} value={op}>{opF}</option>);
          });
          return (<select className="options form-control" name={fieldName} multiple={false}
                          value={val}
                          onChange={(e) => this.onChangeValue(e)}>
              {ops}
            </select>
          );
        }

        onChangeValue(event) {
          var val = event.target.value;
          this.updateValue(val);
        }

        getValueInString() {
          var val = this.getValue();
          var fi = this.props.fieldinfo;
          var valF = fi.optionsFriendly[val];
          return valF;
        }
      }

      class BoolFieldItem extends FieldItemBase {
        constructor(props) {
          super(props);
          this.onChangeValue = this.onChangeValue.bind(this);
        }

        doRender() {
          var fieldName = this.fieldNameInForm();
          var val = this.getValue();
          var fi = this.props.fieldinfo;
          var trOpts = fi.options;
          return (<div className="radio-options">
            <label className="option">
              <input type="radio" name={fieldName} value="true" checked={val === true}
                     onChange={this.onChangeValue}/>
              <span>{trOpts.t}</span>
            </label>
            <label className="option">
              <input type="radio" name={fieldName} value="false" checked={val === false}
                     onChange={this.onChangeValue}/>
              <span>{trOpts.f}</span>
            </label>
          </div>);
        }

        onChangeValue(event) {
          var val = event.target.value;
          switch (val) {
            case "true":
              val = true;
              break;
            case "false":
              val = false;
              break;
            default :
              throw new Error("Unexpected boolean value");
          }
          this.updateValue(val);
        }

        getValueInString() {
          var val = this.getValue();
          var fi = this.props.fieldinfo;
          var trOpts = fi.options;
          return val ? trOpts.t : trOpts.f;
        }
      }

      class DateFieldItem extends FieldItemBase {
        constructor(props) {
          super(props);
          this.onSelect = this.onSelect.bind(this);
          var fieldinfo = props.fieldinfo;
          var model = fieldinfo.model;
          var method = null;
          var exOpts = {
            dateFormat: CommonMsg.datepicker_format_date,
            onSelect: this.onSelect
          };
          switch (model) {
            case 'date':
              method = 'datepicker';
              break;
            case 'datetime':
              method = 'datetimepicker';
              _.extend(exOpts, {showSecond: true, timeFormat: CommonMsg.datepicker_format_time});
              break;
            case 'datetimez' :
              method = 'datetimepicker';
              _.extend(exOpts, {showSecond: true, timeFormat: CommonMsg.datepicker_format_timez});
              break;
            default:
              throw new Error("DateModel unexpected.");
          }
          var datepickerops = CommonMsg.datepicker_localization;
          _.extend(exOpts, datepickerops);

          this.state = _.extend({}, this.state, {
            method: method,
            options: exOpts
          });
        }

        componentDidMount() {
          var method = this.state.method;
          var options = this.state.options;

          var $dtpInput = $(ReactDOM.findDOMNode(this.refs.datetimeinput));
          $dtpInput[method](options);

          var val = this.getValue();
          if (!val) {
          } else {
            var date = new Date(val);
            $dtpInput[method]('setDate', date);
          }
        }

        doRender() {
          var fieldName = this.fieldNameInForm();
          var fieldinfo = this.props.fieldinfo;
          var readonly = !fieldinfo.editable;
          var model = fieldinfo.model;
          var method = this.state.method;
          var inputEle = null;
          if (method) {
            if (!readonly) {
              inputEle = (
                <input ref="datetimeinput" type="text" className="date-input form-control " name={fieldName}/>);
            }
          }

          return (<div className="date-input-group has-feedback">
            {inputEle}
            <span className="fa fa-calendar form-control-feedback" aria-hidden="true"></span>
          </div>);
        }

        renderAsReadonly() {
          var val = this.getValue();
          if (!val) {
            return <span/>;
          }
          var fieldinfo = this.props.fieldinfo;
          var model = fieldinfo.model;
          var method = this.state.method;
          var options = this.state.options;
          var hiddenInput = $('<input class="hidden-helper" style="">');
          hiddenInput[method](options);
          var date = new Date(val);
          hiddenInput[method]('setDate', date);
          var iv = hiddenInput.val();

          return (<span className="date-input"
                        data-time-model={model}
                        data-date-method={method}>{iv}</span>);
        }

        onSelect(datetimeText, datepickerInstance) {
          var method = this.state.method;
          var $dtpInput = $(ReactDOM.findDOMNode(this.refs.datetimeinput));
          var date = $dtpInput[method]('getDate');
          var datetime = date.getTime();
          this.updateValue(datetime);
        }
      }

      class HtmlFieldItem extends FieldItemBase {
        constructor(props) {
          super(props);
          this.onChangeCode = this.onChangeCode.bind(this);
        }

        componentDidMount() {
          var $editor = $(ReactDOM.findDOMNode(this.refs.htmlEditor));
          $editor.summernote({
            height: 150,
            minHeight: 150,             // set minimum height of editor
            maxHeight: 300             // set maximum height of editor
          });
          $editor.on("summernote.change", this.onChangeCode);
          var val = this.getValue();
          if (!val) {
            val = '';
          }
          $editor.code(val);
        }

        doRender() {
          var fieldName = this.fieldNameInForm();
          var val = this.getValue();
          var fi = this.props.fieldinfo;
          return (<div ref="htmlEditor" className="html-editor" name={fieldName}></div>);
        }

        onChangeCode(event) {
          var $editor = $(ReactDOM.findDOMNode(this.refs.htmlEditor));
          this.updateValue($editor.code());
        }
      }

      class ForeignKeyFieldItem extends FieldItemBase {
        constructor(props) {
          super(props);
          var fieldinfo = props.fieldinfo;
          this.state = _.extend({}, this.state, {});
        }

        doRender() {
          var holder = this.props.holder;
          var bean = holder.props.bean;
          var noneSpan = (<span className="display-value-none-selected"
                                style={{display: "inline"}}>{EntityMsg.FieldForeignKeyNotSelected}</span>);

          return (
            <div className="foreign-key-value-container" data-entity-type="" data-id-field="" data-display-field="">
              {noneSpan}
              <span className="display-value read-only" style={{display: "none"}}></span>
              <i className="fa fa-times-circle entity-btn drop-entity" style={{display: "none"}}></i>
              <button
                className="btn btn-default btn-sm entity-btn to-one-lookup tiny radius secondary button hover-cursor"
                type="button" data-select-url="">
                <i className="fa fa-search"></i>{EntityMsg.FieldForeignKeyLookup}
              </button>
            <span className="external-link-container" style={{display: "none"}}>
               <a className="entity-form-modal-view" data-foreign-key-link="" href="">
                 <i className="fa fa-external-link"></i>
               </a>
            </span>
            </div>);
        }
      }

      class ExternalForeignKeyFieldItem extends ForeignKeyFieldItem {
        constructor(props) {
          super(props);
          var fieldinfo = props.fieldinfo;
          var holder = props.holder;
          var bean = holder.props.bean;
          var externalBean = bean[fieldinfo.entityFieldName];
          this.state = _.extend({}, this.state, {
            initBean: externalBean,
            updatedBean: undefined
          });
        }

        getChosenBean() {
          var updatedBean = this.state.updatedBean;
          var initBean = this.state.initBean;
          if (this.getUpdatedValue() === undefined) {
            return initBean;
          }
          if (updatedBean === undefined) {
            return initBean;
          }
          return updatedBean;
        }

        onLinkClick(event) {
          event.preventDefault();

          var fieldinfo = this.props.fieldinfo;
          var cBean = this.getChosenBean();
          var template = new UriTemplate(fieldinfo.recordUri);
          var link = template.fill(cBean);
          var val = this.getValue();

          require([EntityModalSpecsPath, ModalHandlersPath], function (EMSpecs, ModalHandlersComp) {
            var ModalHandlers = ModalHandlersComp.ModalHandlers;
            var ms = ModalStack.getPageStack();
            ms.pushModalSpec(new EMSpecs.Read({url: link}));
          });
        }

        onLookupClick(event) {
          var _this = this;
          var fieldinfo = this.props.fieldinfo;
          var selectUri = fieldinfo.selectUri;

          var modalActionHandler = {
            onSelectDone: function (modal, tgrid) {
              var selectedBean = tgrid.selectedBean();
              _this.updateSelectedBean(selectedBean);
            },
            onRecordDoubleClick: function (modal, tgrid, bean) {
              if (bean) {
                _this.updateSelectedBean(bean);
                modal.hide();
              }
            }
          }

          require([EntityModalSpecsPath, ModalHandlersPath], function (EMSpecs, ModalHandlersComp) {
            var ModalHandlers = ModalHandlersComp.ModalHandlers;
            var ms = ModalStack.getPageStack();
            ms.pushModalSpec(new EMSpecs.FieldSelect({
              url: selectUri, fieldName: fieldinfo.friendlyName
            }).pushHandlers({
                modalActionHandlers: modalActionHandler
              }));
          });
        }

        onDeleteClick() {
          this.updateSelectedBean(null);
        }

        updateSelectedBean(bean) {
          var fieldinfo = this.props.fieldinfo;
          if (bean) {
            var id = basic.beanProperty(bean, fieldinfo.idFieldName);
            this.setState({updatedBean: bean});
            this.updateValue(id);
          } else {
            this.setState({updatedBean: null});
            this.updateValue(null);
          }
        }

        doRender() {
          var holder = this.props.holder;
          var fieldinfo = this.props.fieldinfo;
          var externalBean = this.getChosenBean();

          var val = this.getValue();
          var valStr = '';
          var valueSpan = null;
          var modalLink = null;
          if (val) {
            valStr = externalBean[fieldinfo.displayFieldName];
            valueSpan = (
              <div style={{display: "inline-block"}}><span className="display-value read-only">{valStr}</span>
                <i className="fa fa-times-circle entity-btn drop-entity" onClick={this.onDeleteClick.bind(this)}></i>
              </div>);
            modalLink = (<span className="external-link-container" style={{display: "inline-block"}}>
               <a className="entity-form-modal-view" data-foreign-key-link="" href=""
                  onClick={this.onLinkClick.bind(this)}>
                 <i className="fa fa-external-link"></i>
               </a>
            </span>);
          } else {
            valueSpan = (<span className="display-value-none-selected"
                               style={{display: "inline"}}>{EntityMsg.FieldForeignKeyNotSelected}</span>);
          }

          return (
            <div className="foreign-key-value-container" data-entity-type="" data-id-field="" data-display-field="">
              {valueSpan}
              <button
                className="btn btn-default btn-sm entity-btn to-one-lookup tiny radius secondary button hover-cursor"
                type="button"
                onClick={this.onLookupClick.bind(this)}>
                <i className="fa fa-search"></i>{EntityMsg.FieldForeignKeyLookup}
              </button>
              {modalLink}
            </div>);
        }
      }

      return {
        'id': StringFieldItem,
        'name': StringFieldItem,
        'string': StringFieldItem,
        'enumeration': EnumFieldItem,
        'boolean': BoolFieldItem,
        'date': DateFieldItem,
        'html': HtmlFieldItem,
        'foreign_key': ForeignKeyFieldItem,
        'external_foreign_key': ExternalForeignKeyFieldItem,
        'default': StringFieldItem,
        getComponentType: function (fieldType) {
          var FieldItemType = this[fieldType.toLowerCase()];
          if (FieldItemType == undefined)
            FieldItemType = this['default'];
          return FieldItemType;
        }
      }

    })();

    var FieldItemHolder = React.createClass({
      statics: {
        RefPrefix: "itemholder."
      },
      getDefaultProps: function () {
        return {
          formNamespace: "",
          fieldinfo: undefined,
          entityContext: undefined,
          initValue: undefined,
          bean: undefined,
          fieldErrors: {}
        };
      },

      render: function () {
        var field = this.props.fieldinfo;
        var _this = this;
        var fieldName = field.name;
        var fieldFN = field.friendlyName;
        var fieldType = field.fieldType;
        var visible = field.formVisible;
        var style = visible ? {} : {"display": "none"};
        var FieldType = FieldItems.getComponentType(fieldType);
        var labelClassName = "field-label control-label" + ((!!field.required) ? " required" : "");
        var fieldItemProps = {
          ref: "fieldElement",
          holder: _this,
          formNamespace: _this.props.formNamespace,
          entityContext: _this.props.entityContext,
          fieldinfo: field,
          initValue: _this.props.initValue
        };
        var fespan = _.map(_this.props.fieldErrors, function (ge, i) {
          return <span key={i} className="error control-label">{ge}</span>
        });
        var className = "field-box form-group" + (fespan.length ? " has-error" : "");
        var fieldItemElement = React.createElement(FieldType, fieldItemProps);

        var fieldSeg = (
          <div className={className} style={style}>
            <div className="field-label-group">
              <label className={labelClassName}>{fieldFN}</label>
              {fespan}
            </div>
            {fieldItemElement}
          </div>);
        return fieldSeg;
      }
    });
    FieldItems.FieldItemHolder = FieldItemHolder;

    exports.FieldItems = FieldItems;
    exports.FieldItemHolder = FieldItemHolder;

  });