define(["jquery",
    "underscore",
    "datamap",
    "i18n!nls/entitytext"],
  function ($, _, dm,
            entitytext) {
    var React = require('react');

    var Spinner = React.createClass({
      render: function () {
        return (<span className="spinner">
          <i className="spinner-item fa fa-spin fa-spinner"></i>
        </span>);
      }
    });
    var Footer = React.createClass({
      getDefaultProps:function(){
        return {range : new Range(0,0), total : 0};
      },
      getInitialState:function(){
        var _this = this;
        return {range : _this.props.range, total : _this.props.total};
      },
      render: function () {
        var text = entitytext["GRID_DATA_RANGE"](this.state.range, this.state.total);
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
      Spinner : Spinner,
      Footer : Footer
    }
  });