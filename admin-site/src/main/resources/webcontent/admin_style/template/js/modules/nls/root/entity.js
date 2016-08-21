/**
 * Created by Gao Yuan on 2016/3/31.
 */
define({
  "GRID_ACTION_create": "New",
  "GRID_ACTION_read": "View",
  "GRID_ACTION_reorder": "Reorder",
  "GRID_ACTION_update": "Edit",
  "GRID_ACTION_delete": "Delete",
  "GRID_ACTION_save": "Save",

  "Select" : "Select",
  SelectField : function(fieldName){
    return "Select " + fieldName;
  },

  ActionOnType: function (action, type) {
    var friendlyAction = this["GRID_ACTION_" + action];
    return friendlyAction + " " + type;
  },

  "RESET": "Reset",

  "NO_RECORDS_FOUND": "(No Records Found)",
  GRID_DATA_RANGE: function (range, total) {
    if (range == undefined) range = {lo: 0, hi: 0};
    if (total == undefined) total = 0;
    var from = 0, to = 0;
    if (total != 0){
      from = (range.lo + 1);
      to = range.hi;
    }
    return "" + from + " - " + to + " of " + total + " records";
  },

  "FieldForeignKeyNotSelected": "(No value selected)",
  "FieldForeignKeyLookup" : "Lookup",

  readFailed: "Read Failed"
});