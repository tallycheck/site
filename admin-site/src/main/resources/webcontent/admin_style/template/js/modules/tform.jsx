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
    var HandlersComp = require('./handlers');
    var UriTemplate = require('UriTemplate');
    var UrlUtil = require('url-utility');
    var TFormHandlerComp = require('./tform/handlers');
    var TFormTabs = require('jsx!./tform/tab');
    var TFormActionsComp = require('jsx!./tform/actions');
    //var EMSpecs = require('jsx!./entity-modal-specs');
    var EntityMsg = require('i18n!./nls/entity');
    var ResizeSensor = require('ResizeSensor');
    var UrlUtil = require('url-utility');
    var EntityModalSpecsPath = 'jsx!./entity-modal-specs';
    var EntityRequest = require('entity-request');
    var EntityResponse = require('entity-response');
    var HandlerUtils = require('handler-utils');
    var LeadingExecutor = HandlerUtils.leadingExecutor;

    var React = require('react');
    var ReactDOM = require('react-dom');
    var TabContainer = TFormTabs.TabContainer;
    var TFormActions = TFormActionsComp.TFormActions;
    var ModalStack = modal.ModalStack;
    var TFormHandler = TFormHandlerComp.TFormHandler;
    var TFormRequestHandler = TFormHandlerComp.TFormRequestHandler;
    var SubmitTFormHandlers = TFormHandlerComp.SubmitTFormHandlers;
    var DeleteTFormHandlers = TFormHandlerComp.DeleteTFormHandlers;


    var TFormHandlersTemplate = {
      submitFormHandlers: null, //compatible with TFormHandler
      submitRequestHandlers: null,
      deleteFormHandlers: null,
      deleteRequestHandlers: null,
    }
    var TFormDefaultProps = {
      isMain: false,
      actionsContainerFinder: null,
      handlers : null,
    }
    var TFormStatics = {
      defaultProps: TFormDefaultProps,

      defaultSubmitFormHandler: [SubmitTFormHandlers.UpdateOnFail],
    }
    class TForm extends React.Component {
      static csrf() {
        return $("form[name=formtemplate] input[name=_csrf]").val();
      }

      constructor(props) {
        super(props);
        var csrf = TForm.csrf();
        this.state = {
          namespace: 'fns_' + Math.floor(Math.random() * 1e15) + '.',
          loading: false,

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
        this.TFormActions = null;
        this.handlers = new HandlersComp.HandlerContainer(TFormHandlersTemplate);
        this.handlers.pushHandlers(props.handlers);
      }

      updateStateBy(beanResult, fresh) {
        var form = this;
        fresh = !!(fresh);
        var origState = form.state;
        var beanResponse = EntityResponse.BeanResponse.newInstance(beanResult);
        var errors = _.extend({}, beanResult.errors);

        var newState = {
          loading: false,

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
        $form.on('submit', this, this.onEventTFormSubmit);

        this.renderActions();
        if (this.TFormActions != null) {
          this.TFormActions.updateStateByForm();
        }
        if (this.props.isMain) {
          var beanUrl = this.state.beanUri;
          if (_.isString(beanUrl) && !!beanUrl) {
            UrlUtil.HistoryUtility.replaceUrl(beanUrl);
          }
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
        var loading = this.state.loading;
        var showProgress = false;
        var loadingEle = null;
        if (loading && showProgress) {
          loadingEle = (<div className="entity-form-container progress fresh-progress">
            <div className="progress-bar progress-bar-striped active" style={{width: "100%"}}></div>
          </div>);
        }

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
          {loadingEle}
        </div>);
      }

      renderActions() {
        this.unRenderActions();
        var actionsContainerFinder = this.props.actionsContainerFinder || this.defaultActionsContainerFinder;
        var div = actionsContainerFinder();
        if (div != null) {
          var actionsEle = <TFormActions tform={this}/>;
          var tformActions = ReactDOM.render(actionsEle, div);
          this.TFormActions = tformActions;
        } else {
          this.TFormActions = null;
        }
      }

      unRenderActions() {
        var fas = this.TFormActions;
        if (fas) {
          var actionsContainerFinder = this.props.actionsContainerFinder || this.defaultActionsContainerFinder;
          var div = actionsContainerFinder();
          if (div != null) {
            var unmount = ReactDOM.unmountComponentAtNode(div);
            if (!unmount) {
              throw new Error("unmount failed");
            }
          } else {
            throw new Error("TFormActions not null, but div is null");
          }
        }
        this.TFormActions = null;
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

      doDelete() {
        function deleteTFormHandler(tform) {
          var handlers = _.without(_.flatten([tform.handlers.deleteFormHandlers]), null, undefined);
          var tformHandler = LeadingExecutor(new TFormHandler(), handlers);
          return tformHandler;
        }

        var tform = this;
        var isMain = tform.props.isMain;
        var entity = tform.state.entity;
        var csrf = tform.state.csrf;
        var entityContext = tform.state.entityContext;
        var idObj = entityContext.getStandardIdObject(entity.bean);
        var uri = new UriTemplate(tform.state.links.delete).fill(idObj);
        var queryUri = tform.state.links.query;

        var delOpts = {
          url: uri,
          csrf: csrf,
          type: entityContext.type,
          ceilingType: entityContext.ceilingType,
        };

        var formRequestHandler = TFormRequestHandler(tform, deleteTFormHandler(tform));

        require([EntityModalSpecsPath], function (EMSpecs) {
          class DeleteSpec extends EMSpecs.Delete {
          }

          var ms = ModalStack.getPageStack();
          ms.pushModalSpec(new DeleteSpec(delOpts).pushHandlers({
            deleteRequestHandlers: [formRequestHandler, tform.handlers.deleteRequestHandlers]
          }));
        });
      }

      doSubmit() {
        function submitTFormHandler(tform) {
          var handlers = _.without(_.flatten([tform.handlers.submitFormHandlers]), null, undefined);
          handlers = ((handlers.length > 0) ? handlers : [TForm.defaultSubmitFormHandler]);
          var tformHandler = LeadingExecutor(new TFormHandler(), handlers);
          return tformHandler;
        }

        var tform = this;
        var formdata = tform.formData(true);
        var currentAction = tform.state.currentAction;
        var links = tform.state.links;
        var uri = "";
        var method;
        switch (currentAction) {
          case "create":
            uri = links.self;
            method = 'create';
            break;
          case "update":
          case "read":
            uri = links.self;
            method = 'update';
            break;
          default:
            throw new Error("TForm submit action not supported");
        }

        var loadingHandler = {
          onWillRequest: function () {
            tform.setState({loading: true});
          },
          onResultWillProcess: function () {
            tform.setState({loading: false});
          }
        }
        var submitParam = {url: uri, entityData: formdata};
        var tformHandler = submitTFormHandler(tform);
        var formRequestHandler = TFormRequestHandler(tform, tformHandler);
        EntityRequest[method](submitParam, null, loadingHandler, formRequestHandler,
          tform.handlers.submitRequestHandlers);
      }

      onEventTFormSubmit(event) {
        var _this = event.data;
        _this.doSubmit();

        event.preventDefault();
      }
    }
    _.extend(TForm, TFormStatics);

    function renderForm(beanResult, div, isMain) {
      var handlers = {
        submitFormHandlers: [SubmitTFormHandlers.UpdateOnFail, SubmitTFormHandlers.RedirectOnSuccess],
          submitRequestHandlers: null,
        deleteFormHandlers: [DeleteTFormHandlers.RedirectOnSuccess],
      }

      var formEle = <TForm isMain={isMain} handlers={handlers}/>;
      var tform = ReactDOM.render(formEle, div);

      tform.updateStateBy(beanResult);
    }

    exports.TForm = TForm;
    exports.TFormRequestHandler = TFormRequestHandler;
    exports.SubmitTFormHandlers = SubmitTFormHandlers;
    exports.renderForm = renderForm;
  });