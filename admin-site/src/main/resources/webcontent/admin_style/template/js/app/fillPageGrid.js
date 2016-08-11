/**
 * Created by gaoyuan on 8/4/16.
 */
define(function (require) {

  var React =require('react'),
    ReactDom = require('react-dom'),
    tgrid = require('jsx!modules/tgrid'),
    datamap = require("datamap");

  //var tgrid = require('jsx!../modules/tgrid');
  var queryResult = datamap.data("queryResult");
  tgrid.renderGrid(queryResult, document.getElementById("gridSlot"), true);
});
