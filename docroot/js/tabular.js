/*jslint browser, multivar, white, fudge */

app.tabular = (function () {
    "use strict";

    function display() {
        var outdiv = jt.byId(app.dispdivid);
        outdiv.innerHTML = jt.tac2html(["div", {id: "tcontdiv"}]);
        app.data.pts.forEach(function (pt) {
            var linediv = document.createElement("div");
            linediv.innerHTML = jt.tac2html(
                ["div", {cla: "trowdiv"},
                 [["div", {cla: "trowdatediv"},
                   [["span", {cla: "tcspan"}, "(" + pt.code + ") "],
                    ["span", {cla: "tdspan"}, pt.date]]],
                  ["div", {cla: "trowdescdiv"}, pt.text]]]);
            outdiv.appendChild(linediv); });
    }

    return {
        display: function () { display(); }
    };
}());
