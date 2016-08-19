'use strict';

define(
  function(require, exports, module) {
    var $ = require('jquery');
    var _ = require('underscore');
    var dm = require('datamap');
    var EntityMsg = require('i18n!../nls/entity');

    var React = require('react');

    var Footer = React.createClass({
      getDefaultProps: function () {
        return {range: new Range(0, 0), total: 0};
      },
      getInitialState: function () {
        var _this = this;
        return {range: _this.props.range, total: _this.props.total};
      },
      render: function () {
        var text = EntityMsg["GRID_DATA_RANGE"](this.state.range, this.state.total);
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

    exports.Footer = Footer;
  });