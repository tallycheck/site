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
    var LeadingExecutor = HandlerUtils.leadingExecutor;
    var BatchExecutor = HandlerUtils.batchExecutor;
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

    class ReadFailContent extends ModalContents.MessageContent {
      constructor(options, response) {
        var opts = _.extend({}, {titleText: EntityMsg.readFailed}, options, { response: response});
        super(opts);
      }

      getBody() {
        var response = this.options.response;
        var errors = response.errors.global;
        var eEles = _.map(errors, function (error, i) {
          return <span key={i} className="modal-error">{error}</span>
        });
        return (<div className="message">
          {eEles}
        </div>);
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

          onShown(modal, spec) {
            var options = _spec.options;
            var readParam = {
              url: options.url,
            };
            var navContentRequestHandler = {
              onSuccess: function (data, param) {
                var response = data.data;
                _spec.updateContent(_spec.createEditContent(response));
              }
            };
            var requestHandler = LeadingExecutor(new EntityRequest.RequestHandler(),
              options.createGetRequestHandlers, navContentRequestHandler);

            EntityRequest.createGet(readParam, null, requestHandler);
          }
        }
        return new LoadingEntityContent();
      }

      createEditContent(response) {
        var _spec = this;
        class EditEntityContent extends ViewEntityContentBase {
          constructor(options) {
            super(options, response);
          }

          getBody() {
            var TForm = TFormComp.TForm;
            var modal = this.modal;
            var handlers = _spec.handlers;
            var actionsContainerFinder = this.actionsContainerFinder();

            var modalHandler = LeadingExecutor(new ModalHandler(),
              handlers.createSubmitModalHandlers);
            var createSubmitModalRequestHandler = ModalRequestHandler(modal, modalHandler);

            var ele = React.createElement(TForm, {
              ref: "tForm",
              actionsContainerFinder: actionsContainerFinder,
              handlers :{
                submitFormHandlers: handlers.createSubmitFormHandlers,
                submitRequestHandlers: [handlers.createSubmitRequestHandlers, createSubmitModalRequestHandler],
              }
            });
            return ele;
          }
        }
        return new EditEntityContent();
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

          onShown(modal, spec) {
            var options = _spec.options;
            var handlers = _spec.handlers;
            var readParam = {
              url: options.url,
            }
            var navContentRequestHandler = {
              onSuccess: function (data, param) {
                var response = data.data;
                _spec.updateContent(_spec.readContent(response));
              },
              onFail: function (data, param) {
                var response = data.data;
                _spec.updateContent(_spec.readFailContent(response));
              }
            };
            var requestHandler = LeadingExecutor(new EntityRequest.RequestHandler(),
              handlers.readRequestHandlers, navContentRequestHandler);

            EntityRequest.read(readParam, null, requestHandler);
          }
        }
        return new LoadingEntityContent();
      }

      readContent(response) {
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

            var submitModalHandler = LeadingExecutor(new ModalHandler(),
              _spec.handlers.updateSubmitModalHandlers);
            var updateSubmitModalRequestHandler = ModalRequestHandler(modal, submitModalHandler);

            var deleteModalHandler = LeadingExecutor(new ModalHandler(), handlers.deleteModalHandlers);
            var deleteModalRequestHandler = ModalRequestHandler(modal, deleteModalHandler);

            var ele = React.createElement(TForm, {
              ref: "tForm",
              actionsContainerFinder: actionsContainerFinder,
              handlers : {
                submitFormHandlers: handlers.updateSubmitFormHandlers,
                submitRequestHandlers: [handlers.updateSubmitRequestHandlers, updateSubmitModalRequestHandler],
                deleteRequestHandlers: [deleteModalRequestHandler, handlers.deleteRequestHandlers],
              }
            });
            return ele;
          }
        }
        return new ViewEntityContent();
      }

      readFailContent(response) {
        return new ReadFailContent({}, response);
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

          onShown(modal, spec) {
            var options = _spec.options;
            var delParam = {
              url: options.url,
              csrf: options.csrf,
              type: options.type,
              ceilingType: options.ceilingType,
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

    class QuerySpec extends ModalSpecBase {
      constructor(options, handlers) {
        super(options, handlers);
      }

      defaultOptions() {
        return {
          url: '',
          contentTitle : ''
        }
      }

      defaultHandlers() {
        return {
          queryRequestHandlers: undefined,
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

          onShown(modal, spec) {
            var options = _spec.options;
            var handlers = _spec.handlers;
            var queryParam = {
              url: options.url,
            }
            var navContentRequestHandler = {
              onSuccess: function (data, param) {
                var response = data.data;
                _spec.updateContent(_spec.queryContent(response));
              },
              onFail: function (data, param) {
                var response = data.data;
                _spec.updateContent(_spec.queryFailContent(response));
              }
            };
            var requestHandler = LeadingExecutor(new EntityRequest.RequestHandler(),
              handlers.queryRequestHandlers, navContentRequestHandler);

            EntityRequest.query(queryParam, null, requestHandler);
          }
        }
        return new LoadingEntityContent();
      }

      queryContent(response) {
        var _spec = this;
        class ListEntityContent extends ModalContents.ModalContent {
          constructor(options) {
            var opts = _.extend({}, options, {response: response});
            super(opts);
          }
          getTitle() {
            var options = _spec.options;
            return options.contentTitle;
          }
          getBody() {
            var TGrid = TGridComp.TGrid;
            var modal = this.modal;
            var handlers = _spec.handlers;

            var ele = React.createElement(TGrid, {
              ref: "tGrid",
              handlers : {
              }
            });
            return ele;
          }

          getFooter() {
            return this.getGenericFooter(false, false, true);
          }

          onShown(modal, spec) {
            var tgrid = modal.refs.tGrid;
            var response = this.options.response;
            tgrid.updateStateBy(response, true);
          }
        }
        return new ListEntityContent();
      }

      queryFailContent(response) {
        class QueryFailContent extends ModalContents.MessageContent {
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
        return new QueryFailContent();
      }
    }

    class FieldSelectSpec extends QuerySpec{
      constructor(options, handlers) {
        super(options, handlers);
        this.options.contentTitle = EntityMsg.SelectField(this.options.fieldName);
      }

      defaultOptions() {
        return {
          url: '',
          fieldName : ''
        }
      }

      defaultHandlers() {
        var modalActionHandlersSample = {
          onSelectDone:function(modal, tgrid){},
          onRecordDoubleClick:function(modal, tgrid, bean){}
        }
        return _.extend({}, super.defaultHandlers(), {
          actionsHandlers : undefined,
          modalActionHandlers : undefined,
        });
      }

      queryContent(response) {
        var _spec = this;
        class ListEntityContent extends ModalContents.ModalContent {
          constructor(options) {
            var opts = _.extend({}, options, {response: response});
            super(opts);
          }
          getTitle() {
            var options = _spec.options;
            return options.contentTitle;
          }
          getBody() {
            var TGrid = TGridComp.TGrid;
            var modal = this.modal;
            var handlers = _spec.handlers;

            var selectedIndexChangeHandler = {
              onSelectedIndexWillChange: null, //function(oldIndex, newIndex, oldBean, newBean)
              onSelectedIndexChanged: function(oldIndex, newIndex, oldBean, newBean){
                modal.setState({chosen: newBean});
              },
              onDoubleClick:function(rowIndex, rowBean){
                var tgrid = modal.refs.tGrid;
                var modalActionHandler = BatchExecutor(handlers.modalActionHandlers);
                modalActionHandler.onRecordDoubleClick(modal, tgrid, rowBean);
              }
            }

            var ele = React.createElement(TGrid, {
              ref: "tGrid",
              handlers : {
                actionsHandlers : [handlers.actionsHandlers, selectedIndexChangeHandler]
              }
            });
            return ele;
          }

          onSelectButtonClick(){
            var modal = this.modal;
            var tgrid = modal.refs.tGrid;
            var handlers = _spec.handlers;
            var modalActionHandler = BatchExecutor(handlers.modalActionHandlers);
            modalActionHandler.onSelectDone(modal, tgrid);
            modal.hide();
          }

          getFooter() {
            var noneChosen = (null == this.modal.state.chosen );
            var selectBtn =
              <button type="button" className="btn btn-default " onClick={this.onSelectButtonClick.bind(this)} disabled={noneChosen}>
                <span className="fa fa-check" aria-hidden="true"></span>
                {CommonMsg.select}</button> ;
            var cancelBtn =
              <button type="button" className="btn btn-default btn-close" data-dismiss="modal">
                {CommonMsg.cancel}</button> ;
            return (<div>
              {selectBtn}
              {cancelBtn}
            </div>);
          }

          onShown(modal, spec) {
            var tgrid = modal.refs.tGrid;
            var response = this.options.response;
            tgrid.updateStateBy(response, true);
          }
        }
        return new ListEntityContent();
      }
    }

    exports.Create = CreateSpec;
    exports.Read = ReadSpec;
    exports.Delete = DeleteSpec;
    exports.Query = QuerySpec;
    exports.FieldSelect = FieldSelectSpec;
  });