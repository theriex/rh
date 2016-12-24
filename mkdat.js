mkdat = (function () {
    "use strict";

    var data = {}, 
        fs = require("fs");


    function readTimelines (tls) {
        data.credit = tls[0].credit;
        data.timelines = [];
        data.pts = [];
        tls.forEach(function (tl) {
            console.log(tl.code + ": " + tl.name + " (" + tl.ident + ")");
            data.timelines.push({name: tl.name, ident: tl.ident, code: tl.code,
                                 over: tl.over, resources: tl.resources});
            tl.entries.forEach(function (pt) {
                data.pts.push({id: tl.code + pt.date.match(/\d\d?\d?\d?/)[0],
                               date: pt.date, text: pt.desc}); 
            });
        });
    }


    function writeDataFile () {
        var toSource = require("tosource");
        data.pts.sort(function (a, b) {
            (a < b) ? -1 : +(a > b); });
        fs.writeFile("./docroot/js/data.js",
                     "app.data = " + toSource(data) + ";\n",
                     {encoding: 'utf8'},
                     function (err) {
                         if(err) {
                             throw err; } });
    }


    return {
        readTimelines: function (tls) { readTimelines(tls); },
        writeDataFile: function () { writeDataFile(); }
    };

}());

mkdat.readTimelines([require("./dat/AsAmTimeline.js"),
                     require("./dat/BlackTimeline.js"),
                     require("./dat/LatinxTimeline.js"),
                     require("./dat/MENATimeline.js"),
                     require("./dat/MultiTimeline.js"),
                     require("./dat/NativeAmTimeline.js")]);
mkdat.writeDataFile();

