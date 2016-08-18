'use strict';

define(
  function(require, exports, module) {

    var $ = require('jquery');
    var _ = require('underscore');
    var BS = require('bootstrap');
    var modal = require('jsx!./modal');
    var toastr = require('toastr');
    var basic = require('basic');
    var commonText = require('i18n!nls/commonText');
    var entityText = require('i18n!nls/entityText');
    var EntityRequest = require('entity-request');
    var HandlerUtils = require('handler-utils');
    var HandlerExecutor = HandlerUtils.handlerExecutor;
    var ModalHandlersComp = require('./modal-handlers');

    var React = require('react');
    var ReactDOM = require('react-dom');

    var TFormComp = require('jsx!./tform');
    var TGridComp = require('jsx!./tgrid');

    var ModalSpecBase = modal.ModalSpecBase;

    var ModalContents = modal.Contents;
    var ModalContent = modal.Contents.ModalContent;
    var ModalHandler = ModalHandlersComp.ModalHandler;
    var ModalRequestHandler = ModalHandlersComp.ModalRequestHandler;
    var ModalHandlers = ModalHandlersComp.ModalHandlers;

    var ModalHanderProxyHandler = {
      get: function(target, name){
        var modal = target.modal;
        var main = target.main;
        var extra = target.extra;
        var mainFunc = main[name];
        var extraFunc = extra[name];
        if(_.isFunction(mainFunc) && _.isFunction(extraFunc)){
          return function(){
            var caller = arguments.caller;
            var ret = mainFunc.apply(caller, arguments);
            var margs = [modal].concat(arguments);
            extraFunc.apply(caller, margs);
            return ret;
          }
        }
        return mainFunc;
      }
    };

    var EmptyRequestHandler = { //compatible with RequestHandler
      onSuccess: function (data, param) {},
      onFail: function (data, param) {},
      onError: function () {},
      onComplete: function () {}
    }

    class ViewEntityContentBase extends ModalContents.ModalContent{
      constructor(options, response) {
        var opts = _.extend({}, options, {response : response});
        super(opts);
      }

      actionsContainerFinder () {
        function func(_this){
          var modal = this.modal;
          var div = modal.refs.tActionsContainer;
          return div;
        }
        return _.bind(func, this);
      }

      getTitle() {
        var response = this.options.response;
        var action = response.action;
        var name = response.entity.bean.name;
        var friendlyType = response.infos.form.friendlyName;
        var friendlyAction = entityText.ActionOnType(action, friendlyType);
        return friendlyAction;
      }

      getFooter() {
        return <div ref="tActionsContainer"/>;
      }

      onShown(modal, spec) {
        var tform = modal.refs.tForm;
        var response = this.options.response;
        tform.updateStateBy(response, true);
      }
    }

    class CreateSpec extends ModalSpecBase {
      constructor(options) {
        var opts = _.extend({}, options);
        var TForm = TFormComp.TForm;
        opts.createSubmitHandler = _.extend({},
          TForm.defaultSubmitHandler,
          options.createSubmitHandler);
        super(opts);
      }

      defaultOptions() {
        return {
          url: '',
          createGetExtraHandler: { //compatible with RequestHandler
            //onSuccess: function (data, param) {},
            //onFail: function (data, param) {},
            //onError: function () {},
            //onComplete: function () {}
          },
          //refer to TFormSubmitHandler
          createSubmitHandler: {
            //onSuccess(tform, response)
            //onFail(tform, response)
            //onError(tform)
            //onComplete(tform)
          },
          createSubmitModalHandler: {
            //onSuccess(modal, tform, response)
            //onFail(modal, tform, response)
            //onError(modal, tform)
            //onComplete(modal, tform)
          },
        };
      }

      firstContent() {
        return this.loadingContent();
      }

      loadingContent() {
        var _spec = this;
        class LoadingEntityContent extends ModalContents.ProcessingContent {
          constructor() {
            super({
              titleText: commonText.loading,
              bodyText: commonText.loading
            });
          }

          getFooter() {
            return this.getGenericFooter(false, false, false);
          }

          onShown(modal, spec) {
            var specOptions = _spec.options;
            var readParam = {
              url: specOptions.url,
            };
            var extraHandler = _.extend({}, EmptyRequestHandler, specOptions.createGetExtraHandler);
            class CreateGetHandler extends EntityRequest.CreateGetHandler {
              onSuccess(data, param) {
                var response = data.data;
                _spec.updateContent(_spec.viewEntityContent(response));
                extraHandler.onSuccess(data, param);
              }

              onFail(data, param) {
                extraHandler.onFail(data, param);
              }

              onError() {
                extraHandler.onError();
              }

              onComplete() {
                extraHandler.onComplete();
              }
            }
            EntityRequest.createGet(readParam, new CreateGetHandler());
          }
        }
        return new LoadingEntityContent();
      }

      viewEntityContent(response) {
        var _spec = this;
        class ViewEntityContent extends ViewEntityContentBase {
          constructor(options) {
            super(options, response);
          }

          getBody() {
            var TForm = TFormComp.TForm;
            var modal = this.modal;
            var actionsContainerFinder = this.actionsContainerFinder();
            var formCreateSubmitHandler = _spec.options.createSubmitHandler;
            var specCreateSubmitModalHandler = _spec.options.createSubmitModalHandler;
            var wrapped = {
              modal : modal,
              main :  formCreateSubmitHandler,
              extra :  specCreateSubmitModalHandler
            }
            var submitHandler = new Proxy(wrapped, ModalHanderProxyHandler);

            var ele = React.createElement(TForm, {
              ref: "tForm",
              actionsContainerFinder: actionsContainerFinder,
              submitHandler: submitHandler
            });
            return ele;
          }
        }
        return new ViewEntityContent();
      }
    }

    class ReadSpec extends ModalSpecBase {
      constructor(options) {
        var opts = _.extend({}, options);
        var TForm = TFormComp.TForm;
        opts.updateSubmitHandler = _.extend({},
          TForm.defaultSubmitHandler,
          options.updateSubmitHandler);
        super(opts);
      }

      defaultOptions() {
        return {
          url: '',
          readExtraHandler: { //compatible with RequestHandler
            //onSuccess: function (data, param) {},
            //onFail: function (data, param) {},
            //onError: function () {},
            //onComplete: function () {}
          },
          //refer to TFormSubmitHandler
          updateSubmitHandler: {
            //onSuccess(tform, response)
            //onFail(tform, response)
            //onError(tform)
            //onComplete(tform)
          },
          updateSubmitModalHandler: {
            //onSuccess(modal, tform, response)
            //onFail(modal, tform, response)
            //onError(modal, tform)
            //onComplete(modal, tform)
          },
        };
      }

      firstContent() {
        return this.loadingContent();
      }

      loadingContent() {
        var _spec = this;
        class LoadingEntityContent extends ModalContents.ProcessingContent {
          constructor() {
            super({
              titleText: commonText.loading,
              bodyText: commonText.loading
            });
          }

          getFooter() {
            return this.getGenericFooter(false, false, false);
          }

          onShown(modal, spec) {
            var specOptions = _spec.options;
            var readParam = {
              url: specOptions.url,
            }
            var extraHandler = _.extend({}, EmptyRequestHandler, specOptions.readExtraHandler);
            class ReadHandler extends EntityRequest.ReadHandler {
              onSuccess(data, param) {
                var response = data.data;
                _spec.updateContent(_spec.viewEntityContent(response));
                extraHandler.onSuccess(data, param);
              }

              onFail(data, param) {
                var response = data.data;
                _spec.updateContent(_spec.viewReadFailContent(response));
                extraHandler.onFail(data, param);
              }

              onError() {
                extraHandler.onError();
              }

              onComplete() {
                extraHandler.onComplete();
              }
            }
            EntityRequest.read(readParam, new ReadHandler());
          }
        }
        return new LoadingEntityContent();
      }
      viewEntityContent(response) {
        var _spec = this;
        class ViewEntityContent extends ViewEntityContentBase {
          constructor(options) {
            super(options, response);
          }

          getBody() {
            var TForm = TFormComp.TForm;
            var modal = this.modal;
            var actionsContainerFinder = this.actionsContainerFinder();
            var formUpdateSubmitHandler = _spec.options.updateSubmitHandler;
            var specUpdateSubmitModalHandler = _spec.options.updateSubmitModalHandler;
            var wrapped = {
              modal : modal,
              main :  formUpdateSubmitHandler,
              extra :  specUpdateSubmitModalHandler
            }
            var submitHandler = new Proxy(wrapped, ModalHanderProxyHandler);

            var ele = React.createElement(TForm, {
              ref: "tForm",
              actionsContainerFinder: actionsContainerFinder,
              submitHandler: submitHandler
            });
            return ele;
          }
        }
        return new ViewEntityContent();
      }
      viewReadFailContent(response){
        class ReadFailContent extends ModalContents.MessageContent {
          constructor() {
            super({
              titleText: entityText.readFailed
            });
          }

          getBody() {
            var errors = response.errors.global;
            var eEles = _.map(errors, function(error, i){
              return <span key={i} className="modal-error">{error}</span>
            });
            return (<div className="message">
              {eEles}
            </div>);
          }

        }
        return new ReadFailContent();
      }
    }

    class DeleteSpec extends ModalSpecBase {
      constructor(options) {
        var opts = _.extend({}, options);
        opts.csrf = opts._csrf || opts.csrf;
        delete opts._csrf;
        super(opts);
      }

      defaultOptions() {
        return {
          url: '',
          csrf: undefined,
          type: undefined,
          ceilingType: undefined,
          deleteListener:undefined,
          deleteExtraHandler: undefined, //RequestHandler
        };
      }

      firstContent() {
        return this.deleteConfirmContent();
      }

      deleteConfirmContent() {
        var _spec = this;
        class DeleteConfirmContent extends ModalContents.MessageContent {
          constructor() {
            super({
              titleText: commonText.delete,
              bodyText: commonText.deleteConfirm
            });
          }

          getFooter() {
            return this.getGenericFooter(true, true, false);
          }

          onPositiveButtonClick() {
            _spec.updateContent(_spec.processingContent());
          }
        }
        return new DeleteConfirmContent();
      }

      processingContent() {
        var _spec = this;
        class DeletingContent extends ModalContents.ProcessingContent {
          constructor() {
            super({
              titleText: commonText.delete,
              bodyText: commonText.deleting
            });
          }

          getFooter() {
            return this.getGenericFooter(false, false, false);
          }

          onShown(modal, spec) {
            var specOptions = _spec.options;
            var delParam = {
              url: specOptions.url,
              csrf: specOptions.csrf,
              type: specOptions.type,
              ceilingType: specOptions.ceilingType,
              successRedirect: specOptions.successRedirect
            };
            var extraHandler = specOptions.deleteExtraHandler;
            var modalHandler = HandlerExecutor(new ModalHandler(), [extraHandler]);
            var modalRequestHandler = new ModalRequestHandler(modal, modalHandler);
            var reactOnResponse = {
              onSuccess : function(data, opts) {
                modal.hide();
              },
              onFail: function(data, opts) {
                var errors = (data.data) ? data.data.errors : null;
                if (errors)
                  errors = errors.global;
                var deleteErrorOption = {
                  titleText: commonText.error,
                  bodyText: errors
                };
                _spec.updateContent(_spec.deleteErrorContent(deleteErrorOption));
              }
            }
            EntityRequest.delete(delParam, null, [modalRequestHandler, reactOnResponse, specOptions.deleteListener]);
          }
        }
        return new DeletingContent();
      }

      deleteErrorContent(opts) {
        return new ModalContents.MessageContent(opts);
      }
    }

    exports.Create = CreateSpec;
    exports.Read = ReadSpec;
    exports.Delete = DeleteSpec;
  });