/**
 * Created by gaoyuan on 8/4/16.
 */
define(["jquery", "underscore", "datamap", "math",
    'jsx!modules/modal',
    'UriTemplate',
    'jsx!./tgrid',
    'jsx!./tform/tab',
    'jsx!./entity-modal-specs',
    "i18n!nls/entitytext",
    "ResizeSensor", "ajax"],
  function ($, _, dm, math,
            modal,
            UriTemplate,
            TGrid,
            TFormTabs,
            EMSpecs,
            entitytext, ResizeSensor, ajax) {

    var React = require('react');
    var ReactDOM = require('react-dom');
    var TabContainer = TFormTabs.TabContainer;

    var TForm = React.createClass({
      statics : {
        updateStateBy: function (form, beanResult, fresh) {
          fresh = !!(fresh);
          var origState = form.state;
          var beanResponse = dm.beanResponse(beanResult);

          var newState = {
            beanUri : beanResult.beanUri,
            entityContext:beanResponse.entityContext(),
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
          namespace : 'fns_' + Math.floor(Math.random() * 1e15) + '_'
        };
      },
      getInitialState: function () {
        var csrf = TForm.csrf();
        return {
          beanUri : "",
          entityContext:undefined,
          actions:[],
          links:[],

          entity:null,
          csrf : csrf
        };
      },
      render : function(){
        var csrf = this.state.csrf;
        var entityContext = this.state.entityContext;
        var formInfo = entityContext ? entityContext.info : undefined;
        if(formInfo == undefined)
          return <div/>;

        return (<div className="entity-form-container">
          <form method="POST" className="twelve columns custom " action="http://localhost:8083/person/000000000000000000000000">
            <div className="entity-errors form-group has-error" style={{"display": "none"}}></div>
            <div className="entity-context" style={{"display": "none"}}>
              <input type="hidden" name="timezoneOffset" value="-480"/>
              <input type="hidden" name="ceilingType" value="com.taoswork.tallycheck.datadomain.tallyuser.Person"/>
              <input type="hidden" name="type" value="com.taoswork.tallycheck.datadomain.tallyuser.impl.PersonImpl"/>
            </div>
            <TabContainer formInfo={formInfo} tform={this}></TabContainer>
            <div className="form-action-group-container">
              <div className="action-group" style={{"display": "none"}}>
                <button type="button" className="btn btn-default action-control" data-action="create" data-edit-in-modal="true" data-action-url="" data-edit-success-redirect="false" data-action-uri="/person/add" style={{"display": "none"}}>
                  <span className="fa fa-plus" aria-hidden="true"></span> New</button>
                <button type="button" className="btn btn-default action-control" data-action="reorder" data-action-url="" style={{"display": "none"}}>
                  <span className="fa fa-bars" aria-hidden="true"></span> Reorder</button>
                <button type="button" className="btn btn-default action-control entity-action" data-action="update" data-edit-in-modal="true" data-action-url="" data-edit-success-redirect="false" disabled="disabled" data-action-uri="/person/{id}" style={{"display": "none"}}>
                  <span className="fa fa-pencil-square-o" aria-hidden="true"></span> Edit</button>
                <button type="button" className="btn btn-default action-control entity-action" data-action="delete" data-action-url="" disabled="disabled" data-action-uri="/person/{id}/delete" style={{"display": "inline-block"}}>
                  <span className="fa fa-times" aria-hidden="true"></span> Delete</button>
                <div className="action-control entity-action submit-entity" data-action="save" data-action-url="" disabled="disabled" style={{"display": "inline-block"}}>
                  <button type="button" className="btn btn-default"><span className="fa fa-floppy-o" aria-hidden="true"></span> Save</button>
                  <span className="spinner" style={{"display":"none"}}><i className="fa fa-spin fa-circle-o-notch"></i></span>
                </div>
              </div>
            </div>
            <input type="hidden" name="_csrf" value={csrf}/>
          </form>
        </div>);
      }
    });

    function renderForm(beanResult, div){
      var beanResponse = dm.beanResponse(beanResult);
      var formEle = <TForm/>;

      var tform = ReactDOM.render(formEle, div);

      TForm.updateStateBy(tform, beanResult);

    }

    return {
      renderForm: renderForm
    };
  });