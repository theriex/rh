/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.mode = (function () {
    "use strict";

    var mode = "interactive",  //linear only. "reference" is linear or text
        fetchpoints = null,
        series = null,
        ms = {};  //mode state detail variables


    function showModeElements (chmode) {
        mode = chmode || mode;
        if(mode === "interactive") {
            jt.byId("refdiv").style.display = "none";
            jt.byId("levdiv").style.display = "block"; }
        else {  //"reference"
            jt.byId("refdiv").style.display = "block";
            jt.byId("levdiv").style.display = "none"; }
    }


    function verifyDisplayElements () {
        var html;
        if(!ms.progsvg) {
            html = [["div", {id:"refdiv", style:"width:" + ms.w + "px;" +
                                                "height:" + ms.h + "px;"},
                     ["a", {href:"#interactive",
                            onclick:jt.fs("app.mode.chmode('interactive')")},
                      ["img", {src:"img/info.png"}]]],
                    ["div", {id:"levdiv"},
                     ["svg", {id:"svgnav", width:ms.w, height:ms.h}]]];
            jt.out(ms.divid, jt.tac2html(html));
            ms.progsvg = d3.select("#svgnav"); }
        showModeElements();
    }


    function getPointsForDisplay () {
        if(fetchpoints) {
            app.lev.updateVisited(fetchpoints); }
        fetchpoints = app.lev.getNextPoints();
        series = fetchpoints.slice();  //working copy to chew up
    }


    function updateLevelDisplay () {
        var proginfo = app.lev.progInfo(),
            ti = {fs: 18,   //font size for level number
                  p: {t: 1, r: 2, b: 1, l: 2},  //padding top right bottom left
                  m: {t: 3, r: 2, b: 0, l: 3}}, //margin  top right bottom left
            tc = {x: ti.m.l + ti.p.l,
                  y: ti.m.t + ti.p.t + ti.fs,
                  h: ti.p.t + ti.fs + ti.p.b,
                  w: ti.p.l + ti.fs + ti.p.r},
            rc = {x: tc.x + tc.w + ti.m.r,
                  y: Math.floor(tc.h / 2),
                  h: Math.floor(tc.h / 4),
                  w: ms.w - (tc.x + tc.w)};
        if(!ms.prog) {
            ms.prog = {};
            ms.prog.g = ms.progsvg.append("g");
            ms.prog.levrect = ms.prog.g.append("rect")
                .attr("class", "levnumbackrect")
                .attr("ry", 5)
                .attr("x", tc.x - ti.p.l)
                .attr("y", ti.m.t)
                .attr("height", tc.h)
                .attr("width", tc.w);
            ms.prog.levnum = ms.prog.g.append("text")
                .attr("class", "levelnumber")
                .attr("text-anchor", "middle")  //variable width font
                .attr("x", ti.m.l + Math.round(tc.w / 2))
                .attr("y", tc.y - ti.p.t)
                .attr("dy", "-.1em")   //fudge text baseline
                .attr("font-size", ti.fs)
                .text(String(proginfo.level));
            ms.prog.prback = ms.prog.g.append("rect")
                .attr("class", "progbarback")
                .attr("x", rc.x)
                .attr("y", rc.y)
                .attr("height", rc.h)
                .attr("width", rc.w);
            ms.prog.prfill = ms.prog.g.append("rect")
                .attr("class", "progbarfilled")
                .attr("id", "progdisprect")
                .attr("x", rc.x)
                .attr("y", rc.y)
                .attr("height", rc.h)
                .attr("width", 0); }
        ms.prog.prfill.attr("width", Math.round(proginfo.levpcnt * rc.w));
        ms.prog.levnum.text(String(proginfo.level));
    }


    function start (divid, tl) {
        ms.divid = divid;
        ms.tl = tl;
        ms.w = tl.width;
        ms.h = 30;
        verifyDisplayElements();
        getPointsForDisplay();
        updateLevelDisplay();
        app.dlg.init(tl);
        //app.linear.clickCircle(app.lev.suppVisByCode("in").pts[0]);
        if(series && series.length) {
            showModeElements("interactive");
            app.dlg.start(jt.fs("app.mode.next()")); }
        else {
            showModeElements("reference"); }
    }


    function next () {
        app.dlg.close();
        if(!series || !series.length) {
            app.db.saveState();
            getPointsForDisplay();
            updateLevelDisplay();
            app.dlg.save(jt.fs("app.mode.nextPass()")); }
        else {
            ms.currpt = series.pop();
            app.linear.clickCircle(ms.currpt); }
    }


    function nextPass () {
        app.dlg.nextColorTheme();
        next();
    }


    function changeMode (chmode) {
        showModeElements(chmode);
        if(mode === "interactive") {
            if(ms.currpt) {  //return to the point being shown before
                app.linear.clickCircle(ms.currpt); }
            else if(series && series.length) {  //closed start or save dlg
                ms.currpt = series.pop();
                app.linear.clickCircle(ms.currpt); }
            else {  //no points left for display, show final supp vis again
                app.linear.clickCircle(app.lev.suppVisByCode("fi").pts[0]); } }
    }


    return {
        start: function (divid, tl) { start(divid, tl); },
        next: function () { next(); },
        nextPass: function () { nextPass(); },
        chmode: function (mode) { changeMode(mode); }
    };
}());
