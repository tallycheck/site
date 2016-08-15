define(['jquery', 'underscore','../datamap','math',
    'i18n!nls/entityText'],
  function ($, _, dm, math,
            entityText) {
    var React = require('react');
    var ReactDOM = require('react-dom');

    var GAS = {
      CREATE_ACTION:"create",
      READ_ACTION:"read",
      UPDATE_ACTION:"update",
      DELETE_ACTION:"delete"
    };

    var Toolbar = React.createClass({
      getDefaultProps: function () {
        return {
          csrf : ''
        };
      },
      render: function () {
        var gridInfo = this.props.info;
        return (
          <div className="toolbar row">
            <Search ref="search" gridInfo={gridInfo}
                    grid={this.props.grid} actions={this.props.actions} links={this.props.links}/>
            <Actions ref="actions"
                     grid={this.props.grid} actions={this.props.actions} links={this.props.links}/>
          </div>
        );
      },
      focuseToId : function(id){
        this.refs.actions.setState({focusingEntry: id});
      }
    });
    class Search extends React.Component {
      constructor(props){
        super(props);
        this.state = {
          searchField : undefined,
          inputting: undefined,
          presenting : ''
        };
        this.onDeleteIconClick = this.onDeleteIconClick.bind(this);
        this.onSearchTextKeyPress = this.onSearchTextKeyPress.bind(this);
        this.onSearchTextChange = this.onSearchTextChange.bind(this);
        this.onFilterClick = this.onFilterClick.bind(this);
      }
      displayText (){
        if(this.state.inputting !== undefined){
          return this.state.inputting;
        }else{
          return this.state.presenting;
        }
      }
      onDeleteIconClick (e) {
        var inputDom = this.refs.searchInput;
        var delDom = this.refs.deleteI;
        inputDom.value = "";
        inputDom.focus();
        this.setState({inputting: ""});
      }
      onSearchTextChange (event) {
        var inputting = event.target.value;
        this.setState({inputting: inputting});
        var delDom = this.refs.deleteI;
        var delDisplay = (!!inputting ? "block" : "none");
      }
      onSearchTextKeyPress  (event) {
        if(event.charCode == 13){
          this.fireDoFilter();
        }
      }
      onFilterClick (){
        this.fireDoFilter();
      }
      fireDoFilter (){
        var inputDom = this.refs.searchInput;
        var val = inputDom.value;
        var grid = this.props.grid;
        var header = grid.refs.header;
        var searchField = this.state.searchField;
        header.updateFilterHolderFilterVal(searchField, val);
      }
      componentDidMount () {
      }
      componentWillUnmount () {
      }
      shouldComponentUpdate (nextProps, nextState, nextContext){
        var ps = this.state;
        var ns = nextState;
        if(!_.isEqual(nextProps, this.props) ||
          !_.isEqual(ns, ps) ||
          !_.isEqual(nextContext, this.context)){
          return true;
        }
        return false;
      }
      componentDidUpdate (prevProps, prevState) {
        var ps = prevState;
        var ns = this.state;
      }
      render () {
        var gridinfo = this.props.gridInfo;
        if (gridinfo && gridinfo.primarySearchField) {
          var searchFieldName = gridinfo.primarySearchField;
          var searchField = _.find(gridinfo.fields, function (f) {
            return f.name == searchFieldName
          });
          var searchFieldNameFriendly = (searchField != null) ? searchField.friendlyName : searchFieldName;
          var inputting = this.state.inputting;
          var displayText = this.displayText();
          var delStyle = {"display": (!!displayText ? "block" : "none")};

          return (
            <div ref="searchGroup" className="search-group" data-search-column={searchFieldName}>
              <div className="input-group">
                <button className="btn search-btn" type="button"
                        onClick={this.onFilterClick}> <i className="fa fa-filter"></i> </button>
                <span className="search-text">
                  <span className="search-input-element">
                    <i className="fa fa-search embed-hint"></i>
                    <input className="search-input" ref="searchInput" data-name={searchFieldName}
                           placeholder={searchFieldNameFriendly}
                           value = {displayText}
                           onKeyPress={this.onSearchTextKeyPress}
                           onChange={this.onSearchTextChange} type="text"/>
                    <i className="fa fa-times-circle embed-delete" ref="deleteI" onClick={this.onDeleteIconClick}
                       style={delStyle}></i>
                  </span>
                </span>
              </div>
            </div>
          );
        } else {
          return (<div className="search-group"/>);
        }
      }
    };
    var Actions = React.createClass({
      getInitialState :function() {
        return {focusingEntry : ''};
      },
      actionObj : function(actionName){
        var links=this.props.links;
        var actionUri = links[actionName];
        var actionText = entityText["GRID_ACTION_" + actionName];
        return {
          name:actionName,
          uri:actionUri,
          text:actionText};
      },
      makeActionButton: function (actionObject, isEntityAction, icon) {
        var ao = actionObject;
        var actionName = ao.name;
        var actionUri = ao.uri;
        var actionText = ao.text;
        var btn = (
          <button type="button" key={actionName} className={"btn btn-default action-control" + isEntityAction ? "entity-action":""}
                  data-action={actionName}
                  data-edit-in-modal="true" data-edit-success-redirect="false"
                  data-action-uri={actionUri}>
            <span className={"fa " + icon} aria-hidden="true"></span> {actionText}
          </button>);
        return btn;
      },
      render: function () {
        var grid = this.props.grid,
          actions=this.props.actions,
          links=this.props.links,
          btns = [];

        if(actions) {
          if (actions.includes(GAS.CREATE_ACTION)) {
            var actionName = GAS.CREATE_ACTION;
            var ao = this.actionObj(actionName);
            var actionUri = ao.uri;
            var actionText = ao.text;
            var btn = (
              <button type="button" key={actionName} className="btn btn-default action-control" data-action={actionName}
                      data-edit-in-modal="true" data-edit-success-redirect="false"
                      data-action-uri={actionUri} onClick={grid.onEventCreateButtonClick}>
                <span className="fa fa-plus" aria-hidden="true"></span> {actionText}
              </button>);
            btns.push(btn);
          }
          if (actions.includes(GAS.UPDATE_ACTION)) {
            var actionName = GAS.UPDATE_ACTION;
            var ao = this.actionObj(actionName);
            var actionUri = ao.uri;
            var actionText = ao.text;
            var focusing = (this.state.focusingEntry != '');
            var btn = (
              <button type="button" key={actionName} className="btn btn-default action-control entity-action"
                      data-action={actionName}
                      data-edit-in-modal="true"
                      data-action-url="" data-edit-success-redirect="false" disabled={!focusing}
                      data-action-uri={actionUri} onClick={grid.onEventUpdateButtonClick}>
                <span className="fa fa-pencil-square-o" aria-hidden="true"></span> {actionText}
              </button>);
            btns.push(btn);
          }
          if (actions.includes(GAS.DELETE_ACTION)) {
            var actionName = GAS.DELETE_ACTION;
            var ao = this.actionObj(actionName);
            var actionUri = ao.uri;
            var actionText = ao.text;
            var focusing = (this.state.focusingEntry != '');
            var btn = (
              <button type="button" key={actionName} className="btn btn-default action-control entity-action"
                      data-action={actionName}
                      data-action-url="" disabled={!focusing}
                      data-action-uri={actionUri} onClick={grid.onEventDeleteButtonClick}>
                <span className="fa fa-times" aria-hidden="true"></span> {actionText}</button>);
            btns.push(btn);
          }
        }

        return (
          <div className="grid-action-group-container"><div className="action-group">{btns}</div></div>
        );
      }
    });

    return {
      Toolbar : Toolbar
    }
  });