/**
 * Created by Gao Yuan on 2016/3/31.
 */
define({
  "GRID_ACTION_create": "新建",
  "GRID_ACTION_read": "View",
  "GRID_ACTION_reorder": "排序",
  "GRID_ACTION_update": "更新",
  "GRID_ACTION_delete": "刪除",
  "GRID_ACTION_save": "保存",

  ActionOnType: function (action, type) {
    var friendlyAction = this["GRID_ACTION_" + action];
    return friendlyAction + " " + type;
  },

  "RESET": "重置",

  "NO_RECORDS_FOUND": "(无记录)",
  GRID_DATA_RANGE: function (range, total) {
    if (range == undefined) range = {lo: 0, hi: 0};
    if (total == undefined) total = 0;
    var from = 0, to = 0;
    if (total != 0){
      from = (range.lo + 1);
      to = range.hi;
    }
    return "" + from + " - " + to + " (共 " + total + " 条记录)";
  },

  "FieldForeignKeyNotSelected": "(No value selected)",

  readFailed: "读取失败"
});