/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

//Menu and other top nav area functionality.
app.mode = (function () {
    "use strict";

    var mode = "interactive",  //linear only. "reference" is linear or text
        fetchpoints = null,
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
                                                "height:" + ms.h + "px;"},
                     "Reference Title"],
                    ["div", {id:"levdiv"},
                     ["svg", {id:"svgnav", width:ms.w, height:ms.h}]]];
            jt.out(ms.divid, jt.tac2html(html));
            ms.progsvg = d3.select("#svgnav"); }
        showModeElements();
    }


    function progressInformation () {
        var dcon = app.db.displayContext(),
            levs = [],
            cmpsvs = dcon.prog.svs || "",
            ttlpts = 0,
            donepts = dcon.prog.pts.csvarray().length,
            levidx = 0,
            info;
        dcon.tl.svs.csvarray().forEach(function (svn) {
            levs.push({svn:svn, svcmp:(cmpsvs.indexOf(svn) >= 0)}); });
        if(!levs.length) {
            levs.push({svn:"finale", svcmp:false}); }
        if(!dcon.tl.ctype.startsWith("Timelines")) {
            //use selected display points to determine the total
            ttlpts = dcon.tl.points.length; }
        levs.forEach(function (lev, idx) {
            lev.levnum = idx + 1;
            if(idx < levs.length - 1) {
                lev.levpts = Math.floor(ttlpts / levs.length); }
            else {  //extra points covered in last level
                lev.levpts = Math.ceil(ttlpts / levs.length); }
            lev.ptscmp = Math.min(donepts, lev.levpts);
            donepts = Math.max((donepts - lev.levpts), 0);
            if(lev.ptscmp >= lev.levpts && lev.svcmp &&
               levidx < levs.length - 1) {
                levidx += 1; } });
        info = {levnum: levidx + 1,
                levpcnt: levs[levidx].ptscmp / levs[levidx].levpts,
                level: levs[levidx],
                levels: levs};
        return info;
    }


    function updateLevelDisplay () {
        var proginfo = progressInformation(),
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
                .text(String(proginfo.levnum));
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
        ms.prog.levnum.text(String(proginfo.levnum));
        ms.levinf = proginfo;
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


    function next () {
        var level = ms.levinf.level, 
            dcon = app.db.displayContext();
        if(ms.tl.pendingSaves >= ms.pointsPerSave) {
            return app.dlg.saveprog(); }
        if(level.levpts > level.ptscmp) {
            ms.currpt = app.db.nextPoint();
            return app.linear.clickCircle(ms.currpt); }
        if(!level.svcmp) {
            level.svcmp = true;
            return app[level.svn].display(); }
        //moving to the next level would have already been handled
        if(dcon.tlidx < dcon.ds.length) {
            return app.db.displayNextTimeline(); }
        //if nothing else to do, display the finale with no continuation func
        app.finale.display();
    }


    function changeMode (chmode) {
        chmode = chmode || mode;
        showModeElements(chmode);
        if(mode === "interactive") {
            if(ms.disp === "text") {
                toggleDisplay(); }
            clearSearchState();
            next(); }  //picks up at the appropriate point
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
            switch(select) {  //update title if needed
            case "refmode": jt.out("refdiv", "Reference Mode"); break;
            case "newtl": jt.out("refdiv", "Create Timeline"); break; }
            switch(select) {  //next action
            case "visual": changeMode("interactive"); break;
            case "refmode": changeMode("reference"); break;
            case "about": app.about.display(ms); break; 
            case "signin": app.dlg.signin(); break;
            case "myacc": app.dlg.myacc(); break;
            case "newtl": app.tabular.tledit(); break;
            case "signout": app.dlg.logout(); break; } }
    }


    function start (tl) {
        ms = {divid:tl.divid, tl:tl, w:tl.width, h:30};  //reset mode state
        jt.byId("tcontdiv").style.top = String(ms.h) + "px";
        ms.disp = "linear";  //other option is "text"
        verifyDisplayElements();
        updateLevelDisplay();
        displayMenu();
        ms.pointsPerSave = app.db.displayContext().tl.pointsPerSave;
        app.dlg.init(tl);
        if(ms.levinf.levnum === 1 && ms.levinf.levpcnt === 0 &&
           app.db.displayContext().tlidx === 0) {
            app.dlg.start(jt.fs("app.mode.showNext()")); }
        else {
            app.mode.next(); }
    }


    function showSelectStat (task) {
        var tl = app.linear.tldata();
        task.msg = "Selecting " + fetchpoints.length + " Facts";
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
        var task;
        app.dlg.close();  //verify not displayed
        if(ms.disp === "text") { 
            jt.log("mode.showNextPoints call ignored (not in linear mode)");
            return;}
        fetchpoints = app.db.nextPoint(ms.pointsPerSave);
        if(!fetchpoints || !fetchpoints.length) {
            return next(); }  //time for suppviz or next level or timeline
        if(!tasks) {
            tasks = [{cmd:"unzoom", dur:100},
                     {cmd:"highlight", dur:1400},
                     {cmd:"normalize", dur:100}]; }
        if(!tasks.length) {   //done with display tasks,
            return next(); }  //continue to next interaction
        task = tasks[0];
        tasks = tasks.slice(1);
        switch(task.cmd) {
        case "unzoom":
            app.linear.unzoom();
            showSelectStat(task);
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


    return {
        start: function (tl) { start(tl); },
        next: function () { next(); },
        chmode: function (mode) { changeMode(mode); },
        ptmatch: function (pt) { return isMatchingPoint(pt); },
        menu: function (expand, select) { displayMenu(expand, select); },
        showNext: function () { showNextPoints(); },
        searchstate: function () { return srchst; },
        updlev: function () { updateLevelDisplay(); }
    };
}());
