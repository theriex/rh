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


    function display (srchst) {
        var outdiv = jt.byId("tcontdiv");
        outdiv.innerHTML = "";  //rebuild each time in case filtered
        app.data.pts.forEach(function (pt) {
            var linediv;
            if(!srchst || app.mode.ptmatch(pt)) {
                linediv = document.createElement("div");
                linediv.innerHTML = jt.tac2html(
                    ["div", {cla: "trowdiv"},
                     [["div", {cla: "trowdatediv"},
                       [dateSpan(pt.start),
                        ["br"],
                        dateSpan(pt.end, "-"),
                        ["span", {cla: "tcspan"}, " (" + pt.code + ") "]]],
                      ["div", {cla: "trowdescdiv"}, pt.text]]]);
                outdiv.appendChild(linediv); } });
    }


    return {
        display: function () { display(); },
        search: function (srchst) { display(srchst); }
    };
}());
