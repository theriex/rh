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
                data.pts.push({code: tl.code, date: pt.date, text: pt.desc}); 
            });
        });
    }


    function yearFromDate (date) {
        var year = +(date.match(/\d\d?\d?\d?/)[0])
        if(date.indexOf(" BCE") > 0) {
            year *= -1; }
        return year;
    }


    function writeDataFile () {
        var toSource = require("tosource"), ddpts = [];
        data.pts.sort(function (a, b) {
            var yra = yearFromDate(a.date), yrb = yearFromDate(b.date);
            if(yra < yrb) { return -1; }
            if(yra > yrb) { return 1; }
            return 0; });
        data.pts.forEach(function (pt) {
            if(ddpts.length && ddpts[ddpts.length - 1].text === pt.text) {
                ddpts[ddpts.length - 1].code += pt.code; }
            else {
                ddpts.push(pt); } });
        data.pts = ddpts;
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

