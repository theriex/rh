/*jslint browser, white, fudge, for */
/*global app, window, jt, d3 */

//Menu and other top nav area functionality.
app.mode = (function () {
    "use strict";

    var mode = "interactive";  //linear only. "reference" is linear or text
    var ms = null;  //mode state detail variables
    var ftls = null;  //cached featuredTimelines


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
                      ["img", {cla:"noticeimg",
                               src:app.dr("img/forward.png")}]]]];
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
                  m: {t: 3, r: 2, b: 0, l: 3}}; //margin  top right bottom left
        var tc = {x: ti.m.l + ti.p.l,    //text coordinates (level number)
                  y: ti.m.t + ti.p.t + ti.fs,
                  h: ti.p.t + ti.fs + ti.p.b,
                  w: ti.p.l + ti.fs + ti.p.r};
        var rc = {x: tc.x + tc.w + ti.m.r,   //rect coordinates (prog bar)
                  y: Math.floor(tc.h / 2),
                  h: Math.floor(tc.h / 4),
                  w: ms.w - (tc.x + tc.w)};
        var calc = {pcnt:currlev.lev.levpcnt};
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
            app.dlg.verifyClosed();
            ms.disp = "text"; }
           //app.tabular.display(); would be an infinite recursion
        else {
            // jt.byId("disptoggle").href = "#textmode";
            // jt.byId("disptoggleimg").src = "img/disptext.png";
            jt.byId("abgdiv").style.display = "block";
            jt.byId("lcontdiv").style.display = "block";
            jt.byId("tcontdiv").style.display = "none";
            ms.disp = "linear"; }
    }


    function highlightCircles (points, task) {
        var tl = app.linear.tldata();
        var dur = Math.round(0.8 * task.dur);  //finish trans before task ends
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
        var tl = app.linear.tldata();
        var dur = Math.round(0.8 * task.dur);  //finish trans before task ends
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
            app.db.nextInteraction(); }
        else { //"reference"
            //hide the timeline creation context if it has been created, so
            //returning to plain reference doesn't leave it up.
            if(jt.byId("tlctxdiv")) {
                jt.byId("tlctxdiv").style.display = "none"; }
            if(ms.disp !== "text") {
                toggleDisplay(); } }
    }


    function verifyMenuContent (expand) {
        //Make sure one of the default menu items has the longest name so
        //offsetWidth of the menu contents doesn't vary.  Avoiding c:"dis"
        //to keep the initial guest menu as simple as possible.
        var menu = [{m:"visual",  n:"Interactive&nbsp;Mode"},
                    {m:"refmode", n:"Reference&nbsp;Mode"},
                    {m:"share",   n:"Share"},
                    {m:"myacc",   n:"My&nbsp;Account",      c:"acc"},
                    {m:"signout", n:"Sign&nbsp;Out",        c:"acc"},
                    {m:"signin",  n:"Sign&nbsp;In",         c:"noacc"},
                    {m:"tledit",  n:"Edit&nbsp;Timeline",   c:"acc"},
                    //{m:"chapter", n:"Chapter&nbsp;End",     c:"acc"},
                    {m:"about",   n:"About"}];
        var acc = app.user && app.user.tok;
        var html = []; var item = "";
        menu.forEach(function (mi) {
            if(!mi.c || ((mi.c === "acc" && acc) ||
                         (mi.c === "noacc" && !acc) ||
                         (mi.c === "dis"))) {
                if(mi.c === "dis" && !acc) {
                    item = ["span", {cla:"disabledmenuline"}, mi.n]; }
                else {
                    item = ["a", {href:"#" + mi.m,
                                  onclick:jt.fs("app.mode.menu(0,'" + mi.m + 
                                                "')")},
                            mi.n]; }
                html.push(["div", {cla:"menulinemain"}, item]); } });
        html = [["div", {id:"menuicondiv", style:"text-align:right;"},
                 ["a", {href:"#menu", onclick:jt.fs("app.mode.menu(" + 
                                                    !expand + ")")},
                  ["img", {src:app.dr("img/menuicon.png"), //50x38
                           id:"menuiconimg",
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
            jt.out("refdiv", jt.tac2html(["div", {id:"reftitlediv"}]));
            switch(select) {  //next action
            case "visual": changeMode("interactive"); break;
            case "refmode": app.tabular.display("refdisp"); break;
            case "share": app.support.display(ms.tl, "share"); break;
            case "about": app.support.display(ms.tl, "about"); break;
            //case "chapter": app.support.display(ms.tl, "chapter"); break;
            case "signin": app.dlg.signin(); break;
            case "myacc": app.dlg.myacc(); break;
            case "tledit": app.tabular.display("tledit"); break;
            case "signout": app.dlg.logout(); break; } }
    }


    function start (tl, currlev) {
        ms = {divid:tl.divid, h:30, w:tl.width - 10};  //reset, right menu space
        ms.tl = tl;  //set separately to avoid lint scope complaints 
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
        else if(ms.params.dbg === "levelup") {
            setTimeout(function () {
                app.dlg.verifyClosed();
                app.levelup.display(currlev); }, 200); }
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


    function displayCompletionStats (user, tl) {
        var html = [["div", {cla:"crtcompdiv"}, "has completed"],
                    ["div", {cla:"crttitlediv"},
                     ["a", {href:"/timeline/" + (tl.slug || tl.dsId)},
                      tl.title || tl.name]],
                    ["div", {cla:"crtsubtdiv"}, tl.subtitle],
                    ["div", {cla:"crttliddiv"}, "(Timeline " + tl.dsId + ")"]];
        var ce = user.completed.find((ce) => ce.tlid === tl.dsId);
        if(!ce) {
            html[0][2] = "has NOT completed";
            return jt.out("certstatsdiv", jt.tac2html(html)); }
        html.push(["div", {cla:"crtdatediv"}, "on " +
                   jt.colloquialDate(ce.latest, false, "z2loc,nodaily")]);
        if(ce.stats) {
            var cs = ce.stats;
            var st = "having studied a total of " + elapsed(cs.pttl + cs.sttl) +
                ", covering " + cs.pcount + " points at an average of " +
                elapsed(cs.pavg) + " per point";
            if(cs.scount) {
                st += " and " + cs.scount + " supplemental visualizations in " +
                    elapsed(cs.sttl) + " (an average of " + elapsed(cs.savg) +
                    " per visualization)"; }
            st += ".";
            html.push(["div", {cla:"crtsummarydiv"}, st]); }
        jt.out("certstatsdiv", jt.tac2html(html));
    }


    function displayCompletionCertificate (user, tlid) {
        var website = user.web || "";
        if(user.web) {
            website = ["a", {href:user.web, 
                             onclick:jt.fs("window.open('" + user.web + "')")},
                       user.web]; }
        jt.out("rhcontentdiv", jt.tac2html(
            ["div", {id:"certcontdiv"},
             [["div", {id:"certnamediv"}, user.name],
              ["div", {id:"certtitlediv"}, user.title],
              ["div", {id:"certwebdiv"}, website],
              ["div", {id:"certuiddiv"}, "(user id: " + user.dsId + ")"],
              ["div", {id:"certstatsdiv"}, "Fetching timeline " + tlid]]]));
        app.refmgr.getFull("Timeline", tlid, function (tl) {
            displayCompletionStats(user, tl); });
    }


    function showCompletionCertificate () {
        var params = jt.parseParams("String"); var url;
        jt.out("rhcontentdiv", "Fetching completion certificate...");
        url = "/api/fetchobj?dt=AppUser&ak=email&kv=" + jt.enc(params.email);
        jt.call("GET", url, null,
                function (users) {
                    var user = app.refmgr.deserialize(users[0]);
                    displayCompletionCertificate(user, params.compcert); },
                function (code, errtxt) {
                    jt.out("rhcontentdiv", "Fetch failed. Error code " + code +
                           ": " + errtxt);
                    if(code === 404) {
                        jt.out("rhcontentdiv", "Certificate unavailable." + 
                               " No account found."); }},
                jt.semaphore("mode.showCompletionCertificate"));
    }


    function findDay (y, m, d, w) {
        if(!w) {
            return d; }  //not a relative day
        var wd = 1;
        var date = new Date(y, m, wd);
        while(date.getDay() !== d) {
            wd += 1;
            date = new Date(y, m, wd); }
        wd += (w - 1) * 7;
        return wd;
    }


    function diffDays (now, y, m, d) {
        var then = new Date(y, m, d);
        var diff = Math.abs(now.getTime() - then.getTime());
        diff = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return diff;
    }


    function getAnniversaryDistance (spec) {
        var now = new Date();
        var res = spec.match(/-(\d\d)-(W?)(\d\d?)-?D?(\d?\d?)/);
        var midx = parseInt(res[1], 10) - 1;
        var day = parseInt(res[3], 10);
        var week = 0;
        if(res[2]) {  //"W" indicates this is a week/daynum anniversary
            week = day;
            day = parseInt(res[4]); }
        var anv = {prev:{m:midx}, next:{m:midx}};
        //if current month, then prev/next are the same, never a year away
        if(now.getMonth() >= midx) {
            anv.prev.y = now.getFullYear();
            anv.next.y = now.getFullYear() + 1; }
        else if(now.getMonth() <= midx) {
            anv.prev.y = now.getFullYear() - 1;
            anv.next.y = now.getFullYear(); }
        anv.prev.d = findDay(anv.prev.y, anv.prev.m, day, week);
        anv.next.d = findDay(anv.next.y, anv.next.m, day, week);
        anv.prev.days = diffDays(now, anv.prev.y, anv.prev.m, anv.prev.d);
        anv.next.days = diffDays(now, anv.next.y, anv.next.m, anv.next.d);
        return anv;
    }


    function sortFeaturedTimelines () {
        ftls.forEach(function (tl) {
            if(tl.featured.startsWith("-")) {
                var anv = getAnniversaryDistance(tl.featured);
                tl.prio = Math.min(anv.prev.days, anv.next.days); }
            else if(tl.featured === "Promoted") {
                tl.prio = 40; }  //anv closer than 40 days is higher prio
            else {  //"Listed" and anything else
                tl.prio = 500; } });
        ftls.sort(function (a, b) {
            return a.prio - b.prio; });
    }


    function showFeaturedTimelinesFetchFailure (code, errtxt) {
        var subj = " Timelines not displaying";
        var body = "The featured timelines display on the main page is" +
            " currently showing " + code + " " + errtxt + "\n" +
            "You might want to get that fixed...\n\n";
        var mh = "mailto:support@pastkey.org?subject=" + jt.dquotenc(subj) +
            "&body=" + jt.dquotenc(body);
        var html = [["p", "Featured Timelines fetch failed: " + 
                     code + " " + errtxt],
                    ["p",
                     ["If this message persists, please ",
                      ["a", {href:mh}, "let support know."],
                      " Thanks!"]]];
        jt.out("recomTLsdiv", jt.tac2html(html));
    }


    function tlCompletionStat (tl) {
        if(!app.user || !app.user.acc) {
            return ""; }
        var ret = "";
        app.user.acc.started.forEach(function (st) {
            if(st.tlid === tl.dsId) {
                var comp = st.pts.csvarray().length;
                var ttl = tl.cids.csvarray().length;
                ret = String(Math.round(comp/ttl * 100)) + "%";
                var link = app.baseurl + "/timeline/" + (tl.slug || tl.dsId);
                var html = ["a", {href:link},
                            ["span", {cla:"pcntcompspan"}, ret]];
                ret = jt.tac2html(html); } });
        app.user.acc.completed.forEach(function (ct) {
            if(ct.tlid === tl.dsId) {
                var link = app.baseurl + "?compcert=" + tl.dsId + 
                    //app.user.acc.email is always empty of private info
                    "&email=" + app.user.email;
                var html = ["a", {href:"#showcomp",
                                  onclick:jt.fs("window.open('" + link + "')")},
                            "&#x2713;"]; //checkmark
                ret = jt.tac2html(html); } });
        return ret;
    }


    function showTimelineLinks (tls) {
        var html = [["tr",
                     [["th", "name"], ["th", "pts"], ["th", ""]]]];
        tls.forEach(function (tl) {
            html.push(["tr",
                       [["td",
                         ["a", {href:app.baseurl + "/timeline/" + 
                                (tl.slug || tl.dsId)},
                          tl.name]],
                        ["td", tl.cids.csvarray().length],
                        ["td", tlCompletionStat(tl)]]]); });
        html = [["div", {id:"rectltitdiv"}, "Recommended Timelines:"],
                ["table", {cla:"tltable", id:"rectlstable"}, html]];
        jt.out("recomTLsdiv", jt.tac2html(html));
    }


    function featuredTimelines (contf) {
        if(ftls) {
            return setTimeout(function () { contf(ftls); }, 50); }
        jt.call("GET", "/api/featured" + jt.ts("?cb=", "hour"), null,
                function (tls) {
                    ftls = tls;
                    sortFeaturedTimelines();
                    contf(ftls); },
                function (code, errtxt) {
                    showFeaturedTimelinesFetchFailure(code, errtxt); },
                jt.semaphore("mode.featuredTimelines"));
    }


    function showLandingPage () {
        //The core html for the landing page is in index.html
        var i; var html; var mt; var p; 
        var ps = document.getElementsByTagName("p");
        var ghu = "https://github.com/theriex/rh";
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
            p.innerHTML = html; }
        featuredTimelines(showTimelineLinks);
    }


    return {
        start: function (tl, currlev) { start(tl, currlev); },
        next: function () { next(); },
        chmode: function (mode) { changeMode(mode); },
        menu: function (expand, select) { displayMenu(expand, select); },
        showNextPoints: function (points) { showNextPoints(points); },
        updlev: function (currlev) { updateLevelDisplay(currlev); },
        svdone: function (m, s, e) { endSuppViz(m, s, e); },
        requeue: function (pt) { requeue(pt); },
        currpt: function () { return ms && ms.currpt; },
        updqrc: function (count) { updateRemainingQuestionsCount(count); },
        showcert: function () { showCompletionCertificate(); },
        showlanding: function () { showLandingPage(); },
        featuredTimelines: function (contf) { featuredTimelines(contf); }
    };
}());
