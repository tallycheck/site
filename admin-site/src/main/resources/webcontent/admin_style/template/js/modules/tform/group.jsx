/**
 * Created by gaoyuan on 8/4/16.
 */
define(["jquery", "underscore", "datamap", "math",
    'jsx!modules/modal',
    'UriTemplate',
    'jsx!../tgrid',
    'jsx!./fields',
    'jsx!../entity-modal-specs',
    "i18n!nls/entitytext",
    "ResizeSensor", "ajax","jquery.dotimeout"],
  function ($, _, dm, math,
            modal,
            UriTemplate,
            TGrid,
            TFormFields,
            EMSpecs,
            entitytext, ResizeSensor, ajax, doTimeout) {
    var React = require('react');
    var ReactDOM = require('react-dom');

    var FieldItemHolder = TFormFields.FieldItemHolder;

    var Group = React.createClass({
      getDefaultProps: function () {
        return {
          formNamespace:"",
          entityContext:undefined,
          groupInfo : null,
          formInfo : null,
        };
      },

      render : function(){
        var _this = this;
        var group = this.props.groupInfo;
        var formInfo = this.props.formInfo;

        var groupName = group.name;
        var groupFN = group.friendlyName;
        var fieldsSegs = _.map(group.fields, function (fieldName) {
          var field = formInfo.fields[fieldName];
          return <FieldItemHolder formNamespace={_this.props.formNamespace}
                                  entityContext={_this.props.entityContext}
                                  key={field.name} fieldinfo={field}/>;
        });
        var groupSeg = (
            <fieldset className="entity-group">
              <legend>{groupFN}</legend>
              {fieldsSegs}
            </fieldset>
        );
        return groupSeg;
      }
    });
    return {
      Group: Group
    };
  });