/**
 * Created by gaoyuan on 8/4/16.
 */
define(function (require) {

  var React =require('react'),
    ReactDom = require('react-dom'),
    tform = require('jsx!modules/tform'),
    datamap = require("datamap");

  //var tgrid = require('jsx!../modules/tgrid');
  var readResult = datamap.data("formResult");
  tform.renderForm(readResult, document.getElementById("formSlot"), true);
});
