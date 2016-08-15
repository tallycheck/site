define(
  function(require, exports, module) {
    var _ = require('underscore');
    var basic = require('basic');
    var UriTemplate = require('UriTemplate');
    var UrlUtil = require('url-utility');
    var EntityInfo = require('entity-info');
    var EntityRequest = require('entity-request');

    class EntityContext {
      constructor(info, basicInfo) {
        this.info = info;
        var bi = basicInfo;
        if (_.isObject(bi)) {
          this.beanUri = bi.beanUri;
          this.idField = bi.idField;
          this.nameField = bi.nameField;
          this.ceilingType = bi.ceilingType;
          this.type = bi.type;
        } else {
          this.type = info.type;
        }
      }

      makeUri(bean) {
        var beanUriTpl = new UriTemplate(this.beanUri);
        var uri = beanUriTpl.fill({id: basic.beanProperty(bean, this.idField)});
        return uri;
      }

      getStandardIdObject(bean) {
        return {id: basic.beanProperty(bean, this.idField)};
      }
    }

    class EntityResponseBase {
      constructor(data) {
        this.data = data;
        this._entityContext = this._makeEntityContext();
      }

      infos() {
        return this.data.infos;
      }

      info() {
        throw new Error("Not implemented.");
      }

      basicInfo() {
        return this.data.infos.basic;
      }

      actions() {
        return this.data.actions;
      }

      linksObj() {
        var linksObj = {};
        _.each(this.data.links, function (t, i) {
          linksObj[t.rel] = t.href;
        });
        return linksObj;
      }

      entityContext() {
        return this._entityContext;
      }

      _makeEntityContext() {
        return new EntityContext(this.info(), this.basicInfo());
      }
    }

    class UnifiedEntities {
      constructor(entities) {
        this.entities = entities;
        this.totalCount = entities.totalCount;
        this.pageSize = entities.pageSize;
        this.startIndex = entities.startIndex;
        this.beans = entities.beans;
      }

      range() {
        var entities = this.entities;
        var recordsLength = 0;
        if (this.beans != null) {
          recordsLength = this.beans.length;
        }
        var range = {lo: entities.startIndex, hi: entities.startIndex + recordsLength};
        return range;
      }
    }
    class QueryResponse extends EntityResponseBase {
      static newInstance(data){
        return new QueryResponse(data);
      }
      constructor(data) {
        super(data);
        this._entities = new UnifiedEntities(this.data.entities);
      }

      info() {
        return this.gridInfo();
      }

      gridInfo() {
        return this.data.infos.grid;
      }

      entities() {
        return this._entities;
      }

      splitParameter(paramStr){
        var pu = UrlUtil.ParamsUtils;
        var paramObj = pu.stringToData(paramStr);
        var gridinfo = this.gridInfo();
        var cParamKeys = EntityInfo.gridQueryKeys(gridinfo);
        var ReservedParameter=EntityRequest.QueryUriReservedParams;
        var PersistentUrlParams = EntityRequest.QueryUriPersistentParams;
        var primarySearchField = gridinfo.primarySearchField;
        var primarySearchValue = '';
        if (primarySearchField != undefined){
          var primSearchArray = paramObj[primarySearchField];
          if(_.isArray(primSearchArray)){
            switch(primSearchArray.length){
              case 0:
                primarySearchValue = ''; break;
              case 1:
                primarySearchValue = primSearchArray[0]; break;
              default:
                throw new Error("Array size error");
            }
          } else if (primSearchArray === undefined){
            primarySearchValue = '';
          }else{
            primarySearchValue = primSearchArray;
          }
          if(!_.isString(primarySearchValue)){
            throw new Error("Type error");
          }
        }

        //build cParamObj, move property
        var cParamObj = {};
        cParamKeys.forEach(function(ckey, index){
          var pv = paramObj[ckey];
          cParamObj[ckey] = pv;
          if(pv !== undefined){
            delete paramObj[ckey];
          }
        });

        //build resvParamObj
        var resvParamObj={};
        for(var rkeyName in ReservedParameter){
          var rkey = ReservedParameter[rkeyName];
          var pv = paramObj[rkey];
          resvParamObj[rkey] = pv;
          if(pv !== undefined){
            if(PersistentUrlParams.indexOf(rkey) < 0){
              delete paramObj[rkey];
            }
          }
        }
        return {
          parameter : pu.dataToString(paramObj),
          cparameter : pu.dataToString(cParamObj),
          rparameter : pu.dataToString(resvParamObj),
          searchField : primarySearchField,
          searchKey : primarySearchValue
        }
      }
    }

    class UnifiedEntity {
      constructor(ops) {
        this.bean = ops.bean;
        this.errors = ops.errors;
        this.actions = ops.actions;
        this.linksObj = ops.linksObj;
        this.idField = ops.idField;
        this.action = ops.action;
        if (this.bean && this.idField) {
          this.anchor = {};
          this.anchor[this.idField] = this.bean[this.idField];
        }
        this.handleCollection = (this.action == 'create') ? false : true;
      }
    }
    class BeanResponse extends EntityResponseBase {
      static newInstance(data){
        return new BeanResponse(data);
      }
      constructor(data) {
        super(data);
        var entityCtx = this.entityContext();
        this._entity = new UnifiedEntity({
          bean: data.entity.bean,
          errors: data.errors,
          action: data.action,
          actions: this.actions(),
          linksObj: this.linksObj(),
          idField: entityCtx.idField
        });
      }

      info() {
        return this.formInfo();
      }

      formInfo() {
        return this.data.infos.form;
      }

      entity() {
        return this._entity;
      }
    }

    exports.QueryResponse = QueryResponse;
    exports.BeanResponse = BeanResponse;


  });