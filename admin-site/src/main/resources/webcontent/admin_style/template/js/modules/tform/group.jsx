/**
 * Created by gaoyuan on 8/4/16.
 */
define(["jquery", "underscore", "datamap", "math",
    'jsx!modules/modal',
    "basic",
    'UriTemplate',
    'jsx!../tgrid',
    'jsx!./fields',
    'jsx!../entity-modal-specs',
    "i18n!nls/entityText",
    "ResizeSensor", "ajax","jquery.dotimeout"],
  function ($, _, dm, math,
            modal,
            basic,
            UriTemplate,
            TGrid,
            TFormFields,
            EMSpecs,
            entityText, ResizeSensor, ajax, doTimeout) {
    var React = require('react');
    var ReactDOM = require('react-dom');

    var FieldItemHolder = TFormFields.FieldItemHolder;

    var Group = React.createClass({
      statics : {
        RefPrefix : "group."
      },
      getDefaultProps: function () {
        return {
          tform : undefined,
          formInfo : null,
          groupInfo : null,
        };
      },

      render : function(){
        var _this = this;
        var group = this.props.groupInfo;
        var formInfo = this.props.formInfo;
        var tform = this.props.tform;

        var fns = this.props.tform.props.namespace;
        var entityContext = this.props.tform.state.entityContext;
        var entity = tform.state.entity;
        var bean=entity.bean;

        var groupName = group.name;
        var groupFN = group.friendlyName;
        var fieldsSegs = _.map(group.fields, function (fieldName) {
          var field = formInfo.fields[fieldName];
          var fieldValue = dm.entityProperty(bean, fieldName);
          var fieldItemHolder = <FieldItemHolder formNamespace={fns}
                                                 fieldinfo={field}
                                                 entityContext={entityContext}
                                                 initValue={fieldValue}
                                                 bean={bean}
                                                 ref={FieldItemHolder.RefPrefix + field.name}
                                                 key={field.name}/>;
          return fieldItemHolder;
        });
        var groupSeg = (
            <fieldset className="entity-group">
              <legend>{groupFN}</legend>
              {fieldsSegs}
            </fieldset>
        );
        return groupSeg;
      },
      fieldItemHolders : function(){
        return basic.propertiesWithKeyPrefix(this.refs, FieldItemHolder.RefPrefix);
      }
    });
    return {
      Group: Group
    };
  });