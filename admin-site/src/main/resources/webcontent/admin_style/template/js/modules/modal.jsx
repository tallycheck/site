/**
 * Created by gaoyuan on 8/1/16.
 */

define(["jquery","underscore",
    "bootstrap",
    "ajax",
    "messages-dict", "i18n!nls/entitytext"],
  function($, _,
           BS,
           ajax,
           Msgs, entitytext){
    var React = require('react');
    var ReactDOM = require('react-dom');

    class ModalContent {
      constructor(options){
        this.options = _.extend({}, this.defaultOptions(), options);
      }
      defaultOptions(){return {};}
      getTitle(){return '';}
      getBody(){return <p/>;}
      getFooter(){
        return this.getGenericFooter(false, false, true);
      }
      onShown(modal, spec){
        console.log("modal content shown.");
      }
      getGenericFooter(positive, negative, close){
        var posBtn = positive ?
          <button type="button" className="btn btn-default btn-positive" onClick={this.onPositiveButtonClick}>ok</button> : <span/>;
        var negBtn =negative ?
          <button type="button" className="btn btn-default btn-negative" onClick={this.onNegativeButtonClick} data-dismiss="modal">cancel</button> : <span/>;
        var closeBtn = close ?
          <button type="button" className="btn btn-default btn-close" data-dismiss="modal">close</button> : <span/>;
        var div =( <div>
          {posBtn}
          {negBtn}
          {closeBtn}
        </div>);
        return div;
      }
      onPositiveButtonClick(modal){}
      onNegativeButtonClick(modal){}
    }
    class BlankContent extends ModalContent{
    }
    class MessageContent extends ModalContent{
      constructor(options){
        super(options);
      }
      defaultOptions(){return {
        titleText:'Undefined Title',
        bodyText: 'Undefined Content'};
      }
      getTitle(){return this.options.titleText;}
      getBody(){
        var bt = this.options.bodyText;
        return (<div className="message">
          {bt}
        </div>);}
      getFooter(){
        return this.getGenericFooter(false, false, true);
      }
    }
    class ProcessingContent extends MessageContent {
      constructor(options){
        super(options);
      }
      defaultOptions() {
        return {
          titleText: Msgs.loading,
          bodyText: 'Undefined Loading Content'
        }
      }
      getBody() {
        var bt = this.options.bodyText;
        var bc = (<div>
          <p>{bt}</p>
          <div ref="progress" className="progress">
            <div className="progress-bar progress-bar-striped active" style={{width: "100%"}}></div>
          </div>
        </div>);
        return bc;
      }
      getFooter(){
        return this.getGenericFooter(false, false, false);;
      }
    }
    var Contents = {
      ModalContent:ModalContent,
      MessageContent:MessageContent,
      ProcessingContent:ProcessingContent
    };


    class ModalSpecBase {
      constructor(options){
        this.options = _.extend(this.defaultOptions(), options);
        this.content = this.firstContent();
        this.listenerRegistery = [];
      }
      defaultOptions(){
        return {};
      }
      updateContent(content){
        var oldContent = this.content;
        var spec = this;
        this.content = content;
        _.each(spec.listenerRegistery, function(listener){
          listener.onContentUpdated(spec ,oldContent, content);
        });
      }
      getContent(){
        return this.content;
      }
      firstContent(){
        return new ModalContent();
      }
      registerListener(listener){
        this.listenerRegistery.push(listener);
      }
      unregisterListener(listener){
        var oldReg = this.listenerRegistery;
        this.listenerRegistery = _.without(oldReg, listener);
      }
    }


    //Modal used to show ModalSpec
    var Modal = React.createClass({
      statics : {
        makeIsolatedUpdateContentListener: function (modal) {
          return {
            onContentUpdated: function (spec, oldContent, newContent) {
              modal.setContent(newContent);
            }
          };
        }
      },
      updateContentListener : undefined,
      getDefaultProps : function(){
        return {
          modalStack : null,
          isFirst : false,
          animate : false,
          spec : new ModalSpecBase()
        };
      },
      getInitialState : function(){
        var spec = this.props.spec;
        return {content : null};
      },
      setContent:function(content){
        this.setState({content : content});
      },
      componentDidMount : function(){
        var spec = this.props.spec;
        this.updateContentListener = Modal.makeIsolatedUpdateContentListener(this);
        spec.registerListener(this.updateContentListener);
        this.setState({content : spec.getContent()});
      },
      componentWillUnmount:function(){
        var spec = this.props.spec;
        spec.unregisterListener(this.updateContentListener);
      },
      shouldComponentUpdate:function(nextProps, nextState, nextContext){
        if(!_.isEqual(nextProps, this.props) ||
          !_.isEqual(nextState, this.state) ||
          !_.isEqual(nextContext, this.context)){
          return true;
        }
        return false;
      },
      componentDidUpdate : function(){
        var spec = this.props.spec;
        var modalStack = this.props.modalStack;
        var modal = ReactDOM.findDOMNode(this.refs.modalRoot);
        var $modal = $(modal);
        $modal.modal({
          backdrop : this.props.isFirst,
          keyboard : false
        });
        $modal.on('hide.bs.modal', function(event){
          var $ele = $(event.delegateTarget);
          modalStack.popModalSpec(spec);
        });
        var content = this.state.content;
        if(content == null) {
          this.hide();
        }else{
          content.onShown(this, spec);
        }
      },
      hide : function(){
        var modal = ReactDOM.findDOMNode(this.refs.modalRoot);
        var $modal = $(modal);
        $modal.modal('hide');
      },
      render :function(){
        var content = this.state.content;
        if(content == null) content=new BlankContent();
        var modalClassName = "modal " + (this.props.animate ? "fade" : "");
        return (<div ref="modalRoot" className={modalClassName} role="dialog" style={{display: "block"}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div ref="header" className="modal-header">
                <button type="button" className="close" data-dismiss="modal">×</button>
                <div className="modal-title">
                  <h4 className="title">{content.getTitle()}</h4>
                  <div className="title-tools"></div>
                </div>
              </div>
              <div ref="body" className="modal-body">
                {content.getBody()}
              </div>
              <div ref="footer" className="modal-footer">
                {content.getFooter()}
              </div>
            </div>
          </div>
        </div>);
      }
    });

    var ModalStack = React.createClass({
      statics :{
        getPageStack : function(){
          var ModalStackDataKey = 'modal-stack.data.key';

          var $stack = $('body > div#moduleStackContainer');
          switch($stack.length){
            case 0:{
              var newContainer = $('<div>', {'id' : 'moduleStackContainer'});
              $('body').append(newContainer);
              $stack = $('body > div#moduleStackContainer');
              var stack0 = $stack[0]
              var ele = React.createElement(ModalStack, {});
              var ms = ReactDOM.render(ele, stack0);
              $(stack0).data(ModalStackDataKey, ms);
              return ms;
            }
            case 1:{
              return $($stack[0]).data(ModalStackDataKey);
            }
            default:
              throw new Error("Multiple moduleStackContainer found!");
          }
        }
      },
      getDefaultProps : function(){
        return {baseZIndex : 2000};
      },
      getInitialState : function(){
        return {
          modalSpecs : [],
          animateLast : true
        };
      },
      getTopModal : function(){
        return this.props.modalSpecs.last();
      },
      componentDidUpdate:function(prevProps, prevState, prevContext, rootNode){
        var startState = prevState;
        var endState = this.state;
      },
      render : function(){
        var count = this.state.modalSpecs.length;
        var _this = this;
        var modals = _.map(this.state.modalSpecs, function(spec, idx){
          var isFirst = (idx == 0);
          var isLast = (idx == (count  -1));
          var animate = (isLast && _this.state.animateLast);
          return <Modal modalStack={_this} key={idx} spec = {spec}
                        isFirst={isFirst}
                        animate={animate}/>;
        });
        return <div>{modals}</div>;
      },
      pushModalSpec : function(modalSpec){
        var specs = _.union(this.state.modalSpecs, [modalSpec]);
        this.setState({
          modalSpecs:specs,
          animateLast : true
        });
      },
      popModalSpec : function(spec){
        var specs = _.without(this.state.modalSpecs, spec);
        this.setState({
          modalSpecs:specs,
          animateLast : false
        })
      }
    });

    return {
      ModalStack : ModalStack,
      ModalSpecBase : ModalSpecBase,
      Contents:Contents
    }

  });