define(["jquery", "underscore",
    "datamap","messages-dict",
    "i18n!nls/entitytext", 'jquery-ui', 'jquery-ui-timepicker'],
  function ($, _,
            dm, MsgDict,
            entitytext, jui, juitp) {
    var React = require('react');
    var ReactDOM = require('react-dom');

    var Cells = (function(){
      class CellBase extends React.Component {

      }
      CellBase.defaultProps = {

      };

      class TextCell extends CellBase {
        render(){
          var fv = this.props.fieldvalue;
          return <span>{fv}</span>;
        }
      }
      class NameCell extends CellBase {
        render (){
          var bean = this.props.bean;
          var url = this.props.entityContext.makeUri(bean);
          return <a href={url}>{this.props.fieldvalue}</a>
        }
      }
      class EmailCell extends CellBase{
        render(){
          var bean = this.props.bean;
          var url = 'mailto:' + this.props.fieldvalue;
          return <a href={url}>{this.props.fieldvalue}</a>
        }
      }
      class EnumCell extends CellBase{
        render(){
          var fi = this.props.fieldinfo;

          var options = fi.options;
          var optionNames = fi.optionsFriendly;
          var fieldname = fi.name;
          var fieldvalue = dm.entityProperty(this.props.bean, fieldname);
          return <span>{optionNames[fieldvalue]}</span>;
        }
      }
      class BoolCell extends CellBase {
        render() {
          var fi = this.props.fieldinfo;

          var fieldname = fi.name;
          var options = fi.options;
          var fieldvalue = dm.entityProperty(this.props.bean, fieldname);
          if(fieldvalue === "" || fieldvalue === null || fieldvalue === undefined)
            return '';
          return <span>{options[fieldvalue?'t':'f']}</span>;
        }
      }
      class DateCell extends CellBase{
        render() {
          var fi = this.props.fieldinfo;
          var fieldname = fi.name;
          var fieldvalue = dm.entityProperty(this.props.bean, fieldname);
          if(!fieldvalue)
            return <span></span>;
          var dateVal = new Date(fieldvalue);
          var celldisplaymodel = fi.cellModel;
          var tStr = [];
          if(celldisplaymodel.indexOf('date') >= 0){
            var format = MsgDict.datepicker_format_date;
            var d = $.datepicker.formatDate(format, dateVal, {});
            tStr.push(d);
          }
          if(celldisplaymodel.indexOf('time') >= 0){
            var format = MsgDict.datepicker_format_time;
            var d = $.datepicker.formatTime(format, { hour:dateVal.getHours(), minute:dateVal.getMinutes(), second:dateVal.getSeconds()}, {});
            tStr.push(d);
          }
          var content = tStr.join(' ');
          return <span>{content}</span>;
        }
      }
      class PhoneCell extends CellBase{
        render(){
          var fi = this.props.fieldinfo;
          var fieldname = fi.name;
          var fieldvalue = dm.entityProperty(this.props.bean, fieldname);
          if(fieldvalue == null) fieldvalue = '';

          var segLen = 4;
          var formatedPhone = '';
          if (fieldvalue.length <= segLen) {
            formatedPhone = fieldvalue;
          } else {
            var segCount = Math.ceil(fieldvalue.length / segLen);
            var start = 0; var end = fieldvalue.length % segLen;
            end = (end == 0) ? segLen : end;
            var segs = [];
            for (var i = 0; i < segCount; ++i) {
              segs[i] = fieldvalue.substring(start, end);
              start = end; end = start + segLen;
            }
            formatedPhone = segs.join('-');
          }
          var url = 'tel:' + this.props.fieldvalue;
          return <a href={url}>{formatedPhone}</a>
        }
      }
      class ForeignKeyCell extends CellBase{
        render(){
          var fi = this.props.fieldinfo;
          var bean = this.props.bean;
          var fieldname = fi.name;
          var displayFieldName = fi.displayFieldName;
          var idFieldName = fi.idFieldName;
          var fieldvalue = dm.entityProperty(bean, fieldname);

          if(!!fieldvalue){
            var idVal = fieldvalue[idFieldName];
            var nameVal = fieldvalue[displayFieldName];
            var template = new UriTemplate(fi.recordUri);
            var url =template.fill(bean);
            return (<span>{nameVal}<a className="entity-form-modal-view" href={url}><i className="fa fa-external-link"/></a></span>);
          }
          return <span/>;
        }
      }
      class ExternalForeignKeyCell extends CellBase{
        render() {
          var fi = this.props.fieldinfo;
          var bean = this.props.bean;
          var fieldname = fi.name;
          var entityFieldName = fi.entityFieldName;
          var entityFieldDisplayProperty = fi.displayFieldName;

          var fieldvalue = dm.entityProperty(bean, fieldname);
          if(!!fieldvalue) {
            var refForeignEntity = bean[entityFieldName];
            var idVal = fieldvalue;
            var nameVal = refForeignEntity[entityFieldDisplayProperty];
            var template = new UriTemplate(fi.recordUri);
            var url =template.fill(bean);
            return (<span>{nameVal}<a className="entity-form-modal-view" href={url}><i className="fa fa-external-link" /></a></span>);
          }
          return <span/>;
        }
      }

      return {
        "email" : EmailCell,
        "name" : NameCell,
        'enumeration' :EnumCell,
        'boolean' : BoolCell,
        'date' : DateCell,
        'phone' : PhoneCell,
        'foreign_key' : ForeignKeyCell,
        'external_foreign_key':ExternalForeignKeyCell,
        'default' : TextCell,
        getComponentType : function(fieldType){
          var CellType = this[fieldType.toLowerCase()];
          if(CellType == undefined)
            CellType = this['default'];
          return CellType;
        }
      }
    })();

    return Cells;
  });