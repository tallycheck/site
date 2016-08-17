/**
 * Created by gaoyuan on 8/4/16.
 */
'use strict';

define(
  function(require, exports, module) {

    var $ = require('jquery');
    var _ = require('underscore');
    var dm = require('datamap');
    var math = require('math');
    var modal = require('jsx!modules/modal');
    var UriTemplate = require('UriTemplate');
    var TFormTabs = require('jsx!./tform/tab');
    var TFormActionsComp = require('jsx!./tform/actions');
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
    var TFormActions = TFormActionsComp.TFormActions;
    var ModalStack = modal.ModalStack;

    class TFormSubmitHandler {
      onSuccess(tform, response) {
        console.log("TFormSubmitH success");
      }

      onFail(tform, response) {
        console.log("TFormSubmitH fail");
      }

      onError(tform) {
        console.log("TFormSubmitH error");
      }

      onComplete(tform) {
        console.log("TFormSubmitH complete");
      }
    }
    class TFormDeleteHandler {
      onSuccess(tform, response) {
        console.log("TForm Delete success");
      }

      onFail(tform, response) {
        console.log("TForm Delete fail");
      }

      onError(tform) {
        console.log("TForm Delete error");
      }

      onComplete(tform) {
        console.log("TForm Delete complete");
      }
    }
    var TFormDefaultProps = {
      isMain: false,
      submitHandler: null,
      deleteHandler: null,
      actionsContainerFinder: null
    }
    class TForm extends React.Component {
      static updateStateBy(form, beanResult, fresh) {
        fresh = !!(fresh);
        var origState = form.state;
        var beanResponse = EntityResponse.BeanResponse.newInstance(beanResult);
        var errors = _.extend({}, beanResult.errors);

        var newState = {
          beanUri: beanResult.beanUri,
          entityContext: beanResponse.entityContext(),
          currentAction: beanResult.action,
          actions: beanResponse.actions(),
          links: beanResponse.linksObj(),
          errors: errors,

          entity: beanResult.entity
        };
        form.setState(newState);
      }
      static csrf() {
        return $("form[name=formtemplate] input[name=_csrf]").val();
      }

      constructor(props) {
        super(props);
        var csrf = TForm.csrf();
        this.state = {
          namespace: 'fns_' + Math.floor(Math.random() * 1e15) + '.',

          beanUri: "",
          entityContext: undefined,
          currentAction: "",
          actions: [],
          links: [],
          errors: {},

          entity: null,
          csrf: csrf
        };

        this.defaultActionsContainerFinder = this.defaultActionsContainerFinder.bind(this);
        this.FormActions = null
      }

      componentDidMount() {
        this.renderActions();
      }

      componentWillUnmount() {
        this.unRenderActions();
      }

      componentWillUpdate(nextProps, nextState, nextContext, transaction) {
        var $form = $(this.refs.form);
        $form.off('submit');
        this.unRenderActions();
      }

      componentDidUpdate(prevProps, prevState, prevContext, rootNode) {
        var $form = $(this.refs.form);
        $form.on('submit', this, this.onEventFormSubmit);

        this.renderActions();
        if (this.FormActions != null) {
          this.FormActions.updateStateByForm();
        }
      }

      formData(includeAll) {
        var paramsObj = {};
        var $form = $(this.refs.form);
        var $gInputs = $form.find('input:not(.entity-box input)');
        $gInputs.map(function (i, item) {
          paramsObj[item.name] = item.value;
        });
        var bean = {};
        var fihs = this.refs.tabContainer.refs.content.fieldItemHolders();
        _.each(_.values(fihs), function (fih) {
          var fieldItem = fih.refs.fieldElement;
          var fieldinfo = fieldItem.props.fieldinfo;
          var updated = fieldItem.updated();
          if (updated || includeAll) {
            var value = fieldItem.getValue();
            var key = "props[" + fieldinfo.name + "]";
            bean[fieldinfo.name] = value;
            paramsObj[key] = value;
          }
        });
        paramsObj.bean = bean;
        return paramsObj;
      }

      render() {
        var csrf = this.state.csrf;
        var timezoneOffset = (new Date()).getTimezoneOffset();
        var entityContext = this.state.entityContext;
        var formInfo = entityContext ? entityContext.info : undefined;
        if (formInfo == undefined)
          return <div/>;
        var bean = this.state.entity.bean;

        var errors = this.state.errors;
        var gespan = _.map(errors.global, function (ge, i) {
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
      }

      renderActions() {
        this.unRenderActions();
        var actionsContainerFinder = this.props.actionsContainerFinder || this.defaultActionsContainerFinder;
        var div = actionsContainerFinder();
        if (div != null) {
          var actionsEle = <TFormActions tform={this}/>;
          var tformActions = ReactDOM.render(actionsEle, div);
          this.FormActions = tformActions;
        } else {
          this.FormActions = null;
        }
      }

      unRenderActions() {
        var fas = this.FormActions;
        if (fas) {
          var actionsContainerFinder = this.props.actionsContainerFinder || this.defaultActionsContainerFinder;
          var div = actionsContainerFinder();
          if (div != null) {
            var unmount = ReactDOM.unmountComponentAtNode(div);
            if (!unmount) {
              throw new Error("unmount failed");
            }
          } else {
            throw new Error("FormActions not null, but div is null");
          }
        }
        this.FormActions = null;
      }

      defaultActionsContainerFinder() {
        var div = null;
        if (this.props.isMain) {
          div = $("#contentContainer .entity-content-breadcrumbs .tgroup")[0];
        }
        if (div == null) {
          div = this.refs.defaultActionsContainer;
        }
        return div;
      }

      onFireDelete() {
        var tform = this;
        var isMain = tform.props.isMain;
        var entity = tform.state.entity;
        var csrf = tform.state.csrf;
        var entityContext = tform.state.entityContext;
        var idObj = entityContext.getStandardIdObject(entity.bean);
        var uri = new UriTemplate(tform.state.links.delete).fill(idObj);
        var queryUri = tform.state.links.query;

        var delHandler = {
          onSuccess: function () {
          }
        }
        var delOpts = {
          url: uri,
          csrf: csrf,
          type: entityContext.type,
          ceilingType: entityContext.ceilingType,
          successRedirect: isMain,
          deleteExtraHandler: delHandler
        };

        require([EntityModalSpecsPath], function (EMSpecs) {
          class DeleteSpec extends EMSpecs.Delete {
            onDeleteSuccess(data, opts) {
              super.onDeleteSuccess(data, opts);
            }

            onDeleteFail(data, opts) {
              super.onDeleteFail(data, opts);
              console.log('Todo: Handle deleting fail');
            }
          }

          var ms = ModalStack.getPageStack();
          ms.pushModalSpec(new DeleteSpec(delOpts));
        });
      }

      onEventFormSubmit(event) {
        var _this = this;
        var formdata = this.formData(true);
        var currentAction = this.state.currentAction;
        var links = this.state.links;
        var uri = "";
        var requestHandlerBase;
        var method;
        switch (currentAction) {
          case "create":
            uri = links.self;
            requestHandlerBase = EntityRequest.CreateHandler;
            method = 'create';
            break;
          case "read":
            uri = links.self;
            requestHandlerBase = EntityRequest.UpdateHandler;
            method = 'update';
            break;
          default:
            throw new Error("TForm submit action not supported");
        }

        var submitParam = {url: uri, entityData: formdata};
        var handler = this.props.submitHandler;
        if (handler == null) {
          handler = _.extend(new TFormSubmitHandler(), TForm.defaultSubmitHandler);
        }
        class EntityPostHandler extends requestHandlerBase {
          onSuccess(data, param) {
            handler.onSuccess(_this, data);
          }

          onFail(data, param) {
            handler.onFail(_this, data);
          }

          onError() {
            handler.onError(_this);
          }

          onComplete() {
            handler.onComplete(_this);
          }
        }
        EntityRequest[method](submitParam, new EntityPostHandler());

        event.preventDefault();
      }
    }
    TForm.defaultProps = TFormDefaultProps;

    TForm.defaultSubmitHandler = {
      onSuccess: function (tform, response) {
        console.log("success");
      },
      onFail: function (tform, response) {
        TForm.updateStateBy(tform, response.data);
        console.log("fail");
      },
      onError: function (tform) {
        console.log("error");
      },
      onComplete: function (tform) {
        console.log("complete");
      }
    }
    TForm.defaultDeleteHandler = {
      onSuccess: function (tform, response) {
        console.log("success");
      },
      onFail: function (tform, response) {
        console.log("fail");
      },
      onError: function (tform) {
        console.log("error");
      },
      onComplete: function (tform) {
        console.log("complete");
      }
    }

    function renderForm(beanResult, div, isMain) {
      var formEle = <TForm isMain={isMain}/>;
      var tform = ReactDOM.render(formEle, div);

      TForm.updateStateBy(tform, beanResult);
    }

    exports.TForm = TForm;
    exports.TFormSubmitHandler = TFormSubmitHandler;
    exports.renderForm = renderForm;
  });