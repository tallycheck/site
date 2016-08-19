'use strict';

define(
  function(require, exports, module) {

    var $ = require('jquery');
    var _ = require('underscore');
    var BS = require('bootstrap');
    var modal = require('jsx!./modal');
    var toastr = require('toastr');
    var basic = require('basic');
    var CommonMsg = require('i18n!./nls/common');
    var EntityMsg = require('i18n!./nls/entity');
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

    class ViewEntityContentBase extends ModalContents.ModalContent {
      constructor(options, response) {
        var opts = _.extend({}, options, {response: response});
        super(opts);
      }

      actionsContainerFinder() {
        function func(_this) {
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
        var friendlyAction = EntityMsg.ActionOnType(action, friendlyType);
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
      constructor(options, handlers) {
        super(options, handlers);
      }

      defaultOptions() {
        return {
          url: '',
        };
      }

      defaultHandlers() {
        var TForm = TFormComp.TForm;
        return {
          createGetRequestHandlers: undefined,
          createSubmitFormHandlers: [TForm.defaultSubmitFormHandler],
          createSubmitModalHandlers: undefined,
          createSubmitRequestHandlers: undefined,
        };
      }

      entryContent() {
        return this.loadingContent();
      }

      loadingContent() {
        var _spec = this;
        class LoadingEntityContent extends ModalContents.ProcessingContent {
          constructor() {
            super({
              titleText: CommonMsg.loading,
              bodyText: CommonMsg.loading
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
            var navContentRequestHandler = {
              onSuccess: function (data, param) {
                var response = data.data;
                _spec.updateContent(_spec.viewEntityContent(response));
              }
            };
            var requestHandler = HandlerExecutor(new EntityRequest.RequestHandler(),
              specOptions.createGetRequestHandlers, navContentRequestHandler);

            EntityRequest.createGet(readParam, null, requestHandler);
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
            var handlers = _spec.handlers;
            var actionsContainerFinder = this.actionsContainerFinder();

            var modalHandler = HandlerExecutor(new ModalHandler(),
              _spec.handlers.createSubmitModalHandlers);
            var createSubmitModalRequestHandler = ModalRequestHandler(modal, modalHandler);

            var ele = React.createElement(TForm, {
              ref: "tForm",
              actionsContainerFinder: actionsContainerFinder,

              submitFormHandlers: handlers.createSubmitFormHandlers,
              submitRequestHandlers: [handlers.createSubmitRequestHandlers, createSubmitModalRequestHandler],
            });
            return ele;
          }
        }
        return new ViewEntityContent();
      }
    }

    class ReadSpec extends ModalSpecBase {
      constructor(options, handlers) {
        super(options, handlers);
      }

      defaultOptions() {
        return {
          url: '',
        }
      }

      defaultHandlers() {
        var TForm = TFormComp.TForm;
        return {
          readRequestHandlers: undefined,
          updateSubmitFormHandlers: [TForm.defaultSubmitFormHandler],
          updateSubmitModalHandlers: undefined,
          updateSubmitRequestHandlers: undefined,
          deleteModalHandlers: undefined,
          deleteRequestHandlers: undefined,
        };
      }

      entryContent() {
        return this.loadingContent();
      }

      loadingContent() {
        var _spec = this;
        class LoadingEntityContent extends ModalContents.ProcessingContent {
          constructor() {
            super({
              titleText: CommonMsg.loading,
              bodyText: CommonMsg.loading
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
            var navContentRequestHandler = {
              onSuccess: function (data, param) {
                var response = data.data;
                _spec.updateContent(_spec.viewEntityContent(response));
              },
              onFail: function (data, param) {
                var response = data.data;
                _spec.updateContent(_spec.viewReadFailContent(response));
              }
            };
            var requestHandler = HandlerExecutor(new EntityRequest.RequestHandler(),
              specOptions.readRequestHandlers, navContentRequestHandler);

            EntityRequest.read(readParam, null, requestHandler);
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
            var handlers = _spec.handlers;
            var actionsContainerFinder = this.actionsContainerFinder();

            var submitModalHandler = HandlerExecutor(new ModalHandler(),
              _spec.handlers.updateSubmitModalHandlers);
            var updateSubmitModalRequestHandler = ModalRequestHandler(modal, submitModalHandler);

            var deleteModalHandler = HandlerExecutor(new ModalHandler(), handlers.deleteModalHandlers);
            var deleteModalRequestHandler = ModalRequestHandler(modal, deleteModalHandler);

            var ele = React.createElement(TForm, {
              ref: "tForm",
              actionsContainerFinder: actionsContainerFinder,

              submitFormHandlers: handlers.updateSubmitFormHandlers,
              submitRequestHandlers: [handlers.updateSubmitRequestHandlers, updateSubmitModalRequestHandler],
              deleteRequestHandlers: [deleteModalRequestHandler, handlers.deleteRequestHandlers],
            });
            return ele;
          }
        }
        return new ViewEntityContent();
      }

      viewReadFailContent(response) {
        class ReadFailContent extends ModalContents.MessageContent {
          constructor() {
            super({
              titleText: EntityMsg.readFailed
            });
          }

          getBody() {
            var errors = response.errors.global;
            var eEles = _.map(errors, function (error, i) {
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
        };
      }

      defaultHandlers() {
        return {
          deleteRequestHandlers: undefined
        }
      }

      entryContent() {
        return this.deleteConfirmContent();
      }

      deleteConfirmContent() {
        var _spec = this;
        class DeleteConfirmContent extends ModalContents.MessageContent {
          constructor() {
            super({
              titleText: CommonMsg.delete,
              bodyText: CommonMsg.deleteConfirm
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
              titleText: CommonMsg.delete,
              bodyText: CommonMsg.deleting
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
            };
            var handlers = _spec.handlers;
            var modalRequestHandler = null;//ModalRequestHandler(modal, modalHandler);
            var reactOnResponse = {
              onSuccess: function (data, opts) {
                modal.hide();
              },
              onFail: function (data, opts) {
                var errors = (data.data) ? data.data.errors : null;
                if (errors)
                  errors = errors.global;
                var deleteErrorOption = {
                  titleText: CommonMsg.error,
                  bodyText: errors
                };
                _spec.updateContent(_spec.deleteErrorContent(deleteErrorOption));
              }
            }
            EntityRequest.delete(delParam, null, [modalRequestHandler, reactOnResponse, handlers.deleteRequestHandlers]);
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