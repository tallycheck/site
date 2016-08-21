/**
 * Created by gaoyuan on 8/1/16.
 */
'use strict';

define(
  function(require, exports, module) {

    var $ = require('jquery');
    var _ = require('underscore');
    var BS = require('bootstrap');
    var HandlersComp = require('./handlers');
    var EntityMsg = require('i18n!./nls/entity');
    var CommonMsg = require('i18n!./nls/common');

    var React = require('react');
    var ReactDOM = require('react-dom');

    class ModalContent {
      constructor(options) {
        this.options = _.extend({}, this.defaultOptions(), options);
        this.modal = null;
      }

      setModal(modal) {
        this.modal = modal;
      }

      defaultOptions() {
        return {};
      }

      getTitle() {
        return '';
      }

      getBody() {
        return <p/>;
      }

      getFooter() {
        return this.getGenericFooter(false, false, true);
      }

      onShown(modal, spec) {
        console.log("modal content shown.");
      }

      getGenericFooter(positive, negative, close) {
        var posBtn = positive ?
          <button type="button" className="btn btn-default btn-positive" onClick={this.onPositiveButtonClick}>
            {CommonMsg.ok}</button> : <span/>;
        var negBtn = negative ?
          <button type="button" className="btn btn-default btn-negative" onClick={this.onNegativeButtonClick}
                  data-dismiss="modal">{CommonMsg.cancel}</button> : <span/>;
        var closeBtn = close ?
          <button type="button" className="btn btn-default btn-close" data-dismiss="modal">{CommonMsg.close}</button> :
          <span/>;
        var div = ( <div>
          {posBtn}
          {negBtn}
          {closeBtn}
        </div>);
        return div;
      }

      onPositiveButtonClick(modal) {
      }

      onNegativeButtonClick(modal) {
      }
    }
    class BlankContent extends ModalContent {
    }
    class MessageContent extends ModalContent {
      constructor(options) {
        super(options);
      }

      defaultOptions() {
        return {
          titleText: 'Undefined Title',
          bodyText: 'Undefined Content'
        };
      }

      getTitle() {
        return this.options.titleText;
      }

      getBody() {
        var bt = this.options.bodyText;
        return (<div className="message">
          {bt}
        </div>);
      }

      getFooter() {
        return this.getGenericFooter(false, false, true);
      }
    }
    class ProcessingContent extends MessageContent {
      constructor(options) {
        super(options);
      }

      defaultOptions() {
        return {
          titleText: CommonMsg.loading,
          bodyText: 'Undefined Loading Content'
        }
      }

      getBody() {
        var bt = this.options.bodyText;
        var bc = (<div>
          <p>{bt}</p>

          <div ref="progress" className="progress fresh-progress">
            <div className="progress-bar progress-bar-striped active" style={{width: "100%"}}></div>
          </div>
        </div>);
        return bc;
      }

      getFooter() {
        return this.getGenericFooter(false, false, false);
      }
    }
    var Contents = {
      ModalContent: ModalContent,
      MessageContent: MessageContent,
      ProcessingContent: ProcessingContent
    };

    class ModalSpecBase {
      constructor(options, handlers) {
        this.options = _.extend({}, this.defaultOptions(), options);
        var _entryContent = this.entryContent;
        if (_entryContent == null) {
          _entryContent = this.defaultEntryContent;
        }
        if (_.isFunction(_entryContent)) {
          _entryContent = _entryContent.apply(this);
        }
        if (_entryContent instanceof ModalContent) {
          this.content = _entryContent;
        } else {
          throw new Error("Entry Content Undefined");
        }

        this.listenerRegistery = [];

        var defHandlers = this.defaultHandlers();
        this.handlers = new HandlersComp.HandlerContainer(defHandlers);
        this.pushHandlers(handlers);
      }

      defaultOptions() {
        return {};
      }

      defaultHandlers() {
        return {};
      }

      pushHandlers() {
        this.handlers.pushHandlers.apply(this.handlers, arguments);
        return this;
      }

      updateContent(content) {
        var oldContent = this.content;
        var spec = this;
        this.content = content;
        _.each(spec.listenerRegistery, function (listener) {
          listener.onContentUpdated(spec, oldContent, content);
        });
      }

      getContent() {
        return this.content;
      }

      defaultEntryContent() {
        return new ModalContent();
      }

      registerListener(listener) {
        this.listenerRegistery.push(listener);
      }

      unregisterListener(listener) {
        var oldReg = this.listenerRegistery;
        this.listenerRegistery = _.without(oldReg, listener);
      }
    }

    //Modal used to show ModalSpec
    var ModalDefaultProps = {
      modalStack: null,
      isFirst: false,
      animate: false,
      spec: new ModalSpecBase(),
      name: "Modal"
    }
    var ModalStatics = {
      defaultProps: ModalDefaultProps,
    }
    class Modal extends React.Component {
      static makeIsolatedUpdateContentListener(modal) {
        return {
          onContentUpdated: function (spec, oldContent, newContent) {
            modal.setContent(newContent);
          }
        };
      }

      constructor(props) {
        super(props);
        this.updateContentListener = undefined;
        this.state = {content: null};
        this.onHideBsModal = this.onHideBsModal.bind(this);
        this.onHiddenBsModal = this.onHiddenBsModal.bind(this);
      }

      setContent(content) {
        this.setState({content: content});
      }

      setState() {
        super.setState.apply(this, arguments);
      }

      componentDidMount() {
        var spec = this.props.spec;
        this.updateContentListener = Modal.makeIsolatedUpdateContentListener(this);
        spec.registerListener(this.updateContentListener);
        this.setState({content: spec.getContent()});
        this.bindModalHideEvent(true);
      }

      componentWillUnmount() {
        var spec = this.props.spec;
        spec.unregisterListener(this.updateContentListener);
        this.bindModalHideEvent(false);
      }

      shouldComponentUpdate(nextProps, nextState, nextContext) {
        if (!_.isEqual(nextProps, this.props) || !_.isEqual(nextState, this.state) || !_.isEqual(nextContext, this.context)) {
          return true;
        }
        return false;
      }

      componentDidUpdate(prevProps, prevState, prevContext, rootNode) {
        var ps = prevState;
        var ns = this.state;
        var pContent = ps.content;
        var nContent = ns.content;
        var spec = this.props.spec;
        var modalStack = this.props.modalStack;
        var modal = ReactDOM.findDOMNode(this.refs.modalRoot);
        var $modal = $(modal);
        $modal.modal({
          backdrop: this.props.isFirst,
          keyboard: false
        });
        this.bindModalHideEvent(true);
        if(pContent != nContent){
          var content = nContent;
          if (content == null) {
            this.hide();
          } else {
            content.onShown(this, spec);
          }
        }
      }

      bindModalHideEvent(bind) {
        var modal = ReactDOM.findDOMNode(this.refs.modalRoot);
        var $modal = $(modal);
        if (bind) {
          this.bindModalHideEvent(false);
          $modal.on('hide.bs.modal', this, this.onHideBsModal);
          $modal.on('hidden.bs.modal', this, this.onHiddenBsModal);
        } else {
          $modal.off('hide.bs.modal', this.onHideBsModal);
          $modal.off('hidden.bs.modal', this.onHiddenBsModal);
        }
      }

      onHideBsModal(event) {
        var spec = this.props.spec;
        var modalStack = this.props.modalStack;

        var $ele = $(event.delegateTarget);
        modalStack.popModalSpec(spec);
      }

      onHiddenBsModal(event) {
        var spec = this.props.spec;
        var modalStack = this.props.modalStack;

        var $ele = $(event.delegateTarget);
        modalStack.onModalHidden(spec);
      }

      hide() {
        var modal = ReactDOM.findDOMNode(this.refs.modalRoot);
        var $modal = $(modal);
        $modal.modal('hide');
      }

      render() {
        var content = this.state.content;
        if (content == null) content = new BlankContent();
        content.setModal(this);
        var modalClassName = "modal " + (this.props.animate ? "fade" : "");
        var body = content.getBody();
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
                {body}
              </div>
              <div ref="footer" className="modal-footer">
                {content.getFooter()}
              </div>
            </div>
          </div>
        </div>);
      }
    }
    _.extend(Modal, ModalStatics);

    var ModalStackDefaultProps = {
      baseZIndex: 2000
    }
    var ModalStackStatics = {
      defaultProps: ModalStackDefaultProps,
    }
    var ModalStackContainerId = "moduleStackContainer";
    var ModalStackContainerSelector = 'body > div#moduleStackContainer';
    class ModalStack extends React.Component {
      static getPageStack() {
        var ModalStackDataKey = 'modal-stack.data.key';

        var $stack = $(ModalStackContainerSelector);
        switch ($stack.length) {
          case 0:
          {
            var newContainer = $('<div>', {'id': ModalStackContainerId});
            $('body').append(newContainer);
            $stack = $(ModalStackContainerSelector);
            var stack0 = $stack[0]
            var ele = React.createElement(ModalStack, {});
            var ms = ReactDOM.render(ele, stack0);
            $(stack0).data(ModalStackDataKey, ms);
            return ms;
          }
          case 1:
          {
            return $($stack[0]).data(ModalStackDataKey);
          }
          default:
            throw new Error("Multiple moduleStackContainer found!");
        }
      }

      static dropPageStack() {
        var $stack = $(ModalStackContainerSelector);
        switch ($stack.length) {
          case 0:
          {
            return;
          }
          case 1:
          {
            var stack0 = $stack[0]
            var umok = ReactDOM.unmountComponentAtNode(stack0);
            $stack.remove();
            break;
          }
          default:
            throw new Error("Multiple moduleStackContainer found!");
        }
      }

      constructor(props) {
        super(props);
        this.state = {
          modalSpecs: [],
          animateLast: true
        };
      }

      getTopModal() {
        return this.props.modalSpecs.last();
      }

      componentDidUpdate(prevProps, prevState, prevContext, rootNode) {
        var startState = prevState;
        var endState = this.state;
        var startLen = startState.modalSpecs.length;
        var endLen = endState.modalSpecs.length;
      }

      render() {
        var count = this.state.modalSpecs.length;
        var _this = this;
        var modals = _.map(this.state.modalSpecs, function (spec, idx) {
          var isFirst = (idx == 0);
          var isLast = (idx == (count - 1));
          var animate = (isLast && _this.state.animateLast);
          return <Modal modalStack={_this} key={idx} spec={spec}
                        isFirst={isFirst}
                        animate={animate}/>;
        });
        return <div>{modals}</div>;
      }

      pushModalSpec(modalSpec) {
        var specs = _.union(this.state.modalSpecs, [modalSpec]);
        this.setState({
          modalSpecs: specs,
          animateLast: true
        });
      }

      popModalSpec(spec) {
        var specs = _.without(this.state.modalSpecs, spec);
        this.setState({
          modalSpecs: specs,
          animateLast: false
        });
      }

      onModalHidden(spec) {
        if (this.state.modalSpecs.length == 0) {
          ModalStack.dropPageStack();
        }
      }
    }
    _.extend(ModalStack, ModalStackStatics);

    exports.ModalStack = ModalStack;
    exports.ModalSpecBase = ModalSpecBase;
    exports.Contents = Contents;
  });