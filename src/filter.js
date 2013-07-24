
var filter = function (filter_column, filter_rule) {//{{{
    "use strict";
    var do_filter = function (row) {
        var value = row[filter_column];
        if (value === undefined) {
            return false;
        }
        return filter_rule(row[filter_column]);
    };
    return do_filter;
};//}}}

var mod_rule = function (mod, index) {//{{{
    "use strict";
    var mod_filter_rule = function (value) {
        console.log('[filter]value is ' + value + ' mod is ' + mod + ' index is ' + index);
        console.log('[filter] return ' + (value % mod) === index);
        return (value % mod) === index;
    };
    return mod_filter_rule;
};//}}}

module.exports.filter = filter;
module.exports.mod_rule = mod_rule;
