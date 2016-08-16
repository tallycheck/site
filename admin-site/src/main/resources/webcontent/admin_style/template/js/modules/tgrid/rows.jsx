'use strict';

define(
  function(require, exports, module) {
    var $ = require('jquery');
    var _ = require('underscore');
    var basic = require('basic');
    var Cells = require('jsx!./cells');
    var dm = require('datamap');
    var math = require('math');
    var entityText = require('i18n!nls/entityText');

    var React = require('react');
    var ReactDOM = require('react-dom');

    var createCellContent = function (entityCtx, fieldinfo, bean, fieldvalue) {
      var props = {
        entityContext: entityCtx,
        fieldinfo: fieldinfo,
        bean: bean,
        fieldvalue: fieldvalue
      };
      var CellType = Cells.getComponentType(fieldinfo.fieldType);
      return React.createElement(CellType, props);
    }

    var makeCell = function (entityCtx, fieldinfo, bean) {
      var fieldname = fieldinfo.name;
      var fieldvalue = basic.beanProperty(bean, fieldname);
      var fieldVis = fieldinfo.gridVisible;
      var fieldVisStyle = fieldVis ? {} : {display: "none"};
      var content = createCellContent(entityCtx, fieldinfo, bean, fieldvalue);

      var cell = (<td key={fieldname} style={fieldVisStyle}>{content}</td>);
      return cell;

    }

    var makeCells = function (entityCtx, gridinfo, bean) {
      var fis = gridinfo.fields;
      var cells = _.map(fis, function (field, index, array) {
        var cell = makeCell(entityCtx, field, bean);
        return cell;
      });
      return cells;
    }

    var Row = React.createClass({
      componentDidMount: function () {
        var body = this.props.body;
        if (body.rowHeight == 0) {
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
        var rowClassName = "data-row " + (this.props.selected ? "selected" : "");
        return (<tr className={rowClassName} data-row-index={this.props.beanIndex}>
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
        var text = entityText["NO_RECORDS_FOUND"];
        var span = this.props.colspan;
        var hasRec = this.props.hasRecord;
        var style = {"display": hasRec ? "none" : ""};
        return (<tr className="empty-mark">
          <td className="entity-grid-no-results" colSpan={span} style={style}>{text}</td>
        </tr>);
      }
    });


    exports.Row = Row;
    exports.PaddingRow = PaddingRow;
    exports.NoRecordRow = NoRecordRow;
  });