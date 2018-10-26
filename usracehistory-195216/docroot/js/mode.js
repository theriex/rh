/*jslint browser, multivar, white, fudge, for */
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
                     ["Help and more ",
                      ["img", {cla:"noticeimg", src:"img/forward.png"}]]]];
            jt.out(ms.divid, jt.tac2html(html));
            ms.progsvg = d3.select("#svgnav");
            d3.select("#noticediv").transition().delay(800).duration(5000)
                .style("opacity", 0.0); }
        showModeElements();
    }


    function initProgBarElements (currlev, ti, tc, rc) {
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
            .attr("width", 0);
    }


    function updateLevelDisplay (currlev) {
        var ti = {fs: 18,   //font size for level number
                  p: {t: 1, r: 2, b: 1, l: 2},  //padding top right bottom left
                  m: {t: 3, r: 2, b: 0, l: 3}}, //margin  top right bottom left
            tc = {x: ti.m.l + ti.p.l,    //text coordinates (level number)
                  y: ti.m.t + ti.p.t + ti.fs,
                  h: ti.p.t + ti.fs + ti.p.b,
                  w: ti.p.l + ti.fs + ti.p.r},
            rc = {x: tc.x + tc.w + ti.m.r,   //rect coordinates (prog bar)
                  y: Math.floor(tc.h / 2),
                  h: Math.floor(tc.h / 4),
                  w: ms.w - (tc.x + tc.w)},
            calc = {pcnt:currlev.lev.levpcnt};
        if(!ms.prog) {
            initProgBarElements(currlev, ti, tc, rc); }
        if(ms.currlev && ms.currlev.lev.remptcounter >= 0) {
            calc.rem = ms.currlev.lev.remptcounter;
            calc.total = ms.currlev.lev.points.length;
            calc.pcnt = (calc.total - calc.rem) / calc.total; }
        ms.prog.prfill.attr("width", Math.round(calc.pcnt * rc.w));
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
            //jt.log("highlight " + d.id + ": " + jt.byId("d.id"));
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
        app.linear.clickCircle(ms.currpt, "interactive");
    }


    function changeMode (chmode) {
        if(chmode === "same") {
            chmode = mode; }
        chmode = chmode || mode;
        showModeElements(chmode);
        if(mode === "interactive") {
            if(ms.disp === "text") {
                toggleDisplay(); }
            clearSearchState();
            app.db.nextInteraction(); }
        else { //"reference"
            if(jt.byId("tlctxdiv")) {
                jt.byId("tlctxdiv").style.display = "none"; }
            if(ms.disp !== "text") {
                toggleDisplay(); } }
    }


    function verifyMenuContent (expand) {
        //best to make sure one of the default menu items has the longest
        //name so offsetWidth of the menu contents doesn't vary.
        var menu = [{m:"visual",  n:"Interactive&nbsp;Mode"},
                    {m:"refmode", n:"Reference&nbsp;Mode"},
                    {m:"myacc",   n:"My&nbsp;Account",      c:"acc"},
                    {m:"newtl",   n:"Create&nbsp;Timeline", c:"acc"},
                    {m:"signout", n:"Sign&nbsp;Out",        c:"acc"},
                    {m:"signin",  n:"Sign&nbsp;In",         c:"noacc"},
                    {m:"support", n:"Support"},
                    {m:"about",   n:"About"}],
            acc = app.user && app.user.tok,
            html = [];
        menu.forEach(function (mi) {
            if(!mi.c || (acc && mi.c === "acc") || (!acc && mi.c === "noacc")) {
                html.push(["div", {cla:"menulinemain"},
                           ["a", {href:"#" + mi.m,
                                  onclick:jt.fs("app.mode.menu(0,'" + mi.m + 
                                                "')")},
                            mi.n]]); } });
        html = [["div", {id:"menuicondiv", style:"text-align:right;"},
                 ["a", {href:"#menu", onclick:jt.fs("app.mode.menu(" + 
                                                    !expand + ")")},
                  ["img", {src:"img/menuicon.png", //50x38
                           style:"max-height:20px;max-width:30px;"}]]],
                ["div", {id:"menulinesdiv", style:"display:none;"},
                 html]];
        jt.out("menudiv", jt.tac2html(html));
        if(expand) {
            jt.byId("menulinesdiv").style.display = "block"; }
    }



    function displayMenu (expand, select) {
        verifyMenuContent(expand);
        if(select) {
            jt.byId("popupdiv").style.visibility = "hidden";
            jt.byId("itemdispdiv").style.visibility = "hidden";
            jt.byId("suppvisdiv").style.visibility = "hidden";
            switch(select) {  //update title if needed
            case "refmode": jt.out("refdiv", "Reference Mode"); break;
            case "newtl": jt.out("refdiv", "Create Timeline"); break; }
            switch(select) {  //next action
            case "visual": changeMode("interactive"); break;
            case "refmode": changeMode("reference"); break;
            case "support": app.support.display(ms.tl, "support"); break; 
            case "about": app.support.display(ms.tl, "about"); break; 
            case "signin": app.dlg.signin(); break;
            case "myacc": app.dlg.myacc(); break;
            case "newtl": app.tabular.tledit(); break;
            case "signout": app.dlg.logout(); break; } }
    }


    function start (tl, currlev) {
        ms = {divid:tl.divid, tl:tl, h:30,    //reset mode state
              w:tl.width - 10};  //leave space for right menu
        jt.byId("tcontdiv").style.top = String(ms.h) + "px";
        ms.disp = "linear";  //other option is "text"
        verifyDisplayElements();
        currlev = currlev || app.db.recalcProgress();
        updateLevelDisplay(currlev);
        displayMenu();
        app.dlg.init(tl);
        jt.log("mode.start calling db.nextInteraction");
        app.db.nextInteraction();
        ms.params = jt.parseParams();
        //TEST harness points now available via url params:
        if(ms.params.menu) {  //e.g. ?menu=refmode
            setTimeout(function () {
                app.mode.menu(0, ms.params.menu); }, 200); }
        else if(ms.params.sv) {  //e.g. ?sv=miscegenation
            setTimeout(function () {
                app.dlg.verifyClosed();
                app.tabular.runsv(ms.params.sv); }, 200); }
    }


    function updateRemainingQuestionsCount (count) {
        if(count !== 0 && count !== -1) {
            count = ms.currlev.lev.rempts.length;
            ms.currlev.lev.remptcounter = count; }
        if(ms && count === -1) {
            count = ms.currlev.lev.remptcounter - 1;
            ms.currlev.lev.remptcounter = count; }
        count = count || 0;
        updateLevelDisplay(ms.currlev);
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
        updateRemainingQuestionsCount();
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


    function endSuppViz (module, start, end) {
        if(mode === "interactive") {
            app.db.svdone(module, start, end);
            app.dlg.saveprog(); }  //launches next interaction after save
        //close the display
        d3.select("#suppvisdiv")
            .style("visibility", "hidden");
    }


    function requeue (pt) {
        if(ms.points.length && ms.points[ms.points.length - 1] === pt) {
            return; }  //don't push the same point twice
        ms.points.push(pt);
    }


    function elapsed (seconds) {
        if(Math.floor(seconds / (24 * 60 * 60)) > 0) {
            return Number(seconds / (24 * 60 * 60)).toFixed(1) + " days"; }
        if(Math.floor(seconds / (60 * 60)) > 0) {
            return Number(seconds / (60 * 60)).toFixed(1) + " hours"; }
        if(Math.floor(seconds / 60) > 0) {
            return Number(seconds / 60).toFixed(1) + " minutes"; }
        return Number(seconds).toFixed(1) + " seconds";
    }


    function getCompletionStats (user, tlid) {
        var html, ce = null, cs, st = "";
        user.completed.forEach(function (comp) {
            if(comp.tlid === tlid) {
                ce = comp; } });
        if(!ce) {
            return "has NOT completed this timeline."; }
        if(ce.stats) {
            cs = ce.stats;
            st = " having studied a total of " + elapsed(cs.pttl + cs.sttl) +
                ", covering " + cs.pcount + " points in " + elapsed(cs.pttl) +
                " (an average of " + elapsed(cs.pavg) + " per point)";
            if(cs.scount) {
                st += " and " + cs.scount + " supplemental visualizations in " +
                    elapsed(cs.sttl) + " (an average of " + elapsed(cs.savg) +
                    " per visualization)"; }
            st += "."; }
        html = ["has completed ",
                ["span", {id:"ctltitlespan"}, ce.title], " ", 
                ["span", {id:"ctlsubtspan"}, ce.subtitle],
                " on ",
                jt.colloquialDate(ce.latest, false, "z2loc,nodaily"),
                st];
        return html;
    }


    function displayCompletionCertificate (user, tlid) {
        var html, website = user.web || "";
        if(user.web) {
            website = ["a", {href:user.web, 
                             onclick:jt.fs("window.open('" + user.web + "')")},
                       user.web]; }
        html = ["div", {id:"certcontdiv"},
                [["div", {id:"certnamediv"}, user.name],
                 ["div", {id:"certtitlediv"}, user.title],
                 ["div", {id:"certwebdiv"}, website],
                 ["div", {id:"certuiddiv"}, "(user id: " + user.instid + ")"],
                 ["div", {id:"certstatsdiv"}, getCompletionStats(user, tlid)]]];
        jt.out("rhcontentdiv", jt.tac2html(html));
    }


    function showCompletionCertificate () {
        var params = jt.parseParams("String");
        jt.out("rhcontentdiv", "Fetching completion certificate...");
        jt.call("GET", "pubuser?email=" + jt.enc(params.email), null,
                function (users) {
                    var user = users[0];
                    app.db.deserialize("AppUser", user);
                    displayCompletionCertificate(user, params.compcert); },
                function (code, errtxt) {
                    jt.out("rhcontentdiv", "Fetch failed. Error code " + code +
                           ": " + errtxt); },
                jt.semaphore("mode.showCompletionCertificate"));
    }


    function showLandingPage () {
        //The core html for the landing page is in index.html
        var i, html, mt, p, ps = document.getElementsByTagName("p"),
            ghu = "https://github.com/theriex/rh";
        for(i = 0; i < ps.length; i += 1) {
            p = ps[i];
            html = p.innerHTML;
            mt = "PastKey";
            if(html.indexOf(mt) >= 0) {
                html = html.replace(mt, jt.tac2html(
                    ["span", {cla:"titlespan"}, mt])); }
            mt = "open source project";
            if(html.indexOf(mt) >= 0) {
                html = html.replace(mt, jt.tac2html(
                    ["a", {href:ghu, 
                           onclick:jt.fs("window.open('" + ghu + "')")},
                     mt])); }
            mt = "timelines you can try:";
            if(html.indexOf(mt) >= 0) {
                html = html.replace(mt, jt.tac2html(
                    [mt,
                     ["table", {cla:"tltable"},
                      [["tr",
                        [["th", "name"], ["th", "pts"], ["th", "svs"]]],
                       ["tr",
                        [["td", 
                          ["a", {href:app.baseurl + "/timeline/default"},
                           "U.S. Race History"]], 
                         ["td", 344], ["td", 3]]],
                       ["tr",
                        [["td", 
                          ["a", {href:app.baseurl + "/timeline/ellabaker"},
                           "Ella Baker"]],
                         ["td", 9], ["td", 0]]] ]]])); }
            p.innerHTML = html; }
    }


    return {
        start: function (tl, currlev) { start(tl, currlev); },
        next: function () { next(); },
        chmode: function (mode) { changeMode(mode); },
        menu: function (expand, select) { displayMenu(expand, select); },
        showNextPoints: function (points) { showNextPoints(points); },
        searchstate: function () { return srchst; },
        updlev: function (currlev) { updateLevelDisplay(currlev); },
        svdone: function (m, s, e) { endSuppViz(m, s, e); },
        requeue: function (pt) { requeue(pt); },
        currpt: function () { return ms && ms.currpt; },
        updqrc: function (count) { updateRemainingQuestionsCount(count); },
        showcert: function () { showCompletionCertificate(); },
        showlanding: function () { showLandingPage(); }
    };
}());
