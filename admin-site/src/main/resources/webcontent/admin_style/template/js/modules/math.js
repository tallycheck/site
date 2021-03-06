'use strict';

define(['underscore'], function(_) {
  //[lo, hi)
  class Range {
    static compare(a, b) {
      if (a.lo == b.lo)return a.hi - b.hi;
      return a.lo - b.lo
    }

    constructor(rangeDesc) {
      if (arguments.length == 2) {
        this.lo = parseInt(arguments[0]);
        this.hi = parseInt(arguments[1]);
      } else if (typeof rangeDesc == 'string') {
        var range = rangeDesc.split('-');
        range = (range.length == 2) ? range : (rangeDesc.split(','));
        if (range.length == 2) {
          this.lo = parseInt(range[0]);
          this.hi = parseInt(range[1]);
        }
      } else if (typeof rangeDesc == 'object') {
        this.lo = rangeDesc.lo;
        this.hi = rangeDesc.hi;
      }
      if (_.isUndefined(this.lo) || _.isUndefined(this.hi)) {
        throw new Error("Invalid Range Parameter!");
      }
    }

    _orderedCall_(ib, callback) {
      var ia = this;
      var a, b;
      (ia.lo < ib.lo) ? (a = ia, b = ib) : (a = ib, b = ia);
      return callback(a, b);
    }

    toString() {
      return this.lo + '-' + this.hi;
    }

    clone() {
      return new Range(this.lo, this.hi);
    }

    width() {
      return this.hi - this.lo;
    }

    compareIndex(index) {
      return (index < this.lo) ? -1 : ( index >= this.hi ? 1 : 0);
    }

    containsIndex(index) {
      return ((this.lo <= index) && (index < this.hi));
    }

    overlap(range) {
      return this._orderedCall_(range, function (a, b) {
        return (b.lo < a.hi);
      });
    }

    each() {//step, callback
      var step = 1;
      var callback = arguments[0];
      if (arguments.length == 2) {
        step = arguments[0];
        callback = arguments[1];
      }
      var i = this.lo;
      while (i < this.hi) {
        callback(i);
        i += step;
      }
    }

    // if there is overlap between this and @param range, return the merged range,
    // or return null
    merge(range) {
      return this._orderedCall_(range, function (a, b) {
        return (b.lo <= a.hi) ? (new Range(a.lo, Math.max(a.hi, b.hi))) : null;
      });
    }

    // if there is overlap between this and @param range, return null, or return the gap between them
    findGap(range) {
      return this._orderedCall_(range, function (a, b) {
        return (b.lo > a.hi) ? (new Range(a.hi, b.lo)) : null;
      });
    }

    intersect(range) {
      return this._orderedCall_(range, function (a, b) {
        return (b.lo < a.hi) ? (new Range(Math.max(a.lo, b.lo), Math.min(a.hi, b.hi))) : null;
      });
    }

    /**
     *
     * @param range
     * @param withempty
     * @returns {Array}
     */
    drop(range, withempty) {
      if (withempty == undefined) {
        withempty = false;
      }
      var result = [];
      if (range.hi <= this.lo) {
        if (withempty) {
          result.push(null);
        }
        result.push(this.clone());
      } else if (this.hi <= range.lo) {
        result.push(this.clone());
        if (withempty) {
          result.push(null);
        }
      } else if (range.lo <= this.lo) {
        if (range.hi < this.hi) {
          if (withempty) {
            result.push(null);
          }
          result.push(new Range(range.hi, this.hi));
        } else if (withempty) {
          result.push(null);
          result.push(null);
        }
      } else if (this.hi <= range.hi) {
        if (this.lo < range.lo) {
          result.push(new Range(this.lo, range.lo));
          if (withempty) {
            result.push(null);
          }
        } else if (withempty) {
          result.push(null);
          result.push(null);
        }
      } else if (this.lo < range.lo && range.hi < this.hi) {
        result.push(new Range(this.lo, range.lo));
        result.push(new Range(range.hi, this.hi));
      } else {
        null.null; //assert faill
      }
      return result;
    }

    subRange(pieceWidth, fromTail) {
      if (fromTail == undefined) {
        fromTail = false;
      }
      return fromTail ? (new Range(this.hi - pieceWidth, this.hi)) : (new Range(this.lo, this.lo + pieceWidth));
    }
  }

  /**
   * A utility object for range array operations
   * @type {{addRange: Function, containsIndex: Function, merge: Function, intersect: Function, findMissingRanges: Function, makePageRanges: Function}}
   */

  class Ranges {
    static addRange(ranges, range, merge) {
      ranges.push(range);
      ranges.sort(Range.compare);
      if (!!merge) {
        return this.merge(ranges);
      } else {
        return ranges;
      }
    }

    static merge(ranges) {
      var i = 0;
      var size = ranges.length;

      while (i < (size - 1)) {
        var r1 = ranges[i];
        var r2 = ranges[i + 1];
        var merged = r1.merge(r2);
        if (merged) {
          ranges[i] = merged;
          ranges.splice(i + 1, 1);
          size--;
        } else {
          i++;
        }
      }
      return ranges;
    }

    static containsIndex(ranges, index) {
      return _.some(ranges, function (range) {
        return range.containsIndex(index);
      });
    }

    static findIndexContainer(ranges, index) {
      return _.find(ranges, function (range) {
        return range.containsIndex(index);
      });
    }

    static sort(ranges) {
      ranges.sort(Range.compare);
    }

    static intersect(ranges, range) {
      var result = [];
      _.each(ranges, function (item) {
        var ri = item.intersect(range);
        if (ri) {
          result.push(ri);
        }
      });
      return result;
    }

    static findSlot(ranges, postion, limit) {
      if (!(limit instanceof Range)) {
        limit = new Range(limit, limit + 1);
      }
      var length = ranges.length;
      var array = ranges;
      for(var i = 0 ; i < length; ++i)
      {
        var r1 = ranges[i];
        var r2 = ((i + 1) < length ) ? array[i + 1] : limit;
        if (r1.lo > postion) {
          return null;
        }
        if (r1.hi > postion) {
          return null;
        }
        if (r2.lo > postion) {
          return new Range(r1.hi, r2.lo);
        }
      }
      return null;

      //for(var i = 0 ; i < ranges.length - 1; ++ i){
      //  var r1 = ranges[i];
      //  var r2 = ranges[i+1];
      //  if(r1.lo > postion)return null;
      //  if(r1.hi > postion)return null;
      //  if(r2.lo > postion) return new Range(r1.hi, r2.lo);
      //  if(i == (ranges.length -2)) return new Range(r2.hi, postion);
      //}
      //return null;
    }

    static findMissingRangesWithin(ranges, from, to) {
      var mainRange = new Range(from, to);
      var intersects = this.intersect(ranges, mainRange);
      var result = [];
      var lastEnd = from;
      _.each(intersects, function (item, index, array) {
        if (item.lo > lastEnd) {
          result.push(new Range(lastEnd, item.lo));
        }
        lastEnd = item.hi;
      });
      if (lastEnd < to) {
        result.push(new Range(lastEnd, to));
      }
      return result;
    }

    static makePageRanges(ranges, pageSize) {
      var result = [];
      if (ranges.length == 0) {
        return null;
      }
      var rangesCount = ranges.length;
      for (var i = 0; i < rangesCount; ++i) {
        var range = ranges[i];
        var t = range.slice(pageSize, (i == 0));
        result.concat(t);
      }
      return result;
    }

    constructor(spec) {
      var _this = this;
      this.ranges = [];
      this.addRanges(spec, false);
    }

    addRanges(ranges, merge /* default true */) {
      var _this = this;
      if (_.isString(ranges)) {
        ranges = (ranges === '') ? [] : ranges.split(",");
      }
      if (_.isArray(ranges)) {
        var length = ranges.length;
        _.each(ranges, function(range, i){
          _this.add(range, merge && (i == (length - 1)));
        });
      }
    }

    add(range, merge /* default true */) {
      if (merge === undefined) merge = true;
      if (!(range instanceof Range)) {
        range = new Range(range);
      }
      this.ranges = Ranges.addRange(this.ranges, range, merge);
    }

    containsIndex(i) {
      return Ranges.containsIndex(this.ranges, i);
    }

    findRangeByIndex(i){
      return Ranges.findIndexContainer(this.ranges, i);
    }

    first() {
      if (this.ranges.length > 0) {
        return this.ranges[0];
      }
      return null;
    }

    last() {
      if (this.ranges.length > 0) {
        return this.ranges[this.ranges.length - 1];
      }
      return null;
    }

    findSlot(postion, limit){
      return Ranges.findSlot(this.ranges, postion, limit);
    }

    merge(){
      Ranges.merge(this.ranges);
    }

    intersect(range) {
      var nRanges = Ranges.intersect(this.ranges, range);
      return new Ranges(nRanges);
    }

    toString() {
      return _.map(this.ranges, function (r) {
        return r.toString();
      }).join(',');
    }

    findMissingRangesWithin(range) {
      var nRanges = Ranges.findMissingRangesWithin(this.ranges, range.lo, range.hi);
      return new Ranges(nRanges);
    }

    makeSegements(range) {
      var lastEnd = range.lo;
      var result = [];

      _.each(this.ranges, function (item, index, array) {
        if (item.hi <= range.lo) return;
        if (item.lo > range.hi) return;
        var ri = item.intersect(range);
        if (ri) {
          if (lastEnd != ri.lo) {
            result.push({r: new Range(lastEnd, ri.lo), cover: false});
          }
          result.push({r: ri, cover: true});

          lastEnd = ri.hi;
        } else {
          throw new Error("error happen");
        }
      });
      if (lastEnd < range.hi) {
        result.push({r: new Range(lastEnd, range.hi), cover: false});
      }

      return result;
    }
  }

  return {
    Range: Range,
    Ranges: Ranges
  }
});