define(
  function(require, exports, module){

    var $ = require('jquery');
    var _ = require('underscore');
    var BS = require('bootstrap');
    var modal = require('jsx!./modal');
    var basic = require('basic');
    var commonText = require('i18n!nls/commonText');
    var entityText = require('i18n!nls/entityText');
    var EntityRequest = require('entity-request');

    var React = require('react');
    var ReactDOM = require('react-dom');

    var TFormComp = require('jsx!./tform');
    var TGridComp = require('jsx!./tgrid');

    var ModalSpecBase = modal.ModalSpecBase;

    var ModalContents = modal.Contents;
    var ModalContent = modal.Contents.ModalContent;

    class CreateSpec extends ModalSpecBase {
      constructor(options){
        var opts = _.extend({}, options);

        super(opts);
      }
      defaultOptions(){
        return {
          url: '',
          createGetExtraHandler:{
            onSuccess : null,
            onFail : null,
            onError : null,
          }
        };
      }
      firstContent(){
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
            var extraHandler = specOptions.createGetExtraHandler
            class CreateGetHandler extends EntityRequest.CreateGetHandler {
              onSuccess(data, opts) {
                var response = data.data;
                _spec.updateContent(_spec.viewEntityContent(response));
                if(extraHandler.onSuccess){
                  extraHandler.onSuccess();
                }
              }
              onFail(data, opts) {
                if(extraHandler.onFail){
                  extraHandler.onFail();
                }
              }
              onError() {
                if(extraHandler.onError){
                  extraHandler.onError();
                }
              }
            }
            EntityRequest.createGet(readParam, new CreateGetHandler());
          }
        }
        return new LoadingEntityContent();
      }
      viewEntityContent(response){
        var _spec = this;
        class ViewEntityContent extends ModalContents.ModalContent {
          constructor(options) {
            super(options);
          }
          getTitle(){
            var action = response.action;
            var name = response.entity.bean.name;
            var friendlyType = response.infos.form.friendlyName;
            var friendlyAction = entityText.ActionOnType(action, friendlyType);
            return friendlyAction;
          }
          getBody(){
            var tForm = TFormComp.TForm;
            var modal = this.modal;
            var actionsContainerFinder = function () {
              var div = modal.refs.tActionsContainer;
              return div;
            };
            var ele = React.createElement(tForm, {ref:"tForm", actionsContainerFinder:actionsContainerFinder});
            return ele;
          }
          getFooter(){
            return <div ref="tActionsContainer"/>;
          }
          onShown(modal, spec){
            var tform = modal.refs.tForm;
            var TForm = TFormComp.TForm;
            TForm.updateStateBy(tform, response, true);
          }
        }
        return new ViewEntityContent();
      }
    }

    class ReadSpec extends ModalSpecBase{
      constructor(options){
        super(options);
      }
      defaultOptions(){
        return {
          url : '',
          readExtraHandler:{
            onSuccess : null,
            onFail : null,
            onError : null,
          }
        };
      }
      firstContent(){
        return this.loadingContent();
      }
      loadingContent(){
        var _spec = this;
        class LoadingEntityContent extends ModalContents.ProcessingContent{
          constructor(){
            super({
              titleText:commonText.loading,
              bodyText:commonText.loading
            });
          }
          getFooter(){
            return this.getGenericFooter(false, false, false);;
          }
          onShown(modal, spec){
            var specOptions = _spec.options;
            var readParam ={
              url : specOptions.url,
            }
            var extraHandler = specOptions.readExtraHandler;
            class ReadHandler extends EntityRequest.ReadHandler{
              onSuccess(data, opts) {
                var response = data.data;
                _spec.updateContent(_spec.viewEntityContent(response));
                if(extraHandler.onSuccess){
                  extraHandler.onSuccess();
                }
              }
              onFail(data, opts) {
                if(extraHandler.onFail){
                  extraHandler.onFail();
                }
              }
              onError() {
                if(extraHandler.onError){
                  extraHandler.onError();
                }
              }
            }
            EntityRequest.read(readParam, new ReadHandler());
          }
        }
        return new LoadingEntityContent();
      }
      viewEntityContent(response){
        var _spec = this;
        class ViewEntityContent extends ModalContents.ModalContent {
          constructor(options) {
            super(options);
          }
          getTitle(){
            var action = response.action;
            var name = response.entity.bean.name;
            var friendlyType = response.infos.form.friendlyName;
            var friendlyAction = entityText.ActionOnType(action, friendlyType);
            return friendlyAction;
          }
          getBody(){
            var tForm = TFormComp.TForm;
            var modal = this.modal;
            var actionsContainerFinder = function () {
              var div = modal.refs.tActionsContainer;
              return div;
            };
            var ele = React.createElement(tForm, {ref:"tForm", actionsContainerFinder:actionsContainerFinder});
            return ele;
          }
          getFooter(){
            return <div ref="tActionsContainer"/>;
          }
          onShown(modal, spec){
            var tform = modal.refs.tForm;
            var TForm = TFormComp.TForm;
            TForm.updateStateBy(tform, response, true);
          }
        }
        return new ViewEntityContent();
      }

    }

    class DeleteSpec extends ModalSpecBase {
      constructor(options){
        var opts = _.extend({}, options);
        opts.csrf = opts._csrf || opts.csrf;
        delete opts._csrf;
        super(opts);
      }
      defaultOptions(){
        return {
          url: '',
          csrf: undefined,
          type: undefined,
          ceilingType: undefined,
          deleteExtraHandler:{
            onSuccess : null,
            onFail : null,
            onError : null,
          }
        };
      }
      firstContent(){
        return this.deleteConfirmContent();
      }
      deleteConfirmContent(){
        var _spec = this;
        class DeleteConfirmContent extends ModalContents.MessageContent{
          constructor(){
            super({
              titleText:commonText.delete,
              bodyText:commonText.deleteConfirm
            });
          }
          getFooter(){
            return this.getGenericFooter(true, true, false);;
          }
          onPositiveButtonClick(){
            _spec.updateContent(_spec.processingContent());
          }
        }
        return new DeleteConfirmContent();
      }
      processingContent(){
        var _spec = this;
        class DeletingContent extends ModalContents.ProcessingContent{
          constructor(){
            super({
              titleText:commonText.delete,
              bodyText:commonText.deleting
            });
          }
          getFooter(){
            return this.getGenericFooter(false, false, false);;
          }
          onShown(modal, spec){
            var specOptions = _spec.options;
            var delParam = {
              url : specOptions.url,
              csrf : specOptions.csrf,
              type: specOptions.type,
              ceilingType: specOptions.ceilingType,
              successRedirect:specOptions.successRedirect
            };
            var extraHandler = specOptions.deleteExtraHandler;
            class DelHandler extends EntityRequest.DeleteHandler {
              onSuccess (data, opts){
                if(extraHandler.onSuccess){
                  extraHandler.onSuccess();
                }
                modal.hide();
              }
              onFail (data, opts){
                var errors = (data.data)? data.data.errors : null;
                if(errors)
                  errors = errors.global;
                var deleteErrorOption ={
                  titleText:commonText.error,
                  bodyText: errors
                };
                _spec.updateContent(_spec.deleteErrorContent(deleteErrorOption));

                if(extraHandler.onFail){
                  extraHandler.onFail();
                }
              }
              onError (){
                if(extraHandler.onError){
                  extraHandler.onError();
                }
              }
            }
            EntityRequest.delete(delParam, new DelHandler() );
          }
        }
        return new DeletingContent();
      }
      deleteErrorContent(opts){
        return new ModalContents.MessageContent(opts);
      }
    }

    exports.Create = CreateSpec;
    exports.Read = ReadSpec;
    exports.Delete = DeleteSpec;

  });