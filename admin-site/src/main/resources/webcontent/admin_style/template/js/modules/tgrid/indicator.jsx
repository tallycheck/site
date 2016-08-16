'use strict';

define(['jquery',
    'underscore',
    'datamap',
    'i18n!nls/entityText'],
  function ($, _, dm,
            entityText) {
    var React = require('react');

    var Footer = React.createClass({
      getDefaultProps:function(){
        return {range : new Range(0,0), total : 0};
      },
      getInitialState:function(){
        var _this = this;
        return {range : _this.props.range, total : _this.props.total};
      },
      render: function () {
        var text = entityText["GRID_DATA_RANGE"](this.state.range, this.state.total);
        return (<div className="footer">
          <div>
            <span>
              <span className="screen-range-of-results">
              {text}
              </span>
            </span>
          </div>
        </div>);
      }
    });

    return {
      Footer : Footer
    }
  });