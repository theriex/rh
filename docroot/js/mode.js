/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.mode = (function () {
    "use strict";

    var mode = "interactive",  //linear only. "reference" is linear or text
        fetchpoints = null,
        series = null,
        ms = {},  //mode state detail variables
        srchst = null;


    function clearSearchState () {
        srchst = {tlcode:"", qstr:"", status:""};
    }


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
        var tlopts, html, srchfstr;
        srchfstr = jt.fs("app.mode.updatesrch()");
        tlopts = [["option", {value:""}, "All"]];
        app.data.timelines.forEach(function (tl) {
            if(tl.code !== "U" && tl.code !== "D") {
                tlopts.push(["option", {value:tl.code}, 
                             tl.ident + " (" + tl.name + ")"]); } });
        if(!ms.progsvg) {
            clearSearchState();  //init
            html = [["div", {id:"refdiv", style:"width:" + ms.w + "px;" +
                                                "height:" + ms.h + "px;"},
                     [["div", {id:"aboutdiv"},
                       ["a", {href:"#about", onclick:jt.fs("app.mode.about()")},
                        "?"]],
                      ["a", {href:"#interactive",
                             onclick:jt.fs("app.mode.chmode('interactive')")},
                       ["img", {id:"interactimg", src:"img/info.png"}]],
                      //hiding display toggle for now, simplified interface...
                      //["a", {id:"disptoggle", href:"#textmode",
                      //       onclick:jt.fs("app.mode.togdisp()")},
                      // ["img", {id:"disptoggleimg", src:"img/disptext.png"}]],
                      ["input", {type:"text", id:"srchin", size:25,
                                 placeholder:"Search for...",
                                 value:srchst.qstr, oninput:srchfstr}],
                      ["span", {cla:"srchinspan"}, "&nbsp;in&nbsp;"],
                      ["select", {id:"tlsel", onchange:srchfstr}, tlopts]]],
                    ["div", {id:"levdiv"},
                     ["svg", {id:"svgnav", width:ms.w, height:ms.h}]]];
            jt.out(ms.divid, jt.tac2html(html));
            ms.progsvg = d3.select("#svgnav"); }
        jt.byId("tlsel").style.width = "64px";
        showModeElements();
    }


    function getPointsForDisplay () {
        if(fetchpoints) {
            app.lev.updateVisited(fetchpoints); }
        fetchpoints = app.lev.getNextPoints();
        //TEST: Uncomment if specific points for testing at startup
        // if(!ms.teststart) {
        //     ms.teststart = true;
        //     var testcids = ["A188"];
        //     ms.skipstart = true;
        //     fetchpoints = [];
        //     app.data.pts.forEach(function (pt) {
        //         if(testcids.indexOf(pt.cid) >= 0) {
        //             fetchpoints.push(pt); } }); }
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


    function start (tl) {
        ms.divid = tl.divid;
        ms.tl = tl;
        ms.w = tl.width;
        ms.h = 30;
        jt.byId("tcontdiv").style.top = String(ms.h) + "px";
        ms.disp = "linear";  //other option is "text"
        verifyDisplayElements();
        getPointsForDisplay();
        updateLevelDisplay();
        app.dlg.init(tl);
        //app.linear.clickCircle(app.lev.suppVisByCode("in").pts[0]);
        if(series && series.length) {
            showModeElements("interactive");
            if(ms.skipstart) {
                app.mode.next(); }
            else {
                app.dlg.start(jt.fs("app.mode.next()")); } }
        else {
            showModeElements("reference"); }
    }


    function next (quiet) {
        var levstart, levend;
        app.dlg.close();
        app.db.noteStartTime();
        if(!series || !series.length || quiet) {
            levstart = app.lev.progInfo();
            app.db.saveState();
            getPointsForDisplay();
            updateLevelDisplay();
            levend = app.lev.progInfo();
            if(mode === "interactive" && (levstart.level !== levend.level || 
                                          !series.length)) {  //no more levels
                app.linear.levelCompleted(levstart); }
            else if(quiet) {
                app.mode.nextPass(); }
            else {
                app.dlg.save(jt.fs("app.mode.nextPass()")); } }
        else {
            ms.currpt = series.pop();
            app.linear.clickCircle(ms.currpt); }
    }


    function nextPass () {
        app.dlg.nextColorTheme();
        next();
    }


    function interject (pt) {
        if(ms.currpt) {  //have previously auto-selected point for display
            series.push(ms.currpt);  //put it back on the queue for next
            ms.currpt = null; }
        if(!pt.visited && !pt.sv) {  //count interject point in traversal
            if(series.length) {  //not interjecting from start dialog..
                series = series.slice(1); } }  //remove lastmost series point
        app.linear.clickCircle(pt);
    }


    function updateSearchDisplay () {
        var updf;
        if(srchst.status === "processing") {
            srchst.pending = true;
            return; }
        srchst.status = "processing";
        srchst.qstr = jt.byId("srchin").value;
        if(srchst.qstr) {
            srchst.qstr = srchst.qstr.toLowerCase(); }
        srchst.tlcode = jt.byId("tlsel").value;
        if(ms.disp === "text") {
            updf = app.tabular.search; }
        else {
            updf = app.linear.search; }
        setTimeout(function () {  //async update to stay responsive
            updf(srchst);
            srchst.status = "";
            if(srchst.pending) {
                srchst.pending = false;
                updateSearchDisplay(); } }, 400);
    }


    function isMatchingPoint (pt) {
        if(srchst) {
            if(srchst.qstr) {
                if(pt.text.toLowerCase().indexOf(srchst.qstr) < 0) {
                    return false; } }
            if(srchst.tlcode) {
                if(pt.code.indexOf(srchst.tlcode) < 0) {
                    return false; } } }
        return true;
    }


    function toggleDisplay () {
        if(ms.disp === "linear") {
            // jt.byId("disptoggle").href = "#linearmode";
            // jt.byId("disptoggleimg").src = "img/displinear.png";
            jt.byId("abgdiv").style.display = "none";
            jt.byId("lcontdiv").style.display = "none";
            jt.byId("tcontdiv").style.display = "block";
            ms.disp = "text";
            app.tabular.display(); }  //rebuild contents each time
        else {
            // jt.byId("disptoggle").href = "#textmode";
            // jt.byId("disptoggleimg").src = "img/disptext.png";
            jt.byId("abgdiv").style.display = "block";
            jt.byId("lcontdiv").style.display = "block";
            jt.byId("tcontdiv").style.display = "none";
            ms.disp = "linear"; }
        updateSearchDisplay();
    }


    function changeMode (chmode) {
        showModeElements(chmode);
        if(mode === "interactive") {
            if(ms.disp === "text") {
                toggleDisplay(); }
            clearSearchState();
            if(ms.currpt) {  //return to the point being shown before
                app.linear.clickCircle(ms.currpt); }
            else if(series && series.length) {  //closed start or save dlg
                ms.currpt = series.pop();
                app.linear.clickCircle(ms.currpt); }
            else {  //no points left for display, show final supp vis again
                app.linear.clickCircle(app.lev.suppVisByCode("fi").pts[0]); } }
        else { //"reference"
            if(ms.disp !== "text") {
                toggleDisplay(); } }
    }


    return {
        start: function (divid, tl) { start(divid, tl); },
        next: function () { next(); },
        nextPass: function () { nextPass(); },
        nextQuiet: function () { next(true); },
        chmode: function (mode) { changeMode(mode); },
        togdisp: function () { toggleDisplay(); },
        updatesrch: function () { updateSearchDisplay(); },
        ptmatch: function (pt) { return isMatchingPoint(pt); },
        interject: function (pt) { interject(pt); },
        about: function () { app.about.display(); }
    };
}());
