/**
 * Created by gaoyuan on 8/4/16.
 */
define(
  function(require, exports, module){

    var $ = require('jquery');
    var _ = require('underscore');
    var dm = require('datamap');
    var math = require('math');
    var modal = require('jsx!modules/modal');
    var UriTemplate = require('UriTemplate');
    var TFormTabs = require('jsx!./tform/tab');
    //var EMSpecs = require('jsx!./entity-modal-specs');
    var entityText = require('i18n!nls/entityText');
    var ResizeSensor = require('ResizeSensor');
    var UrlUtil = require('url-utility');
    var EntityModalSpecsPath = 'jsx!./entity-modal-specs';
    var EntityRequest = require('entity-request');
    var EntityResponse = require('entity-response');

    var React = require('react');
    var ReactDOM = require('react-dom');
    var TabContainer = TFormTabs.TabContainer;
    var ModalStack = modal.ModalStack;

    var TForm = React.createClass({
      FormActions : null,
      statics : {
        updateStateBy: function (form, beanResult, fresh) {
          fresh = !!(fresh);
          var origState = form.state;
          var beanResponse = EntityResponse.BeanResponse.newInstance(beanResult);
          var errors = _.extend({}, beanResult.errors);

          var newState = {
            beanUri : beanResult.beanUri,
            entityContext:beanResponse.entityContext(),
            currentAction:beanResult.action,
            actions:beanResponse.actions(),
            links:beanResponse.linksObj(),
            errors:errors,

            entity : beanResult.entity
          };
          form.setState(newState);
        },
        csrf : function(){
          return $("form[name=formtemplate] input[name=_csrf]").val();
        }
      },
      getDefaultProps: function () {
        return {
          isMain : false,
          submitHandler : null,
          namespace : 'fns_' + Math.floor(Math.random() * 1e15) + '.',
          actionsContainerFinder : null
        };
      },
      getInitialState: function () {
        var csrf = TForm.csrf();
        return {
          beanUri : "",
          entityContext: undefined,
          currentAction:"",
          actions:[],
          links:[],
          errors:{},

          entity:null,
          csrf : csrf
        };
      },
      componentDidMount:function(){
        this.renderActions();
      },
      componentWillUnmount:function(){
        this.unRenderActions();
      },
      componentWillUpdate:function(nextProps, nextState, nextContext, transaction){
        var $form = $(this.refs.form);
        $form.off('submit');
        this.unRenderActions();
      },
      componentDidUpdate:function(prevProps, prevState, prevContext, rootNode){
        var $form = $(this.refs.form);
        $form.on('submit', this, this.onEventFormSubmit);

        this.renderActions();
        if(this.FormActions != null){
          this.FormActions.updateStateByForm();
        }
      },
      formData : function(includeAll){
        var paramsObj = {};
        var $form = $(this.refs.form);
        var $gInputs = $form.find('input:not(.entity-box input)');
        $gInputs.map(function(i, item){
          paramsObj[item.name] = item.value;
        });
        var bean={};
        var fihs = this.refs.tabContainer.refs.content.fieldItemHolders();
        _.each(_.values(fihs),function(fih){
          var fieldItem = fih.refs.fieldElement;
          var fieldinfo = fieldItem.props.fieldinfo;
          var updated = fieldItem.updated();
          if(updated || includeAll){
            var value = fieldItem.getValue();
            var key = "props[" + fieldinfo.name +"]";
            bean[fieldinfo.name]=value;
            paramsObj[key] = value;
          }
        });
        paramsObj.bean = bean;
        return paramsObj;
      },
      render : function(){
        var csrf = this.state.csrf;
        var timezoneOffset = (new Date()).getTimezoneOffset();
        var entityContext = this.state.entityContext;
        var formInfo = entityContext ? entityContext.info : undefined;
        if(formInfo == undefined)
          return <div/>;
        var bean = this.state.entity.bean;

        var errors = this.state.errors;
        var gespan = _.map(errors.global, function(ge, i){
          return <span className="entity-error control-label" key={i}>{ge}</span>
        });
        var geEle = gespan.length ? (<div className="entity-errors form-group has-error" style={{display: "block"}}>
            {gespan}
          </div>) : null;

        return (<div className="entity-form-container">
          <form ref="form" method="POST" className="twelve columns custom " action={this.state.beanUri}>
            {geEle}
            <div className="entity-context" style={{"display": "none"}}>
              <input type="hidden" name="timezoneOffset" value={timezoneOffset}/>
              <input type="hidden" name="ceilingType" value={entityContext.ceilingType}/>
              <input type="hidden" name="type" value={entityContext.type}/>
            </div>
            <TabContainer ref="tabContainer" formInfo={formInfo} tform={this} bean={bean}></TabContainer>
            <div ref="defaultActionsContainer" className="form-action-group-container">
            </div>
            <input type="hidden" name="_csrf" value={csrf}/>
          </form>
        </div>);
      },
      renderActions : function(){
        this.unRenderActions();
        var actionsContainerFinder = this.props.actionsContainerFinder || this.defaultActionsContainerFinder;
        var div = actionsContainerFinder();
        if(div != null){
          var actionsEle = <TFormActions tform={this}/>;
          var tformActions = ReactDOM.render(actionsEle, div);
          this.FormActions = tformActions;
        }else{
          this.FormActions = null;
        }
      },
      unRenderActions : function(){
        var fas = this.FormActions;
        if(fas){
          var actionsContainerFinder = this.props.actionsContainerFinder || this.defaultActionsContainerFinder;
          var div = actionsContainerFinder();
          if(div != null) {
            var unmount = ReactDOM.unmountComponentAtNode(div);
            if(!unmount){
              throw new Error("unmount failed");
            }
          }else{
            throw new Error("FormActions not null, but div is null");
          }
        }
        this.FormActions = null;
      },
      defaultActionsContainerFinder : function(){
        var div = null;
        if(this.props.isMain){
          div = $("#contentContainer .entity-content-breadcrumbs .tgroup")[0];
        }
        if(div == null){
          div = this.refs.defaultActionsContainer;
        }
        return div;
      },
      onEventFormSubmit : function(event){
        var formdata = this.formData(true);
        var currentAction = this.state.currentAction;
        var links = this.state.links;
        var uri="";
        var handlerBase;
        var method;
        switch(currentAction){
          case "create":
            uri = links.self;
            handlerBase = EntityRequest.CreateHandler;
            method = 'create';
            break;
          case "read":
            uri = links.self;
            handlerBase = EntityRequest.UpdateHandler;
            method = 'update';
            break;
          default:
            throw new Error("TForm submit action not supported");
        }

        var _this = this;
        var submitParam ={url : uri, entityData : formdata};
        class SubmitHandler extends handlerBase{
        }
        var handler = _.extend(new SubmitHandler(), this.defaultSubmitHandler, this.props.submitHandler);
        EntityRequest[method](submitParam, handler);

        event.preventDefault();
      },
      defaultSubmitHandler :  {
        onSuccess:function(tform, response){
          console.log("success");
        },
        onFail : function(tform, response){
          TForm.updateStateBy(tform, response.data);

          console.log("fail");
        }
      }
    });

    var TFormActions = React.createClass({
      getDefaultProps: function () {
        return {
          tform : null,
        };
      },
      getInitialState: function () {
        return {
          actions: [],
          links : {},
          lock : false,
          dirty : false,
          saving : false
        };
      },
      updateStateByForm : function(){
        var tform = this.props.tform;
        this.setState({
          actions:tform.state.actions,
          links : tform.state.links,
        });
      },
      render(){
        var actions = this.state.actions;
        var deleteAction = "delete";
        var saveAction = "save";
        var showDelete = _.indexOf(actions, deleteAction) >= 0;
        var showSave = _.indexOf(actions, saveAction) >= 0;
        var deleteEle = showDelete ? (<button type="button" className="btn btn-default action-control entity-action"
                                 data-action={deleteAction} style={{display: "inline-block"}} onClick={this.onDeleteClick}>
            <span className="fa fa-times" aria-hidden="true"></span>{entityText.GRID_ACTION_delete}
        </button>) : <div/> ;
        var spinnerStyle = {display: this.state.saving ? "block":"none"};
        var saveEle =  showSave ? (<div className="action-control entity-action submit-entity"
                            data-action={saveAction} data-action-url="" disabled={!this.state.dirty} style={{display: "inline-block"}}>
            <button type="button" className="btn btn-default" onClick={this.onSaveClick}>
              <span className="fa fa-floppy-o" aria-hidden="true"></span>{entityText.GRID_ACTION_save}
            </button>
            <span className="spinner" style={spinnerStyle}><i className="fa fa-spin fa-circle-o-notch"></i></span>
          </div>
        ): <div/> ;

        return (<div className="action-group" style={{display: "block"}}>
          <p style={{display:"inline-block"}}>T</p>
          {deleteEle}
          {saveEle}
        </div>);
      },
      onDeleteClick(){
        var tform = this.props.tform;
        var isMain = tform.props.isMain;
        var entity = tform.state.entity;
        var csrf = tform.state.csrf;
        var entityContext = tform.state.entityContext;
        var idObj = entityContext.getStandardIdObject(entity.bean);
        var uri = new UriTemplate(this.state.links.delete).fill(idObj);
        var queryUri = this.state.links.query;

        var delHandler = {
          onSuccess: function () {
          }
        }
        var delOpts = {
          url : uri,
          csrf : csrf,
          type : entityContext.type,
          ceilingType : entityContext.ceilingType,
          successRedirect : isMain,
          deleteExtraHandler : delHandler
        };

        require([EntityModalSpecsPath], function(EMSpecs) {
          class DeleteSpec extends EMSpecs.Delete{
            onDeleteSuccess(data, opts){
              super.onDeleteSuccess(data, opts);
              window.location.replace(queryUri);
            }
            onDeleteFail(data, opts){
              super.onDeleteFail(data, opts);
              console.log('Todo: Handle deleting fail');
            }
          }

          var ms = ModalStack.getPageStack();
          ms.pushModalSpec(new DeleteSpec(delOpts));
        });

      },
      onSaveClick(){
        var tform = this.props.tform;
        var entity = tform.state.entity;
        var csrf = tform.state.csrf;
        var entityContext = tform.state.entityContext;
        var form = tform.refs.form;
        $(form).submit();
        console.log("save clicked");
      }
    });

    function renderForm(beanResult, div, isMain){
      var formEle = <TForm isMain={isMain}/>;

      var tform = ReactDOM.render(formEle, div);

      TForm.updateStateBy(tform, beanResult);

    }

    exports.TForm = TForm;
    exports.renderForm = renderForm;
  });