/**
 * Created by gaoyuan on 8/4/16.
 */
define(
  function(require, exports, module){
    var $ = require('jquery');
    var _ = require('underscore');
    var BS = require('bootstrap');
    var dm = require('datamap');
    var math = require('math');
    var basic = require('basic');
    var UriTemplate = require('UriTemplate');
    var entityText = require('i18n!nls/entityText');
    var TFormGroup = require('jsx!./group');

    var React = require('react');
    var ReactDOM = require('react-dom');
    var Group = TFormGroup.Group;

    /**
     * <TabContainer>
     *   <TabNav>
     *     <TabNavItem/>
     *   </TabNav>
     *   <TabContent>
     *     <TabPage/>
     *   </TabContent>
     * </TabContainer>
     */

    var TabNavItem = React.createClass({
      getDefaultProps: function () {
        return {
          tabInfo : null,
          formInfo : null,
          tabIndex : 0,
          tabId : "",
        };
      },
      getInitialState: function () {
        return {
//          active:false
        };
      },
      render :function(){
        var href = "#" + this.props.tabId;
        var tabInfo = this.props.tabInfo;
        var tabIndex = this.props.tabIndex;
        return (
          <li className="">
            <a ref="a" data-toggle="tab" role="tab" href={href} data-tag-name={tabInfo.name} data-tab-index={tabIndex} aria-expanded="true">{tabInfo.friendlyName}</a>
          </li>
        );
      }
    });
    var TabNav = React.createClass({
      getDefaultProps: function () {
        return {
          ids : [],
          formInfo : null,
        };
      },
      render :function(){
        var formInfo = this.props.formInfo;
        var ids = this.props.ids;
        var tabNavItems = _.map(this.props.formInfo.tabs, function(tabInfo, idx){
          var id = ids[idx];
          return <TabNavItem ref={id} key={tabInfo.name} tabInfo={tabInfo} tabIndex={idx} formInfo={formInfo} tabId={id}/>;
        });
        return (<ul className="nav nav-tabs" role="tablist">
          {tabNavItems}
        </ul>);
      }
    });

    var TabPage = React.createClass({
      statics:{
        RefPrefix : "tab."
      },
      getDefaultProps: function () {
        return {
          tform : undefined,
          formInfo : null,
          tabInfo : null,
          tabId : "",
        };
      },
      getInitialState: function () {
        return {
        };
      },
      render : function(){
        var tform = this.props.tform;
        var tab = this.props.tabInfo;
        var formInfo = this.props.formInfo;

        var tabName = tab.name;
        var tabFN = tab.friendlyName;
        var groupSegs = _.map(tab.groups, function (group) {
          return <Group tform={tform}
                        ref={Group.RefPrefix + tabName} key={tabName}
                        groupInfo={group} formInfo={formInfo}/>
        });
        var tabSeg = (
          <div className="tab-pane fade entity-tab"  data-tab-name={tabName} id={this.props.tabId}>
            {groupSegs}
          </div>);
        return tabSeg;
      },
      groups : function(){
        return basic.propertiesWithKeyPrefix(this.refs, Group.RefPrefix);
      },
      fieldItemHolders : function(){
        var groups = this.groups();
        var fihsArray = [];
        _.each(groups, function(group){
          var fihs = group.fieldItemHolders();
          fihsArray.push(fihs);
        });
        return _.union.apply(null, fihsArray);
      }
    });
    var TabContent = React.createClass({
      getDefaultProps: function () {
        return {
          tform: undefined,
          ids : [],
          formInfo : null,
        };
      },
      render :function(){
        var _this = this;
        var formInfo = this.props.formInfo;
        var ids = this.props.ids;
        var tabPages = _.map(this.props.formInfo.tabs, function(tabInfo, idx){
          return <TabPage ref={TabPage.RefPrefix + tabInfo.name}
                          key={tabInfo.name}
                          tform={_this.props.tform}
                          tabInfo={tabInfo}
                          formInfo={formInfo} tabId={ids[idx]}/>;
        });
        return (<div className="tab-content">
          {tabPages}
        </div>);
      },
      tabPages : function(){
        return basic.propertiesWithKeyPrefix(this.refs, TabPage.RefPrefix);
      },
      fieldItemHolders : function(){
        var tps = this.tabPages();
        var fihsArray = [];
        _.each(tps, function(tp){
          var fihs = tp.fieldItemHolders();
          fihsArray.push(fihs);
        });
        return _.union.apply(null, fihsArray);
      }
    });

    var TabContainer = React.createClass({
      selectedTabIndex : -1,
      getDefaultProps: function () {
        return {
          tform: undefined,
          formInfo : null,
          bean : null
        };
      },
      getInitialState :function() {
        return {
          selectedTabIndex:-1, //just for debug
          version : 0
        }
      },
      componentDidMount: function() {
        this.autoSelectTab();
        var $nav = $(ReactDOM.findDOMNode(this.refs.nav));
        $nav.find('a[data-toggle="tab"]').on('shown.bs.tab', this.onEventTabShown);
      },
      componentWillUnmount: function() {
        var $nav = $(ReactDOM.findDOMNode(this.refs.nav));
        $nav.off('shown', 'a[data-toggle="tab"]', this.onEventTabShown);
      },
      shouldComponentUpdate:function(nextProps, nextState, nextContext){
        var ps = this.state;
        var ns = nextState;
        var oldState = _.extend({}, ps, {selectedTabIndex:-1});
        var newState = _.extend({}, ns, {selectedTabIndex:-1});
        if(!_.isEqual(nextProps, this.props) ||
          !_.isEqual(newState, oldState) ||
          !_.isEqual(nextContext, this.context)){
          return true;
        }
        return false;
      },
      componentDidUpdate:function(prevProps, prevState) {
        this.autoSelectTab();
      },
      render :function() {
        var formInfo = this.props.formInfo;
        var tabInfos = formInfo.tabs;
        var ids = _.map(tabInfos, function(tabinfo){
          return "tab_" + Math.floor(Math.random()*1e15);
        });
        this.tabIds = ids;
        return (
          <div className="tab-holder entity-box">
            <TabNav ref="nav" ids={ids} formInfo={formInfo}/>
            <TabContent ref="content" tform={this.props.tform} ids={ids} formInfo={formInfo}/>
          </div>
        );
      },
      getAllTabNavItems : function(){
        var _this = this;
        var ids = this.tabIds;
        var nav = this.refs.nav;
        var tabNavItems =  _.map(ids, function(id){
          var tabNavItem = nav.refs[id];
          return tabNavItem;
        });
        return tabNavItems;
      },
      adjustSelectableTabIndex : function(idx){
        var navItems = this.tabIds;
        var tabs = navItems.length;
        if(tabs == 0)
          return -1;
        if(idx < 0)
          idx = 0;
        if(idx >= tabs)
          idx = 0;
        return idx;
      },
      autoSelectTab : function(){
        var nextSelectTabIndex = this.adjustSelectableTabIndex(this.selectedTabIndex);
        this.selectTabIndex(nextSelectTabIndex);
      },
      selectTabIndex :function(idx){
        idx = this.adjustSelectableTabIndex(idx);
        if(idx >= 0){
          var navItems = this.getAllTabNavItems();
          var navItem = navItems[idx];
          var navA = navItem.refs.a;

          var $navA = $(ReactDOM.findDOMNode(navA));
          $navA.tab('show');
        }
      },
      onEventTabShown: function (e) {
        e.target // activated tab
        e.relatedTarget // previous tab
        this.selectedTabIndex = Number($(e.target).attr("data-tab-index"));
        this.setState({selectedTabIndex:this.selectedTabIndex});
      }
    });

    exports.TabContainer = TabContainer;
  });