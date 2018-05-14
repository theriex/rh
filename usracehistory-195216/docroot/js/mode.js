/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

//Menu and other top nav area functionality.
app.mode = (function () {
    "use strict";

    var mode = "interactive",  //linear only. "reference" is linear or text
        ms = null,  //mode state detail variables
        srchst = null;


    function clearSearchState () {
        srchst = {tlcode:"", qstr:"", status:""};
    }


    function showModeElements (chmode) {
        mode = chmode || mode;
        if(!jt.byId("refdiv")) {
            jt.log("showModeElements divs not available to show");
            return; }
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
            clearSearchState();  //init
            html = [["div", {id:"refdiv", style:"width:" + ms.w + "px;" +
                             //reduce height by 10 to not overflow select box
                             "height:" + (ms.h - 10) + "px;"},
                     "Reference Title"],
                    ["div", {id:"levdiv"},
                     ["svg", {id:"svgnav", width:ms.w, height:ms.h}]],
                    ["div", {id:"noticediv",
                             style:"width:" + (ms.w - 60) + "px;" +
                                   "opacity:1.0"},
                     ["Please help report any bugs ",
                      ["img", {cla:"noticeimg", src:"img/forward.png"}]]]];
            jt.out(ms.divid, jt.tac2html(html));
            ms.progsvg = d3.select("#svgnav");
            d3.select("#noticediv").transition().delay(800).duration(5000)
                .style("opacity", 0.0); }
        showModeElements();
    }


    function updateLevelDisplay (currlev) {
        var ti = {fs: 18,   //font size for level number
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
                .text(String(currlev.lev.num));
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
        ms.prog.prfill.attr("width", Math.round(currlev.lev.levpcnt * rc.w));
        ms.prog.levnum.text(String(currlev.lev.num));
        ms.currlev = currlev;
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
    }


    function highlightCircles (points, task) {
        var tl = app.linear.tldata(),
            dur = Math.round(0.8 * task.dur);  //finish trans before task ends
        points.forEach(function (d) {
            jt.log("highlight " + d.id + ": " + jt.byId("d.id"));
            tl.focus.select("#" + d.id)
                .style("fill", "0f0"); });
        points.forEach(function (d) {
            tl.focus.select("#" + d.id)
                //setting z-index has no effect, even if initialized.
                .style("fill", "#FF0000")
                .transition().duration(dur)
                .attr("r", 10);   //was 5
        });
    }


    function normalizeCircles (points, task) {
        var tl = app.linear.tldata(),
            dur = Math.round(0.8 * task.dur);  //finish trans before task ends
        points.forEach(function (d) {
            tl.focus.select("#" + d.id)
                .style("fill", app.linear.fillColorForPoint(d))
                .transition().duration(dur)
                .attr("r", 5);   //original value
        });
    }


    function next () {
        if(ms.currpt) {
            normalizeCircles([ms.currpt], {dur:250}); }
        if(!ms.points || !ms.points.length) {
            return app.dlg.saveprog(); }
        ms.currpt = ms.points.pop();
        highlightCircles([ms.currpt], {dur:800});
        app.linear.clickCircle(ms.currpt);
    }


    function changeMode (chmode) {
        chmode = chmode || mode;
        showModeElements(chmode);
        if(mode === "interactive") {
            if(ms.disp === "text") {
                toggleDisplay(); }
            clearSearchState();
            app.db.nextInteraction(); }
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
            if(app.user && app.user.tok) {
                html.push(["div", {cla:"menulinemain"},
                           ["a", {href:"#profile",
                                  onclick:jt.fs("app.mode.menu(0, 'myacc')")},
                            "My&nbsp;Account"]]);
                html.push(["div", {cla:"menulinemain"},
                           ["a", {href:"#create",
                                  onclick:jt.fs("app.mode.menu(0, 'newtl')")},
                            "Create&nbsp;Timeline"]]);
                html.push(["div", {cla:"menulinemain"},
                           ["a", {href:"#SignOut",
                                  onclick:jt.fs("app.mode.menu(0, 'signout')")},
                            "Sign&nbsp;Out"]]); }
            else { //not signed in
                html.push(["div", {cla:"menulinemain"},
                           ["a", {href:"#SignIn",
                                  onclick:jt.fs("app.mode.menu(0,'signin')")},
                            "Sign&nbsp;In"]]); }
            html.push(["div", {cla:"menulinemain"},
                       ["a", {href:"#support",
                              onclick:jt.fs("app.mode.menu(0,'support')")},
                        "Support"]]); }
        jt.out("menudiv", jt.tac2html(html));
        mdiv = jt.byId("menudiv");
        //mdiv.offsetWidth may be zero until all the images load.
        leftx = window.innerWidth - (Math.max(mdiv.offsetWidth, 30) + 10);
        mdiv.style.left = leftx + "px";
        if(select) {
            jt.byId("itemdispdiv").style.visibility = "hidden";
            jt.byId("suppvisdiv").style.visibility = "hidden";
            switch(select) {  //update title if needed
            case "refmode": jt.out("refdiv", "Reference Mode"); break;
            case "newtl": jt.out("refdiv", "Create Timeline"); break; }
            switch(select) {  //next action
            case "visual": changeMode("interactive"); break;
            case "refmode": changeMode("reference"); break;
            case "support": app.support.display(ms); break; 
            case "signin": app.dlg.signin(); break;
            case "myacc": app.dlg.myacc(); break;
            case "newtl": app.tabular.tledit(); break;
            case "signout": app.dlg.logout(); break; } }
    }


    function start (tl, currlev) {
        ms = {divid:tl.divid, tl:tl, w:tl.width, h:30};  //reset mode state
        jt.byId("tcontdiv").style.top = String(ms.h) + "px";
        ms.disp = "linear";  //other option is "text"
        verifyDisplayElements();
        currlev = currlev || app.db.recalcProgress();
        updateLevelDisplay(currlev);
        displayMenu();
        app.dlg.init(tl);
        jt.log("mode.start calling db.nextInteraction");
        app.db.nextInteraction();
        //TEST: Uncomment to launch menu command after first interaction
        // setTimeout(function () {
        //     var mc = "newtl";
        //     jt.log("mode.start TEST menu: " + mc);
        //     app.mode.menu(0, mc); }, 200);
    }


    function showSelectStat (points, task) {
        var tl = app.linear.tldata();
        task.msg = "Selecting " + points.length + " Facts";
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


    function showNextPoints (points, tasks) {
        var task;
        app.dlg.close();  //verify not displayed
        if(ms.disp === "text") { 
            jt.log("mode.showNextPoints call ignored (not in linear mode)");
            return;}
        if(!points || !points.length) {
            jt.log("mode.showNextPoints received no points");
            return; }
        if(!tasks) {
            tasks = [{cmd:"unzoom", dur:100},
                     {cmd:"highlight", dur:1400},
                     {cmd:"normalize", dur:100}]; }
        if(!tasks.length) {   //done with display tasks,
            ms.points = points.slice();  //verify chewable copy
            return next(); }  //continue to next interaction
        task = tasks[0];
        tasks = tasks.slice(1);
        switch(task.cmd) {
        case "unzoom":
            app.linear.unzoom();
            showSelectStat(points, task);
            break;
        case "highlight":
            highlightCircles(points, task);
            break;
        case "normalize":
            normalizeCircles(points, task);
            jt.byId("suppvisdiv").style.visibility = "hidden";
            break;
        default:
            jt.log("Unknown task.cmd " + task.cmd); }
        setTimeout(function () {
            showNextPoints(points, tasks); }, task.dur || 0);
    }


    function isMatchingPoint (pt) {
        if(srchst) {
            if(srchst.qstr) {
                if(pt.text.toLowerCase().indexOf(srchst.qstr) < 0) {
                    return false; } }
            if(srchst.tlcode) {
                if(pt.codes.indexOf(srchst.tlcode) < 0) {
                    return false; } } }
        return true;
    }


    function endSuppViz(module, start, end) {
        if(mode === "interactive") {
            app.db.svdone(module, start, end);
            app.dlg.saveprog(); }  //launches next interaction after save
        //close the display
        d3.select("#suppvisdiv")
            .style("visibility", "hidden");
    }


    return {
        start: function (tl, currlev) { start(tl, currlev); },
        next: function () { next(); },
        chmode: function (mode) { changeMode(mode); },
        ptmatch: function (pt) { return isMatchingPoint(pt); },
        menu: function (expand, select) { displayMenu(expand, select); },
        showNextPoints: function (points) { showNextPoints(points); },
        searchstate: function () { return srchst; },
        updlev: function (currlev) { updateLevelDisplay(currlev); },
        svdone: function (m, s, e) { endSuppViz(m, s, e); },
        requeue: function (pt) { ms.points.push(pt); }
    };
}());
