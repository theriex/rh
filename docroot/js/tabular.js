/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.tabular = (function () {
    "use strict";

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
                  "Sep", "Oct", "Nov", "Dec"];


    function dateSpan (dobj, prefix) {
        var sc, pd;
        if(!dobj || !dobj.year) {
            return ""; }
        prefix = prefix || "";
        sc = prefix? "tdspan" : "tdspanyo";
        if(dobj.year > 0) {
            pd = prefix + dobj.year; }
        else {
            pd = prefix + (dobj.year * -1) + " " + jt.tac2html(
                ["span", {cla: "bcespan"}, "BCE"]); }
        if(dobj.month) {
            sc = "tdspan";
            pd += months[dobj.month - 1]; }
        if(dobj.day) {
            pd += dobj.day; }
        return jt.tac2html(["span", {cla: sc}, pd]);
    }


    function cleanTDValue (text) {
        text = text.replace(/\t/g, " ");
        text = text.replace(/\n/g, " ");
        return text;
    }


    function display (srchst) {
        var outdiv, dlh, html;
        outdiv = jt.byId("tcontdiv");
        outdiv.innerHTML = jt.tac2html(
            ["div", {id:"downloadlinkdiv"},
             ["span", {cla:"procspan"}, "Processing..."]]);
        dlh = "Date\tText\n";
        app.data.pts.forEach(function (pt) {
            var linediv, ddc = pt.remembered ? "trowdescdivrem" : "trowdescdiv";
            if(!srchst || app.mode.ptmatch(pt)) {
                dlh += pt.date + "\t" + cleanTDValue(pt.text) + "\n";
                linediv = document.createElement("div");
                linediv.innerHTML = jt.tac2html(
                    ["div", {cla: "trowdiv"},
                     [["div", {cla: "trowdatediv"},
                       [dateSpan(pt.start),
                        ["br"],
                        dateSpan(pt.end, "-"),
                        ["span", {cla: "tcspan"}, " (" + pt.code + ") "]]],
                      ["div", {cla: ddc}, pt.text]]]);
                outdiv.appendChild(linediv); } });
        dlh = "data:text/plain;charset=utf-8," + encodeURIComponent(dlh);
        jt.out("downloadlinkdiv", jt.tac2html(
            ["a", {href:dlh, id:"downloadlink", download:"ARHiNT.tsv",
                   title:"Download the displayed points"},
             [["img", {src:"img/download.png", cla:"downloadlinkimg"}],
              "Download"]]));
    }


    return {
        display: function () { display(); },
        search: function (srchst) { display(srchst); }
    };
}());
