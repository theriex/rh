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
        app.data.ptcs.forEach(function (tl) {
            if(tl.type !== "marker") {
                tlopts.push(["option", {value:tl.code}, 
                             tl.ident + " (" + tl.name + ")"]); } });
        if(!ms.progsvg) {
            clearSearchState();  //init
            html = [["div", {id:"refdiv", style:"width:" + ms.w + "px;" +
                                                "height:" + ms.h + "px;"},
                     [["input", {type:"text", id:"srchin", size:25,
                                 placeholder:"Filter text...",
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
        //      slavery:B2, lynching:B120.
        // if(!ms.teststart) {
        //     ms.teststart = true;
        //     var testcids = ["B120"];
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
                app.dlg.start(jt.fs("app.mode.showNext()")); } }
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


    function showSelectStat (task, info) {
        var tl = app.linear.tldata();
        if(info.level <= 1) {
            task.msg = "Selecting " + series.length + " Lesser Known Facts"; }
        else {
            task.msg = "Selecting " + series.length + " Facts"; }
        jt.out("suppvisdiv", jt.tac2html(
            ["div", {id:"statmsgdiv"}, task.msg]));
        d3.select("#suppvisdiv")
            .style("left", tl.margin.left + "px")
            .style("top", tl.margin.top + "px")
            .style("width", tl.width2 + "px")
            .style("height", 5 + "px")  //squeeze into div padding
            .style("background", "#CCC")
            .style("visibility", "visible");
    }


    function highlightCircles (task) {
        var tl = app.linear.tldata();
        fetchpoints.forEach(function (d) {
            tl.focus.select("#" + d.id)
                //setting z-index has no effect, even if initialized.
                .style("fill", "#FF0000")
                .transition().duration(0.8 * task.dur)
                .attr("r", 10);   //was 5
        });
    }


    function normalizeCircles (task) {
        var tl = app.linear.tldata();
        fetchpoints.forEach(function (d) {
            tl.focus.select("#" + d.id)
                .transition().duration(0.8 * task.dur)
                .attr("r", 5);   //original value
        });
    }


    function showNextPoints (tasks) {
        var info = app.lev.progInfo(), task;
        app.dlg.close();
        if(!tasks) {
            tasks = [{cmd:"unzoom", dur:100},
                     {cmd:"highlight", dur:1400},
                     {cmd:"normalize", dur:100}]; }
        if(!tasks.length) {
            return next(); }
        task = tasks[0];
        tasks = tasks.slice(1);
        switch(task.cmd) {
        case "unzoom":
            app.linear.unzoom();
            showSelectStat(task, info);
            break;
        case "highlight":
            highlightCircles(task);
            break;
        case "normalize":
            normalizeCircles(task);
            jt.byId("suppvisdiv").style.visibility = "hidden";
            break;
        default:
            jt.log("Unknown task.cmd " + task.cmd); }
        setTimeout(function () {
            showNextPoints(tasks); }, task.dur || 0);
    }


    function nextPass () {
        app.dlg.nextColorTheme();
        showNextPoints();
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
            jt.byId("itemdispdiv").style.visibility = "hidden";
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


    function displayMenu (expand, select) {
        var html, mdiv, leftx;
        html = ["a", {href:"#menu", onclick:jt.fs("app.mode.menu(" + 
                                                  !expand + ")")},
                ["img", {src:"img/menuicon.png", //50x38
                         style:"max-height:20px;max-width:30px;"}]];
        if(expand) {
            html = [["div", {cla:"menuline", style:"text-align:right"}, html]];
            if(mode === "interactive") {
                html.push(["div", {cla:"menulinemain"},
                           ["a", {href:"#refmode",
                                  onclick:jt.fs("app.mode.menu(0,'refmode')")},
                            "Reference&nbsp;Mode"]]); }
            else { //in reference mode
                html.push(["div", {cla:"menulinemain"},
                           ["a", {href:"#visual", 
                                  onclick:jt.fs("app.mode.menu(0,'visual')")},
                            "Interactive&nbsp;Mode"]]); }
            if(app.user) {
                html.push(["div", {cla:"menulinemain"},
                           ["a", {href:"SignOut",
                                  onclick:jt.fs("app.mode.menu(0, 'signout')")},
                            "Sign&nbsp;Out"]]); }
            else { //not signed in
                html.push(["div", {cla:"menulinemain"},
                           ["a", {href:"#SignIn",
                                  onclick:jt.fs("app.mode.menu(0,'signin')")},
                            "Sign&nbsp;In"]]); }
            html.push(["div", {cla:"menulinemain"},
                       ["a", {href:"#about",
                              onclick:jt.fs("app.mode.menu(0,'about')")},
                        "About"]]); }
        jt.out("menudiv", jt.tac2html(html));
        mdiv = jt.byId("menudiv");
        //mdiv.offsetWidth may be zero until all the images load.
        leftx = window.innerWidth - (Math.max(mdiv.offsetWidth, 30) + 10);
        mdiv.style.left = leftx + "px";
        if(select) {
            jt.byId("itemdispdiv").style.visibility = "hidden";
            jt.byId("suppvisdiv").style.visibility = "hidden";
            switch(select) {
            case "visual": changeMode("interactive"); break;
            case "refmode": changeMode("reference"); break;
            case "about": app.about.display(ms); break; 
            case "signin": app.dlg.signin(); break;
            case "signout": app.signout(); break; } }
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
        menu: function (expand, select) { displayMenu(expand, select); },
        showNext: function () { showNextPoints(); }
    };
}());
