/**
 * Created by gaoyuan on 8/4/16.
 */
'use strict';

define(
  function(require, exports, module){
    var $ = require('jquery');
    var _ = require('underscore');
    var dm = require('datamap');
    var math = require('math');
    var basic = require('basic');
    var UriTemplate = require('UriTemplate');
    var FieldsModule = require('jsx!./fields');
    var entityText = require('i18n!nls/entityText');

    var React = require('react');
    var ReactDOM = require('react-dom');

    var FieldItems = FieldsModule.FieldItems;
    var FieldItemHolder = FieldsModule.FieldItemHolder;

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

        var fns = tform.state.namespace;
        var entityContext = tform.state.entityContext;
        var entity = tform.state.entity;
        var bean=entity.bean;
        var errors = tform.state.errors;
        var fieldsErrors = errors.fields || {};

        var groupName = group.name;
        var groupFN = group.friendlyName;
        var fieldsSegs = _.map(group.fields, function (fieldName) {
          var field = formInfo.fields[fieldName];
          var fieldValue = basic.beanProperty(bean, fieldName);
          var fieldErrors = fieldsErrors[fieldName];
          var fieldItemHolder = <FieldItemHolder formNamespace={fns}
                                                 fieldinfo={field}
                                                 entityContext={entityContext}
                                                 initValue={fieldValue}
                                                 bean={bean}
                                                 fieldErrors={fieldErrors}
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
    exports.Group = Group;
  });