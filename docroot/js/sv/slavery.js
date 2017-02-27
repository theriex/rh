/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

// Display a map of the US, forward and back nav buttons, play/pause, exit
// (exit requires answering a question). Slave states in blood red.
// Territories mapped to nearest modern state boundary.

app.slavery = (function () {
    "use strict";

    var sv = null,
        tl = null,
        endf = null,
        chart = {colors: {bg: "#fff5ce", bbg: "#fdd53a", bb: "#7d6a22"}},
        exited = false;


    function initDisplayElements () {
        d3.select("#suppvisdiv")
            .style("left", tl.margin.left + "px")
            .style("top", tl.margin.top + "px")
            .style("width", 30 + "px")
            .style("height", 30 + "px")
            .style("background", chart.colors.bg)
            .style("visibility", "visible")
            .transition().duration(2000)
            .style("width", tl.width2 + "px")
            .style("height", tl.height + "px")
        jt.out("suppvisdiv", jt.tac2html(
            ["svg", {id: "svgin", width: tl.width2, height: tl.height}]));
        chart.vg = d3.select("#svgin").append("g");
    }


    function closeAndReturn () {
        var nowiso;
        if(!exited) {
            exited = true;
            nowiso = (new Date()).toISOString();
            sv.pts.forEach(function (pt) {
                pt.visited = nowiso; });
            sv.visited = nowiso;
            d3.select("#suppvisdiv")
                .style("visibility", "hidden");
            endf(); }
    }


    function displayContent () {
        jt.err("displayContent not implemented yet.");
    }


    function display (suppvis, timeline, endfunc) {
        sv = suppvis;
        tl = timeline;
        endf = endfunc;
        initDisplayElements();
        displayContent();
    }


    return {
        display: function (sv, tl, endf) { display(sv, tl, endf); },
    };
}());

