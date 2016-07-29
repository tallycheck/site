define(["jquery", "underscore",
    "datamap","math",
    "i18n!nls/entitytext"],
  function ($, _, dm, math,
            entitytext) {
    var React = require('react');
    var ReactDOM = require('react-dom');

    var Cells = (function(){
      class CellBase extends React.Component {

      }

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
          if(!fieldvalue) return '';
          var dateVal = new Date(fieldvalue);
          var celldisplaymodel = fi.cellModel;
          var tStr = [];
          if(celldisplaymodel.indexOf('date') >= 0){
            var format = host.messages.datepicker_format_date;
            var d = $.datepicker.formatDate(format, dateVal, {});
            tStr.push(d);
          }
          if(celldisplaymodel.indexOf('time') >= 0){
            var format = host.messages.datepicker_format_time;
            var d = $.datepicker.formatTime(format, { hour:dateVal.getHours(), minute:dateVal.getMinutes(), second:dateVal.getSeconds()}, {});
            tStr.push(d);
          }
          return <span>{tStr.join(' ')}</span>;
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

    var createCellContent = function(entityCtx, fieldinfo, bean, fieldvalue) {
      var props = {
        entityContext: entityCtx,
        fieldinfo: fieldinfo,
        bean: bean,
        fieldvalue: fieldvalue
      };
      var CellType = Cells.getComponentType(fieldinfo.fieldType);
      return React.createElement(CellType, props);
    }

    var makeCell = function(entityCtx, fieldinfo, bean){
      var fieldname = fieldinfo.name;
      var fieldvalue = dm.entityProperty(bean, fieldname);
      var content = createCellContent(entityCtx, fieldinfo, bean, fieldvalue);

      var cell = (<td key={fieldname}>{content}</td>);
      return cell;

    }

    var makeCells = function(entityCtx, gridinfo, bean){
      var fis = gridinfo.fields;
      var cells = _.map(fis, function (field, index, array) {
        var cell = makeCell(entityCtx, field, bean);
        return cell;
      });
      return cells;
    }

    var Row = React.createClass({
      componentDidMount:function(){
        var body = this.props.body;
        if(body.rowHeight ==0){
          var node = ReactDOM.findDOMNode(this);
          var height = $(node).height();
          body.updateRowHeight(height);
        }
      },
      render: function () {
        var entityCtx = this.props.entityContext;
        var gridinfo = this.props.info;
        var bean = this.props.bean;
        var cells = makeCells(entityCtx, gridinfo, bean);
        return (<tr className="data-row">
          {cells}
        </tr>);
      }
    });
    var PaddingRow = React.createClass({
      render: function () {
        var range = this.props.range;
        var padRows = range.width();
        return (<tr className="padding-row" data-row-count={padRows}></tr>);
      }
    });
    var NoRecordRow = React.createClass({
      render: function () {
        var text = entitytext["NO_RECORDS_FOUND"];
        var span = this.props.colspan;
        var hasRec = this.props.hasRecord;
        var style = {"display" : hasRec ? "none" : ""};
        return (<tr className="empty-mark">
          <td className="entity-grid-no-results" colSpan={span} style={style}>{text}</td>
        </tr>);
      }
    });

    return {
      Row : Row,
      PaddingRow : PaddingRow,
      NoRecordRow : NoRecordRow
    }
  });