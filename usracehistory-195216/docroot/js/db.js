/*jslint browser, multivar, white, fudge, for */
/*global app, window, jt, d3 */

app.db = (function () {
    "use strict";

    var dcon = null;  //The current display context (timeline, progress etc)


    function makeDisplayDate (pt) {
        var dd = "",
            months = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November",
                      "December"];
        if(pt.start.month) {
            dd += jt.tac2html(["span", {cla:"dispdatemonth"}, 
                               months[pt.start.month - 1]]);
            if(pt.start.day) {
                dd += "&nbsp;" + jt.tac2html(["span", {cla:"dispdateday"},
                                              pt.start.day]); }
            dd += jt.tac2html(["span", {cla:"dispdatecommasep"}, ","]);
            dd += "&nbsp;"; }
        dd += jt.tac2html(["span", {cla:"dispdateyear"}, 
                           Math.abs(pt.start.year)]);
        if(pt.start.year < 0) {
            dd += "&nbsp;" + jt.tac2html(["span", {cla:"dispdatebce"},
                                          "BCE"]); }
        pt.dispdate = dd;
    }


    function describeDateFormat () {
        var descr = [
            "Single Point In Time:",
            "Y[YYY][ BCE] or YYYY-MM[-DD]",
            "Time Range:",
            "YYYY's or YYYY's-YYYY's or YYYY+ or " + 
                "YYYY[-MM-DD]-YYYY[-MM-DD]"];
        descr[0] = "<b>" + descr[0] + "</b>";
        descr[2] = "<b>" + descr[2] + "</b>";
        descr = descr.join("<br/>");
        descr = descr.replace(/\sor\s/g, " <em>or</em> ");
        descr = descr.replace(/'/g, "&apos;");
        return descr;
    }


    function parseDate (pt) {
        var date, mres;
        date = pt.date;
        pt.start = {};
        //start year
        pt.start.year = date.match(/^\d\d?\d?\d?/)[0];
        date = date.slice(pt.start.year.length);
        pt.start.year = Number(pt.start.year);
        if(date.indexOf(" BCE") >= 0) {
            date = date.slice(date.indexOf(" BCE") + 4);
            pt.start.year *= -1; }
        //start month
        mres = date.match(/^\-\d\d(\-|$)/);
        if(mres) {
            date = date.slice(3);
            pt.start.month = Number(mres[0].slice(1,3)); }
        //start day
        mres = date.match(/^\-\d\d(\-|$)/);
        if(mres) {
            date = date.slice(3);
            pt.start.day = Number(mres[0].slice(1,3)); }
        //end year
        if(date.indexOf("-") >= 0) {
            date = date.slice(date.indexOf("-") + 1); }
        mres = date.match(/^\d\d?\d?\d?/);
        if(mres) {
            date = date.slice(mres[0].length);
            pt.end = {};
            pt.end.year = Number(mres[0]); }
        //end month
        mres = date.match(/^\-\d\d(\-|$)/);
        if(mres) {
            date = date.slice(3);
            pt.end.month = Number(mres[0].slice(1,3)); }
        //end day
        mres = date.match(/^\-\d\d/);
        if(mres) {
            date = date.slice(3);
            pt.end.day = Number(mres[0].slice(1,3)); }
        makeDisplayDate(pt);
    }


    function makeCoordContext (pts) {
        //X coordinates are start times. Y coordinates start at zero (the
        //center line) and are adjusted up or down to avoid overlap with
        //adjacent points.  If the previous point was adjusted above the
        //center line, then the next is adjusted below for visual balance.
        var xbs = 32,  //x bands, how many columns to divide the x-axis into
            sy = pts.length? pts[0].start.year : 0,
            ey = pts.length? pts[pts.length - 1].start.year : 0,
            iw = Math.ceil((ey - sy) / xbs),
            ctx = {iw:iw,    //horizontal interaction width (in years)
                   lq:[],    //LIFO queue of pts within iw (most recent first)
                   zz:1,     //zigzag direction (alternates 1/-1)
                   maxy:0};  //max vertical (either up or down)
        jt.log("coordinate context iw: " + iw);
        return ctx;
    }


    function makeCoordinates (pt, ctx) {
        //D3 has very good support for dates, but that level of precision is
        //frequently more than the data specifies, so using a "time code"
        //consisting of a fractional year rounded to two decimal places.
        var y, m, d, vm;
        y = pt.start.year;
        m = pt.start.month || 0;
        d = pt.start.day || 0;
        pt.tc = Math.round((y + m/12 + d/365) * 100) / 100;
        //vertical code defaults to zero, representing the center line
        pt.vc = 0;
        vm = true;
        while(ctx.lq.length && pt.tc - ctx.lq[ctx.lq.length - 1].tc > ctx.iw) {
            ctx.lq.pop(); }  //remove any point not within interaction width
        while(vm) {  //moved vertically, recheck for conflicts
            vm = false;
            ctx.lq.forEach(function (pp) {
                if(pp.vc === pt.vc) {
                    pt.vc += ctx.zz;
                    vm = true; } }); }
        if(pt.vc) {  //zigged or zagged to place the point, switch direction
            ctx.zz *= -1; }
        else {  //point fit on the center line, reset zigzag to base value
            ctx.zz = 1; }
        ctx.lq.unshift(pt);  //prepend this latest point.
        ctx.maxy = Math.max(ctx.maxy, Math.abs(pt.vc));
    }


    //The core of the point identifier is the number of years ago the
    //event occurred.  That keeps more modern history entries more
    //concise and generally reduces clutter.  D3 has problems with
    //numeric ids, so a letter prefix is required.  Multiple entries
    //within the same year are distinguished by their y coordinate.
    function makePointIdent (pt, ny) {
        var ident = "y" + (ny - pt.start.year);
        if(pt.vc > 1) {
            ident += "_" + pt.vc; }
        pt.id = ident;
    }


    //return time difference in tenths of seconds, max 99999
    function getElapsedTime (startDate, endDate) {
        var start, end, elap;
        start = Math.round(startDate.getTime() / 100);
        end = Math.round(endDate.getTime() / 100);
        elap = Math.min(end - start, 99999);
        return elap;
    }


    function wallClockTimeStamp (date) {
        var idx, ts;
        date = date || new Date();
        ts = date.toISOString();
        idx = ts.indexOf(".");
        if(idx >= 0) {
            ts = ts.slice(0, idx) + "Z"; }
        ts += date.getTimezoneOffset();
        return ts;
    }


    function noteStartTime () {
        if(!app.startTime) {
            app.startTime = wallClockTimeStamp(); }
    }


    function describePoints (tl) {
        if(!tl.points || !tl.points.length) {
            return jt.log(tl.name + " has no points"); }
        jt.log("Point distributions for " + tl.name + 
               " (" + tl.points.length + " total)");
        Object.keys(tl.stat).forEach(function (key) {
            var stat = tl.stat[key];
            jt.log(("    " + stat.count).slice(-4) + " " + stat.name); });
    }


    function notePointCounts (tl, pt) {
        var i;
        tl.stat = tl.stat || {
            N: {count:0, name:"Native American"},
            B: {count:0, name:"African American"},
            L: {count:0, name:"Latino/as"},
            A: {count:0, name:"Asian American"},
            M: {count:0, name:"Middle East and North Africa"},
            R: {count:0, name:"Multiracial"}};
        for(i = 0; i < pt.codes.length; i += 1) {
            if(tl.stat[pt.codes.charAt(i)]) {
                tl.stat[pt.codes.charAt(i)].count += 1; } }
    }


    function compareStartDate (a, b) {
        var am, bm, ad, bd;
        if(a.start.year < b.start.year) { return -1; }
        if(a.start.year > b.start.year) { return 1; }
        am = a.month || 0;
        bm = b.month || 0;
        if(am < bm) { return -1; }
        if(am > bm) { return 1; }
        ad = a.day || 0;
        bd = b.day || 0;
        if(ad < bd) { return -1; }
        if(ad > bd) { return 1; }
        return 0;
    }


    //The preb data points in the timeline are a subset of the database
    //fields (see timeline.py rebuild_prebuilt_timeline_points):
    //    instid: The database point instance id.  Aka "citation id"
    //    date: Date or range.  See README.md for allowed formats.
    //    text: Description of the point (max 1200 chars)
    //    codes: NBLAMRUFD (see point.py point_codes)
    //    orgid: Organization id, 1 is public
    //    keywords: CSV of org defined keywords (regions, categories, tags)
    //    source: Arbitrary source tag used when the point was loaded.
    //    pic: instid if an image exists, empty string otherwise
    //    modified: ISO when the point was last updated
    //These fields added from calculations and user data:
    //    start: {year: number, month?, day?}
    //    end?: {year: number, month?, day?}
    //    tc: time coordinate number (fractional start year)
    //    vc: vertical coordinate (calculated for point overlap avoidance)
    //    id: text years ago + sep + offset (used for dom elements)
    //    isoShown: ISO date when last shown
    //    isoClosed: ISO date when last completed (ok, right date, etc)
    //    viewCount: integer count how many times viewed
    //    tagCodes: rku1234 (see appuser.py AppUser class def comment)
    function prepData (tl) {
        var ny = new Date().getFullYear();
        jt.log("Preparing data for " + tl.name + "...");
        tl.points = tl.preb || [];
        tl.points.forEach(function (pt) {
            parseDate(pt); });
        tl.points.sort(function (a, b) {  //verify in chrono order
            return compareStartDate(a, b); });
        tl.points.forEach(function (pt, idx) {
            notePointCounts(tl, pt);
            pt.currdataindex = idx;
            makePointIdent(pt, ny); });
        describePoints(tl);
        tl.dataPrepared = true;
    }


    function stackTimeline (par) {
        //present all children in order, then this timeline
        if(par.ctype.startsWith("Timelines")) {
            par.cids.csvarray().forEach(function (tlid) {
                var chi = app.user.tls[tlid] || null;
                stackTimeline(chi); }); }
        dcon.ds.push(par);
    }


    function getProgressElements (csv, id) {
        var idx, str, ces,
            pes = {isoShown:"", isoClosed:"", viewCount:0, tagCodes:""};
        idx = csv.indexOf(id);
        if(idx < 0) {
            return pes; }
        str = csv.slice(idx);
        idx = str.indexOf(",");
        if(idx >= 0) {
            str = str.slice(0, idx); }
        ces = str.split(";");
        pes.isoShown = ces[1];
        pes.isoClosed = ces[2];
        if(ces.length > 3) {
            pes.viewCount = Number(ces[3]); }
        if(ces.length > 4) {
            pes.tagCodes = ces[4]; }
        return pes;
    }


    function pcntComplete (rempts, points) {
        if(!points || !points.length) {
            return 1; }
        return (points.length - rempts.length) / points.length;
    }


    function findTimelineInfo (tlid, entries) {
        var ret = null;
        entries = entries || [];
        entries.forEach(function (entry) {
            if(entry.tlid === tlid) {
                ret = entry; } });
        return ret;
    }


    function isPointVisited (pt) {
        var pes;
        if(pt.visited) {
            return pt.visited; }
        if(pt.isoShown) {
            pt.visited = pt.isoShown;
            return pt.visited; }
        pes = getProgressElements(dcon.prog.pts, pt.instid);
        Object.keys(pes).forEach(function (key) {
            pt[key] = pes[key]; });
        pt.visited = pt.isoShown;
        return pt.visited;
    }


    function clearVisited () {
        dcon.ds.forEach(function (tl) {
            tl.visited = "";
            tl.levs.forEach(function (lev) {
                lev.visited = "";
                lev.points.forEach(function (pt) {
                    pt.isoShown = "";
                    pt.isoClosed = "";
                    pt.viewCount = 0;
                    pt.tagCodes = "";
                    pt.visited = ""; }); }); });
    }


    function verifyRestartOrNew (acc) {
        var compinst = findTimelineInfo(dcon.prog.tlid, acc.completed);
        if(!compinst) { return; }  //not previously completed, new tl start
        if(!dcon.restart) {
            if(confirm("You've already completed this timeline. Are you sure you want to start over from the beginning?")) {
                jt.log("Restarting timeline after confirmation");
                dcon.restart = "confirmed"; }
            else {
                dcon.restart = "norestart"; } }
        if(dcon.restart === "confirmed") { return; }   //new tl start
        //mark all timelines and levels visited
        dcon.ds.forEach(function (tl) {
            tl.visited = true;
            tl.levs.forEach(function (lev) {
                lev.visited = true; }); });
        dcon.prog.st = jt.ISOString2Time(compinst.latest)
    }


    function verifyProgressInfo () {
        var acc, proginst;
        if(!dcon.prog) {
            dcon.prog = {tlid:dcon.lastTL.instid,
                         st:new Date().toISOString(),
                         svs:"", pts:""}; }
        if(app.user && app.user.acc) {
            acc = app.user.acc;
            proginst = findTimelineInfo(dcon.prog.tlid, acc.started);
            if(proginst) {
                dcon.prog = proginst; }
            else {
                verifyRestartOrNew(acc); } }  //updates dcon.prog
        //verify all fields just in case
        dcon.prog.st = dcon.prog.st || new Date().toISOString();
        dcon.prog.svs = dcon.prog.svs || "";
        dcon.prog.pts = dcon.prog.pts || "";
    }            


    function recalcProgress (init) {
        //init should be true when the state is first built from loading a
        //timeline, or after the user first logs in and their progress info
        //is merged.  init should be false for interim progress tracking.
        //dlg closeInteractionTimeTracking fills dcon.prog.pts
        //noteSuppvizDone fills dcon.prog.svs
        //levelup sets lev.levelupShown
        var currlev = null;
        if(init) { clearVisited(); }
        verifyProgressInfo();  //creates dcon.prog or reads it from account
        //Mark visited to minimize churn and make the state easier to read.
        dcon.ds.forEach(function (tl, idx) {
            if(!tl.visited) {
                tl.visited = true;
                tl.levs.forEach(function (lev, idx) {
                    if(!lev.visited) {
                        lev.rempts = [];
                        lev.points.forEach(function (pt, idx) {
                            if(!isPointVisited(pt)) {
                                lev.rempts.push(pt); } });
                        lev.levpcnt = pcntComplete(lev.rempts, lev.points);
                        if(!lev.svShown) {
                            lev.svShown = getProgressElements(
                                dcon.prog.svs, lev.svname).isoShown; }
                        if(lev.rempts.length === 0) {
                            if(init && lev.svShown) {
                                lev.levelupShown = lev.svShown;
                                lev.visited = lev.svShown; }
                            //levelup display sets levelupShown.  Last lev
                            //calls finale instead which sets nothing.  So
                            //loading a completed timeline shows the finale.
                            else if(lev.svShown && lev.levelupShown) {
                                lev.visited = lev.levelupShown; } }
                        if(!currlev && !lev.visited) {
                            currlev = {tl:tl, lev:lev}; } }
                    tl.visited = tl.visited && lev.visited; }); } });
        if(!currlev) {  //return last level of final timeline for display
            currlev = {tl:dcon.lastTL, lev:dcon.lastLev};
            currlev.lev.levpcnt = 1;
            currlev.lev.rempts = []; }
        return currlev;
    }


    function makeTimelineLevels () {
        var levnum = 1;
        dcon.ds.forEach(function (tl, idx) {
            var levs = [], ppl;
            tl.svs.csvarray().forEach(function (svn) {
                levs.push({svname:svn,
                           svShown:"",       //suppviz not displayed yet
                           levelupShown:"",  //levelup viz not displayed yet
                           num:levnum});
                levnum += 1; });
            if(!levs.length) {
                levs.push({svname:"none", num:levnum}); }
            ppl = Math.floor(tl.points.length / levs.length);
            levs.forEach(function (lev, idx) {
                if(idx < levs.length - 1) {
                    lev.points = tl.points.slice(0, (idx + 1) * ppl); }
                else {  //any remainder points go in last level
                    lev.points = tl.points.slice(idx * ppl); } });
            tl.levs = levs; });
        //calculate endpoint values (just avoiding cluttering up prev loop)
        dcon.ds.forEach(function (tl) {
            dcon.lastTL = tl;
            tl.levs.forEach(function (lev) {
                dcon.lastLev = lev;
                lev.maxnum = levnum; }); });
        recalcProgress("init");
    }


    function getTimelineProgressRecord () {
        var prog = {tlid:dcon.tlid, st:new Date().toISOString(), 
                    svs:"", pts:""};
        if(app.user && app.user.acc && app.user.acc.started) {
            app.user.acc.started.forEach(function (st) {
                if(st.tlid === dcon.tlid) {
                    prog = st; } }); }
        prog.st = prog.st || new Date().toISOString();
        prog.svs = prog.svs || "";
        prog.pts = prog.pts || "";
        return prog;
    }


    function pointIndexForId (ptid, points) {
        var i;
        for(i = 0; i < points.length; i += 1) {
            if(points[i].instid === ptid) {
                return i; } }
        return -1;
    }


    function rebuildRandomPointsSelection(tl, ctc) {
        var idx, prog = getTimelineProgressRecord();
        ctc.rndmax = Number(ctc.rndmax);
        tl.randpts = [];
        tl.unused = tl.preb.slice();
        //move all visited points from unused into randpts
        prog.pts.csvarray().forEach(function (pp) {
            idx = pointIndexForId(pp.split(";")[0], tl.unused);
            if(idx >= 0) {
                tl.randpts.push(tl.unused[idx]);
                tl.unused.splice(idx, 1); } });
        //randomly select remaining points from unused
        while(tl.randpts.length < ctc.rndmax) {
            idx = Math.floor(Math.random() * tl.unused.length);
            tl.randpts.push(tl.unused.splice(idx, 1)[0]); }
        tl.randpts.sort(function (a, b) { 
            return compareStartDate(a, b); });
        jt.log("Selected " + tl.randpts.length + 
               " random points for " + tl.name);
        // tl.randpts.forEach(function (pt, jx) {
        //     jt.log(("    " + jx).slice(-4) + " " + pt.date + " " +
        //            pt.text.slice(0, 40) + "..."); });
        tl.points = tl.randpts;
    }


    function initTimelinesContent () {
        if(!dcon || !dcon.ds) { return; }  //timelines not loaded yet
        dcon.points = [];  //all points for all timelines in series
        dcon.ds.forEach(function (tl, ix) {
            var ctc, idx;
            ctc = tl.ctype.split(":");
            ctc = {type:ctc[0], levcnt:ctc[1] || 6, rndmax:ctc[2] || 18};
            tl.pointsPerSave = Number(ctc.levcnt);
            tl.dsindex = ix;
            prepData(tl);  //sets tl.points
            if(ctc.type === "Random") {
                rebuildRandomPointsSelection(tl, ctc); }
            dcon.points = dcon.points.concat(tl.points); });
        dcon.points.sort(function (a, b) {
            return compareStartDate(a, b); });
        dcon.ctx = makeCoordContext(dcon.points);
        dcon.points.forEach(function (pt) {
            makeCoordinates(pt, dcon.ctx); });
        dcon.points.forEach(function (pt) {     //convert from -maxy|maxy
            pt.vc = pt.vc + dcon.ctx.maxy; });  //to 0|2*maxy for chart
        makeTimelineLevels();
    }


    function makeTimelineDisplaySeries (tls) {
        var serstr = "";
        tls.forEach(function (tl) {
            jt.log("caching timeline " + tl.instid + " " + tl.name);
            app.user.tls[tl.instid] = tl; });
        dcon = {ds:[], tlid:tls[0].instid, prog:null};  //reset display context
        stackTimeline(tls[0]);   //recursive walk to build display series 
        initTimelinesContent();  //points for random, levels
        dcon.ds.forEach(function (tl) {
            if(serstr) {
                serstr += ", "; }
            serstr += tl.name; });
        jt.log("Timeline display series: " + serstr);
    }


    function noteVisitedPSVs(pt, ct) {
        jt.log("noteVisitedPSVs not implemented yet");
    }


    function nextInteraction () {
        var currlev = recalcProgress(),
            points = currlev.lev.rempts.slice(0, currlev.tl.pointsPerSave);
        dcon.mrcl = currlev;  //most recent currlev, non-critical reference
        if(currlev.tl.dsindex === 0 && currlev.lev.num === 1 &&
           currlev.lev.levpcnt === 0 && !currlev.lev.startbuttonshown) {
            currlev.lev.startbuttonshown = true;
            return app.dlg.start(jt.fs("app.db.nextInteraction()")); }
        app.mode.updlev(currlev);
        if(points.length > 0) {
            points.reverse();  //so they can be popped off in order...
            return app.mode.showNextPoints(points); }
        if(!currlev.lev.svShown && currlev.lev.svname !== "none") {
            return app[currlev.lev.svname].display(); }
        if(!currlev.lev.levelupShown) {
            if(currlev.lev.num === currlev.lev.maxnum) {
                return app.finale.display(true); }
            return app.levelup.display(currlev); }
        jt.log("db.nextInteraction fell through. Should never happen. ");
    }


    function findPointById (ptid) {
        var points, i, pt;
        points = app.allpts;
        for(i = 0; i < points.length; i += 1) {
            pt = points[i];
            if(pt.instid === ptid) {
                return pt; } }
        return null;
    }


    function mergeProgToAccount () {
        var prog = dcon.prog, i, stp, update = false;
        app.user.acc.started = app.user.acc.started || [];
        for(i = 0; i < app.user.acc.started.length; i += 1) {
            stp = app.user.acc.started[i];
            if(stp.tlid === prog.tlid) {
                update = true;
                //if the current progress is more substantial then use it,
                //otherwise they probably just signed in and want to continue.
                if(prog.pts.length > stp.pts.length) {  //str len close enough
                    app.user.acc.started[i] = prog; } } }
        if(!update) {
            app.user.acc.started.push(prog); }
    }


    function mergePointDataToPoint (pt, updpt) {
        //updpt may be incomplete
        Object.keys(updpt).forEach(function (field) {
            pt[field] = updpt[field]; });
    }


    function mergeUpdatedPointData (updpt) {
        if(app.allpts) {
            app.allpts.forEach(function (pt) {
                if(pt.instid === updpt.instid) {
                    mergePointDataToPoint(pt, updpt); } }); }
        if(app.user.tls) {
            Object.keys(app.user.tls).forEach(function (tlid) {
                app.user.tls[tlid].points.forEach(function (pt) {
                    if(pt.instid === updpt.instid) {
                        mergePointDataToPoint(pt, updpt); } }); }); }
    }


    function fetchDisplayTimeline () {
        var slug = "demo",
            url = window.location.href,
            tlmarker = "/timeline/",
            idx = url.indexOf(tlmarker);
        if(idx >= 0) {
            slug = url.slice(idx + tlmarker.length); }
        jt.log("fetchDisplayTimeline slug: " + slug);
        jt.out("rhcontentdiv", "Loading " + slug + "...");
        app.user.tls = app.user.tls || {};
        //PENDING: Go with localStorage timeline if available, then redisplay
        //if db fetch shows anything has changed.
        jt.call("GET", "fetchtl?slug=" + slug, null,
                function (result) {  //one or more timeline objects
                    result.forEach(function (tl) {
                        app.db.deserialize("Timeline", tl); });
                    makeTimelineDisplaySeries(result);
                    app.linear.display(recalcProgress()); },
                function (code, errtxt) {
                    jt.out("rhcontentdiv", jt.tac2html([
                        "Could not load " + slug + ": " + code + " " + errtxt,
                        ["br"],
                        ["a", {href:"https://usracehistory.org"},
                         "Click here to load the default timeline"]]));
                    app.dlg.signin(); },
                jt.semaphore("db.fetchDisplayTimeline"));
    }


    function noteSuppvizDone (svid, start, end) {
        var svs = dcon.prog.svs, upd = "";
        if(!svs || !svs.csvcontains(svid)) {
            svs = svs.csvappend(svid + ";" + start.toISOString() + ";" +
                                end.toISOString() + ";0"); }
        svs.csvarray().forEach(function (sv) {
            if(upd) {
                upd += ","; }
            sv = sv.split(";");
            if(sv[0] === svid) {
                sv[3] = String(Number(sv[3]) + 1); }
            upd += sv.join(";"); });
        dcon.prog.svs = upd;
    }


    function serialize (dbc, dbo) {
        switch(dbc) {
        case "AppUser":
            dbo.settings = JSON.stringify(dbo.settings || {});
            dbo.remtls = JSON.stringify(dbo.remtls || []);
            dbo.completed = JSON.stringify(dbo.completed || []);
            dbo.started = JSON.stringify(dbo.started || []);
            dbo.built = JSON.stringify(dbo.built || []);
            break;
        case "Timeline":
            dbo.preb = JSON.stringify(dbo.preb || []);
            break;
        case "Point":
            dbo.refs = JSON.stringify(dbo.refs || []);
            dbo.translations = JSON.stringify(dbo.translations || []);
            dbo.stats = JSON.stringify(dbo.stats || {});
            break;
        default:
            jt.log("Attempt to serialize unknown db class: " + dbc); }
    }


    function deserialize (dbc, dbo) {
        switch(dbc) {
        case "AppUser":
            dbo.settings = JSON.parse(dbo.settings || "{}");
            dbo.remtls = JSON.parse(dbo.remtls || "[]");
            dbo.completed = JSON.parse(dbo.completed || "[]");
            dbo.started = JSON.parse(dbo.started || "[]");
            dbo.built = JSON.parse(dbo.built || "[]");
            break;
        case "Timeline":
            dbo.preb = JSON.parse(dbo.preb || "[]");
            break;
        case "Point":
            dbo.refs = JSON.parse(dbo.refs || "[]");
            dbo.translations = JSON.parse(dbo.translations || "[]");
            dbo.stats = JSON.parse(dbo.stats || "{}");
            break;
        default:
            jt.log("Attempt to deserialize unknown db class: " + dbc); }
    }


    function postdata (dbc, dbo) {
        var dat;
        serialize(dbc, dbo);
        dat = jt.objdata(dbo);
        deserialize(dbc, dbo);
        return dat;
    }
            
        
    return {
        wallClockTimeStamp: function (d) { return wallClockTimeStamp(d); },
        getElapsedTime: function (sd, ed) { return getElapsedTime(sd, ed); },
        parseDate: function (pt) { parseDate(pt); },
        makeCoordContext: function (pts) { return makeCoordContext(pts); },
        makeCoordinates: function (pt, ctx) { makeCoordinates(pt, ctx); },
        describeDateFormat: function () { return describeDateFormat(); },
        fetchDisplayTimeline: function () { fetchDisplayTimeline(); },
        serialize: function (dbc, dbo) { serialize(dbc, dbo); },
        deserialize: function (dbc, dbo) { deserialize(dbc, dbo); },
        postdata: function (dbc, dbo) { return postdata(dbc, dbo); },
        displayContext: function () { return dcon; },
        svdone: function (svid, sta, end) { noteSuppvizDone(svid, sta, end); },
        nextInteraction: function () { nextInteraction(); },
        mergeProgToAccount: function () { mergeProgToAccount(); },
        pt4id: function (ptid) { return findPointById(ptid); },
        mergeUpdatedPointData: function (pt) { mergeUpdatedPointData(pt); },
        initTimelines: function () { initTimelinesContent(); }
    };
}());
