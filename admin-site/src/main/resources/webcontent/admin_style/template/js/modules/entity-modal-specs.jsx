define(["jquery","underscore",
    "bootstrap",
    "jsx!./modal",
    "ajax",
    "messages-dict", "i18n!nls/entitytext"],
  function($, _,
           BS, modal,
           ajax,
           Msgs, entitytext){
    var React = require('react');
    var ReactDOM = require('react-dom');

    var ModalSpecBase = modal.ModalSpecBase;

    var ModalContents = modal.Contents;
    var ModalContent = modal.Contents.ModalContent;

    class DeleteSpec extends ModalSpecBase {
      constructor(options){
        super(options);
      }
      defaultOptions(){
        return {
          url : '',
          data : {}
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
              titleText:Msgs.delete,
              bodyText:Msgs.deleteConfirm
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
              titleText:Msgs.delete,
              bodyText:Msgs.deleting
            });
          }
          getFooter(){
            return this.getGenericFooter(false, false, false);;
          }
          onShown(modal, spec){
            var specOptions = _spec.options;
            var ajaxOptions = {
              url : specOptions.url,
              type : "post",
              data : specOptions.data,
              success : function(data, textStatus, jqXHR, opts){
                if(typeof data == "object"){
                  var operation = data.operation;
                  if(operation == 'redirect'){
                    _spec.onDeleteSuccess(data, opts);
                    modal.hide();
                  }else{
                    var errors = (data.data)? data.data.errors : null;
                    if(errors)
                      errors = errors.global;
                    var deleteErrorOption ={
                      titleText:Msgs.error,
                      bodyText: errors
                    };
                    _spec.updateContent(_spec.deleteErrorContent(deleteErrorOption));

                    _spec.onDeleteFail(data, opts);
                  }
                }
              },
              error:function(){
                _spec.onDeleteError();
              }
            };
            ajax(ajaxOptions);
          }
        }
        return new DeletingContent();
      }
      deleteErrorContent(opts){
        return new ModalContents.MessageContent(opts);
      }
      onDeleteSuccess(data, ajaxOptions){
        console.log('todo: Handle deleting success');
      }
      onDeleteFail(data, ajaxOptions){
        console.log('todo: Handle deleting failure');
      }
      onDeleteError(){
        console.log('todo: Handle deleting error');
      }
    }

    return {
      Delete : DeleteSpec
    }

  });