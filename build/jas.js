/*jslint node, multivar, white, fudge */
/*property
    argv, forEach, indexOf
*/

////////////////////////////////////////
// JSON Array Stats

var jas = (function () {
    "use strict";

    var jfn = "../usracehistory-195216/docroot/docs/pubpts.json",
        fs = require("fs");


    function usage () {
        console.log("    Usage:");
        console.log("node jas.js [filepath]");
        console.log("  filepath defaults to " + jfn);
        console.log("");
    }


    function stats () {
        var jsfile, path, json, objs, stat;
        if(process.argv[2]) {
            jfn = process.argv[2]; }
        path = process.argv[1].slice(0, -1 * "jas.js".length);
        path += jfn;
        json = fs.readFileSync(path, {encoding:"utf8"});
        objs = json.split("},");
        stat = {count:objs.length, total:json.length, min:10000, max:0};
        stat.avg = Math.round(stat.total / stat.count);
        objs.forEach(function (jtxt) {
            stat.min = Math.min(stat.min, jtxt.length);
            stat.max = Math.max(stat.max, jtxt.length); });
        //mac finder reports "k" sizes as bytes/1000 which is easier, but
        //also helpful to know the 1024 version.
        console.log("count: " + stat.count + 
                    ", total: " + Math.round(stat.total / 1000) + "(" +
                                  Math.round(stat.total / 1024) + ")k" +
                    ", min: " + stat.min + ", max: " + stat.max +
                    ", avg: " + stat.avg);
    }


    return {
        run: function () { stats(); }
    };
}());

jas.run();
