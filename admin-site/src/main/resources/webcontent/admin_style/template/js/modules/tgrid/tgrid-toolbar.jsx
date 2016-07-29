define(["jquery", "underscore","../datamap","math",
    "i18n!nls/entitytext"],
  function ($, _, dm, math,
            entitytext) {
    var React = require('react');
    var ReactDOM = require('react-dom');

    var GAS = {
      CREATE_ACTION:"create",
      READ_ACTION:"read",
      UPDATE_ACTION:"update",
      DELETE_ACTION:"delete"
    };

    var Toolbar = React.createClass({
      render: function () {
        var gridInfo = this.props.info;
        return (
          <div className="toolbar row">
            <Search gridInfo={gridInfo} actions={this.props.actions} links={this.props.links}/>
            <Actions actions={this.props.actions} links={this.props.links}/>
            <form method="POST" className="post-agent" action="">
              <input type="hidden" name="_csrf" value="f9f562de-5b37-43ce-986e-8614b9737c75"/>
            </form>
          </div>
        );
      }
    });
    var Search = React.createClass({
      getInitialState: function () {
        return {searchText: ""};
      },
      handleDelClick: function (e) {
        var inputDom = this.refs.searchInput;
        var delDom = this.refs.deleteI;
        inputDom.value = "";
        inputDom.focus();
        this.setState({searchText: ""});
      },
      handleSearchTextChange: function (event) {
        var searchText = event.target.value;
        this.setState({searchText: searchText});
        var delDom = this.refs.deleteI;
        var delDisplay = (!!searchText ? "block" : "none");
      },
      render: function () {
        var gridinfo = this.props.gridInfo;
        if (gridinfo.primarySearchField) {
          var searchFieldName = gridinfo.primarySearchField;
          var searchField = _.find(gridinfo.fields, function (f) {
            return f.name == searchFieldName
          });
          var searchFieldNameFriendly = (searchField != null) ? searchField.friendlyName : searchFieldName;
          var searchText = this.state.searchText;
          var delStyle = {"display": (!!searchText ? "block" : "none")};

          return (
            <div className="search-group" data-search-column={searchFieldName}>
              <div className="input-group">
                <button className="btn search-btn" type="button"> <i className="fa fa-filter"></i> </button>
                <span className="search-text">
                  <span className="search-input-element">
                    <i className="fa fa-search embed-hint"></i>
                    <input className="search-input" ref="searchInput" data-name={searchFieldName}
                           placeholder={searchFieldNameFriendly} defaultValue={searchText}
                           onChange={this.handleSearchTextChange} type="text"/>
                    <i className="fa fa-times-circle embed-delete" ref="deleteI" onClick={this.handleDelClick}
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
    });
    var Actions = React.createClass({
      actionObj : function(actionName){
        var links=this.props.links;
        var actionUri = links[actionName];
        var actionText = entitytext["GRID_ACTION_" + actionName];
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
        var actions=this.props.actions,
          links=this.props.links,
          btns = [];

        if(actions.includes(GAS.CREATE_ACTION)){
          var actionName = GAS.CREATE_ACTION;
          var ao = this.actionObj(actionName);
          var actionUri = ao.uri;
          var actionText = ao.text;
          var btn = (
            <button type="button" key={actionName} className="btn btn-default action-control" data-action={actionName}
                    data-edit-in-modal="true" data-edit-success-redirect="false"
                    data-action-uri={actionUri}>
              <span className="fa fa-plus" aria-hidden="true"></span> {actionText}
            </button>);
          btns.push(btn);
        }
        if(actions.includes(GAS.UPDATE_ACTION)){
          var actionName = GAS.UPDATE_ACTION;
          var ao = this.actionObj(actionName);
          var actionUri = ao.uri;
          var actionText = ao.text;
          var btn = (
            <button type="button" key={actionName} className="btn btn-default action-control entity-action" data-action={actionName}
                    data-edit-in-modal="true"
                    data-action-url="" data-edit-success-redirect="false" disabled="disabled"
                    data-action-uri={actionUri}>
              <span className="fa fa-pencil-square-o" aria-hidden="true"></span> {actionText}
            </button>);
          btns.push(btn);
        }
        if(actions.includes(GAS.DELETE_ACTION)){
          var actionName = GAS.DELETE_ACTION;
          var ao = this.actionObj(actionName);
          var actionUri = ao.uri;
          var actionText = ao.text;
          var btn = (
            <button type="button" key={actionName} className="btn btn-default action-control entity-action" data-action={actionName}
                    data-action-url="" disabled="disabled"
                    data-action-uri={actionUri}>
              <span className="fa fa-times" aria-hidden="true"></span> {actionText}</button>);
          btns.push(btn);
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