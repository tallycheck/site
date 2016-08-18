'use strict';

define(
  function(require, exports, module){

    var entityText = require('i18n!nls/entityText');
    var React = require('react');
    var ReactDOM = require('react-dom');

    var TFormActionsDefaultProps = {
      tform: null,
    }
    class TFormActions extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          actions: [],
          links: {},
          lock: false,
          processing: false
        };
        this.onSaveClick = this.onSaveClick.bind(this);
        this.onDeleteClick = this.onDeleteClick.bind(this);
      }

      updateStateByForm() {
        var tform = this.props.tform;
        this.setState({
          actions: tform.state.actions,
          links: tform.state.links,
          processing: tform.state.loading,
        });
      }

      render() {
        var actions = this.state.actions;
        var deleteAction = "delete";
        var saveAction = "save";
        var showDelete = _.indexOf(actions, deleteAction) >= 0;
        var showSave = _.indexOf(actions, saveAction) >= 0;
        var deleteEle = showDelete ? (<button type="button" className="btn btn-default action-control entity-action"
                                              data-action={deleteAction} style={{display: "inline-block"}}
                                              disabled={this.state.processing}
                                              onClick={this.onDeleteClick}>
          <span className="fa fa-times" aria-hidden="true"></span>{entityText.GRID_ACTION_delete}
        </button>) : <div/>;
        var spinnerStyle = {display: this.state.processing ? "inline-block" : "none"};
        var saveEle = showSave ? (<div className="action-control entity-action submit-entity"
                                       data-action={saveAction} data-action-url=""
                                       style={{display: "inline-block"}}>
            <button type="button" className="btn btn-default" disabled={this.state.processing} onClick={this.onSaveClick}>
              <span className="fa fa-floppy-o" aria-hidden="true"></span>{entityText.GRID_ACTION_save}
            </button>
          </div>
        ) : <div/>;

        return (<div className="action-group" style={{display: "block"}}>
          {deleteEle}
          {saveEle}
          <span className="spinner" style={spinnerStyle}><i className="fa fa-spin fa-circle-o-notch"></i></span>
        </div>);
      }

      onDeleteClick() {
        var tform = this.props.tform;
        tform.doDelete();
      }

      onSaveClick() {
        var tform = this.props.tform;
        var form = tform.refs.form;
        $(form).submit();
      }
    }
    TFormActions.defaultProps = TFormActionsDefaultProps;

    exports.TFormActions = TFormActions;
  });