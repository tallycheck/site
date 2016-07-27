/**
 * Created by Gao Yuan on 2016/3/31.
 */
define({
  "root":{
    "GRID_ACTION_create":"New",
    "GRID_ACTION_reorder":"Reorder",
    "GRID_ACTION_update":"Edit",
    "GRID_ACTION_delete":"Delete",
    "GRID_ACTION_save":"Save",

    "RESET" : "Reset",

    "NO_RECORDS_FOUND" :"(No Records Found)",
    GRID_DATA_RANGE : function(range, total){
      if(range == undefined) range = {lo:0,hi:0};
      if(total == undefined) total = 0;
      if(total == 0)
        return "0 - 0 of 0 records";
      else
        return "" + (range.lo + 1) + " - " + range.hi + " of " + total + " records"
    }
  }
});