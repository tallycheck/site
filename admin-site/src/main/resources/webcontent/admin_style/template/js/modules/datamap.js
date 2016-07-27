define(["jquery"], function ($) {
  'use strict';
  function getDataMap(){
    return $(".data-map p").data("data-map");
  }

  function getData(name){
    return getDataMap()[name];
  }

  var EntityContext = function (info, basicInfo) {
    this.info = info;
    var bi = basicInfo;
    if ($.isPlainObject(bi)) {
      this.beanUri = bi.beanUri;
      this.idField = bi.idField;
      this.nameField = bi.nameField;
      this.ceilingType = bi.ceilingType;
      this.type = bi.type;
    }else{
      this.type = info.type;
    }
  }
  EntityContext.prototype = {
    makeUri : function(entity){
      var beanUriTpl = new UriTemplate(this.beanUri);
      var uri = beanUriTpl.fill({id : entityProperty(entity, this.idField)});
      return uri;
    }
  };

  var BeanContext = function(ops){
    this.bean = ops.bean;
    this.errors = ops.errors;
    this.actions = ops.actions;
    this.linksObj = ops.linksObj;
    this.idField = ops.idField;
    this.action = ops.action;
    if(this.bean && this.idField){
      this.anchor= {};
      this.anchor[this.idField] = this.bean[this.idField];
    }
    this.handleCollection = (this.action == 'create') ? false : true;
  }

  var QueryBeansContext = function (entities) {
    this.entities = entities;
    this.totalCount = entities.totalCount;
    this.pageSize = entities.pageSize;
    this.startIndex = entities.startIndex;
    this.beans = entities.beans;
  }
  QueryBeansContext.prototype = {
    range: function () {
      var entities = this.entities;
      var recordsLength = 0;
      if (this.beans != null) {
        recordsLength = this.beans.length;
      }
      var range = {lo: entities.startIndex, hi: entities.startIndex + recordsLength};
      return range;
    }
  }

  function entityProperty(entity, propertyPath){
    var pieces = propertyPath.split('.');
    var pro = entity;
    pieces.some(function(t,i){
      if(t){
        pro = pro[t];
        if(pro == null)
          return true;
      }
    });
    return pro;
  }

  var EntityResponse = function (data) {
    this.data = data;
    this._entityContext = undefined;
  }
  EntityResponse.prototype = {
    infos : function () {
      return this.data.infos;
    },
    info : function () {
      throw new Error("Not implemented.");
    },
    basicInfo : function(){
      return this.data.infos.basic;
    },
    actions : function(){
      return this.data.actions;
    },

    linksObj : function () {
      var linksObj = {};
      this.data.links.forEach(function(t,i){
        linksObj[t.rel]=t.href;
      });
      return linksObj;
    },
    entityContext : function(){
      if(this._entityContext === undefined){
        this._entityContext = this._makeEntityContext();
      }
      return this._entityContext;
    },
    _makeEntityContext : function(){
      return new EntityContext(this.info(), this.basicInfo());
    }
  }

  var QueryResponse = function(data){
    EntityResponse.apply(this, arguments);
    this._entities = new QueryBeansContext(this.data.entities);
  }
  QueryResponse.prototype=Object.create(EntityResponse.prototype, {
    constructor :{value:QueryResponse},
    gridInfo : {value : function () {
      return this.data.infos.details['grid'];
    }},
    info:{value:function(){return this.gridInfo();}},
    entities : {value:function () {
      return this._entities;
    }}
  });
  QueryResponse.newInstance = function(data){
    return new QueryResponse(data);
  }

  var BeanResponse = function(data){
    EntityResponse.apply(this, arguments);
    var entityCtx = this.entityContext();
    this._entity = new BeanContext({
      bean:data.entity.bean,
      errors:data.errors,
      action:data.action,
      actions:this.actions(),
      linksObj:this.linksObj(),
      idField:entityCtx.idField
    });
  }
  BeanResponse.prototype=Object.create(EntityResponse.prototype, {
    constructor :{value:BeanResponse},
    formInfo : {value : function () {
      return this.data.infos.details['form'];
    }},
    info:{value:function(){return this.formInfo();}},
    entity :{value:function(){return this._entity;}}
  });

  return {
    dataMap : getDataMap,
    data : getData,
    entityProperty : entityProperty,
    EntityContext : EntityContext,
    BeanContext : BeanContext,
    QueryResponse: QueryResponse,
    queryResponse : QueryResponse.newInstance,
    BeanResponse: BeanResponse
  }
});