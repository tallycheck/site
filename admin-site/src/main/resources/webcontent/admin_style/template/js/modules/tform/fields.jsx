define(["jquery", "underscore",
    "datamap","messages-dict",
    "i18n!nls/entitytext", 'jquery-ui', 'jquery-ui-timepicker'],
  function ($, _,
            dm, MsgDict,
            entitytext, jui, juitp) {
    var React = require('react');
    var ReactDOM = require('react-dom');

    var FieldItems = (function(){
      class FieldItemBase extends React.Component {
        fieldNameInForm (){
          var fieldName = this.props.fieldinfo.name;
          return 'props[' + fieldName + ']';
        }
        render (){
          return <div></div>;
        }
      }
      FieldItemBase.defaultProps = {
        formNamespace:"",
        entityContext: null,
        fieldinfo: null
      };

      class TextFieldItem extends FieldItemBase {
        render (){
          var fieldName = this.fieldNameInForm();
          return (
            <input type="text" className="form-control content" name={fieldName}/>
          );
        }
      }

      class EnumFieldItem extends FieldItemBase{
        render (){
          var fieldName = this.fieldNameInForm();
          var fi = this.props.fieldinfo;
          var ops = _.map(fi.options, function(op, i){
            var opF = fi.optionsFriendly[op];
            return (<option key={op} value={op}>{opF}</option>);
          });
          return (<select className="options form-control" name={fieldName}>
              {ops}
            </select>
          );
        }

      }

      class BoolFieldItem extends FieldItemBase{
        render(){
          var fieldName = this.fieldNameInForm();
          var fi = this.props.fieldinfo;
          var trOpts = fi.options;
          return (<div className="radio-options">
            <label className="option">
              <input type="radio" name={fieldName} value="true"/>
              <span>{trOpts.t}</span>
            </label>
            <label className="option">
              <input type="radio" name={fieldName} value="false"/>
              <span>{trOpts.f}</span>
            </label>
          </div>);
        }
      }

      return {
        'enumeration' :EnumFieldItem,
        'boolean' : BoolFieldItem,
        'default' : TextFieldItem,
        getComponentType : function(fieldType){
          var FieldItemType = this[fieldType.toLowerCase()];
          if(FieldItemType == undefined)
            FieldItemType = this['default'];
          return FieldItemType;
        }
      }

    })();

    var FieldItemHolder = React.createClass({
      getDefaultProps: function() {
        return {
          formNamespace:"",
          fieldinfo: undefined
        };
      },

      render :function(){
        var field = this.props.fieldinfo;
        var fieldName = field.name;
        var fieldFN = field.friendlyName;
        var fieldType = field.fieldType;
        var visible = field.formVisible;
        var style = visible ? {} : {"display": "none"};
        var FormField = FieldItems.getComponentType(fieldType);
        var className = "field-box form-group";
        var labelClassName = "field-label control-label" + ((!!field.required)? " required" : "");
        var fieldItemProps = {
          formNamespace:this.props.formNamespace,
          entityContext: this.props.entityContext,
          fieldinfo: field
        };
        var fieldItemElement = React.createElement(FormField, fieldItemProps);

        var fieldSeg = (
          <div className={className} style={style}>
            <div className="field-label-group">
              <label className={labelClassName}>{fieldFN}</label>
            </div>
            {fieldItemElement}
          </div>);
        return fieldSeg;
      }
    });
    FieldItems.FieldItemHolder = FieldItemHolder;

    return FieldItems;
  });