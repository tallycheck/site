/**
 * Created by gaoyuan on 8/4/16.
 */
define(["jquery", "underscore", "datamap", "math",
    'jsx!modules/modal',
    'UriTemplate',
    'jsx!./tgrid',
    'jsx!./tform/tab',
    'jsx!./entity-modal-specs',
    "i18n!nls/entityText",
    "ResizeSensor", "ajax", 'url-utility'],
  function ($, _, dm, math,
            modal,
            UriTemplate,
            TGrid,
            TFormTabs,
            EMSpecs,
            entityText, ResizeSensor, ajax, UrlUtil) {

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
          var beanResponse = dm.beanResponse(beanResult);

          var newState = {
            beanUri : beanResult.beanUri,
            entityContext:beanResponse.entityContext(),
            currentAction:beanResult.action,
            actions:beanResponse.actions(),
            links:beanResponse.linksObj(),

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
          namespace : 'fns_' + Math.floor(Math.random() * 1e15) + '.'
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

          entity:null,
          csrf : csrf
        };
      },
      componentDidMount:function(){
        this.renderActions();
      },
      componentWillUnmount:function(){
      },
      componentWillUpdate:function(nextProps, nextState, nextContext, transaction){
        var $form = $(this.refs.form);
        $form.off('submit');
      },
      componentDidUpdate:function(prevProps, prevState, prevContext, rootNode){
        var $form = $(this.refs.form);
        $form.on('submit', this, this.onEventFormSubmit);

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

        return (<div className="entity-form-container">
          <form ref="form" method="POST" className="twelve columns custom " action={this.state.beanUri}>
            <div className="entity-errors form-group has-error" style={{"display": "none"}}></div>
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
        var div = null;
        if(this.props.isMain){
          div = $("#contentContainer .entity-content-breadcrumbs .tgroup")[0];
        }
        if(div == null){
          div = ReactDOM.findDOMNode(this.refs.defaultActionsContainer);
        }
        var actionsEle = <TFormActions tform={this}/>;
        var tformActions = ReactDOM.render(actionsEle, div);
        this.FormActions = tformActions;
      },
      onEventFormSubmit : function(event){
        var formdata = this.formData(true);
        var currentAction = this.state.currentAction;
        var links = this.state.links;
        var uri="";
        switch(currentAction){
          case "create":
            uri = links.self;
            break;
          case "read":
            uri = links.self;
            break;
          default:
            throw new Error("TForm submit action not supported");
        }

        var _this = this;
        var handler = _.extend({}, this.defaultSubmitHandler, this.props.submitHandler);

        var options ={
          url : uri,
          type: "post",
          data : formdata,
          success : function(response, textStatus, jqXHR){
            if(response.success){
              handler.onSuccess(_this, response);
            }else{
              handler.onFail(_this, response);
            }
          },
          error: function( jqXHR, textStatus, errorThrown ){
            console.log("error");
          },
          complete: function( jqXHR, textStatus ){

          }
        };

        ajax(options);
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
        var entity = tform.state.entity;
        var csrf = tform.state.csrf;
        var entityContext = tform.state.entityContext;
        var idObj = entityContext.getStandardIdObject(entity.bean);
        var uri = new UriTemplate(this.state.links.delete).fill(idObj);
        var queryUri = this.state.links.query;

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

        var postBeanData = {
          _csrf : csrf,
          type : entityContext.type,
          ceilingType : entityContext.ceilingType
        };

        var ms = ModalStack.getPageStack();
        ms.pushModalSpec(new DeleteSpec({
          url : uri,
          data : postBeanData
        }));
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
      var beanResponse = dm.beanResponse(beanResult);
      var formEle = <TForm isMain={isMain}/>;

      var tform = ReactDOM.render(formEle, div);

      TForm.updateStateBy(tform, beanResult);

    }

    return {
      renderForm: renderForm
    };
  });