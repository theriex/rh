/*jslint browser, white, fudge, for, long */
/*global app, window, jt, d3, confirm */

app.db = (function () {
    "use strict";

    var dcon = null;  //The current display context (timeline, progress etc)


    function makeDisplayDate (pt) {
        var dd = "";
        var months = ["January", "February", "March", "April", "May", "June",
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


    function parseDate (pt) {
        pt.date = pt.date.replace(/(\d{4}s?)-(\d{4}s?)/g, "$1 to $2");
        var pd = app.tabular.managerDispatch("date", "parseDateExpression",
                                             pt.date);
        pt.start = pd.start;
        pt.end = pt.end;  //undefined if no range specified
        makeDisplayDate(pt);
    }


    function makeCoordContext (pts) {
        //X coordinates are start times. Y coordinates start at zero (the
        //center line) and are adjusted up or down to avoid overlap with
        //adjacent points.  If the previous point was adjusted above the
        //center line, then the next is adjusted below for visual balance.
        var xbs = 32;  //x bands, how many columns to divide the x-axis into
        var sy = (pts.length? pts[0].start.year : 0);
        var ey = (pts.length? pts[pts.length - 1].start.year : 0);
        var iw = Math.ceil((ey - sy) / xbs);
        var ctx = {lq:[],    //LIFO queue of pts within iw (most recent first)
                   zz:1,     //zigzag direction (alternates 1/-1)
                   maxy:0};  //max vertical (either up or down)
        ctx.iw = iw;  //horizontal direction width (in years)
        //jt.log("coordinate context iw: " + iw);
        return ctx;
    }


    function getTimeCode (pt) {
        //D3 has very good support for dates, but a date value is more
        //precision than the data specifies, and it is hard to read in raw
        //form.  Using a "time code" instead consisting of the start year
        //and a fractional portion indicating the number of days out of 366
        //(leaps included).  The time code has 3 decimal places so 1994Nov8
        //and 1994Nov9 have distinct values.
        var mds = [0,  //Jan
                   31, //Feb
                   60, //Mar
                   91, //Apr
                   121, //May
                   152, //Jun
                   182, //Jul
                   213, //Aug
                   244, //Sep
                   274, //Oct
                   305, //Nov
                   335]; //Dec
        var y = pt.start.year;
        var m = pt.start.month || 0;
        var d = pt.start.day || 0;
        var tc;
        if(m) {
            m -= 1; }  //switch from one-based month to array index
        tc = Math.round(((mds[m] + d) / 366) * 1000) / 1000;
        if(Number.isNaN(y + tc)) {
            jt.log("Problem tc for Point " + pt.dsId); }
        return y + tc;
    }


    function makeCoordinates (pt, ctx) {
        var vm; var i; var pp;
        pt.tc = getTimeCode(pt);
        //vertical code defaults to zero, representing the center line
        pt.vc = 0;
        vm = true;
        while(ctx.lq.length && pt.tc - ctx.lq[ctx.lq.length - 1].tc > ctx.iw) {
            ctx.lq.pop(); }  //remove any point not within interaction width
        while(vm) {  //moved vertically, recheck for conflicts
            vm = false;
            for(i = 0; i < ctx.lq.length; i += 1) {
                pp = ctx.lq[i];
                if(pp.vc === pt.vc) {
                    pt.vc += ctx.zz;
                    vm = true; } } }
        if(pt.vc) {  //zigged or zagged to place the point, switch direction
            ctx.zz *= -1; }
        else {  //point fit on the center line, reset zigzag to base value
            ctx.zz = 1; }
        ctx.lq.unshift(pt);  //prepend this latest point.
        ctx.maxy = Math.max(ctx.maxy, Math.abs(pt.vc));
    }


    //The id should not be interpretable as a number or D3 has issues.  For
    //basic HTML, the id should start with a letter but may include periods,
    //dashes and underscores.  For HTML5 it just needs to contain a letter
    //and not have any spaces.  But periods and dashes make the id an
    //invalid CSS selector which messes up mouseover processing.
    //Providing the number of years ago an event occurred gives an
    //additional level of approachability.
    function makePointIdent (pt, ny, ptids) {
        var ident = "t" + (ny - pt.start.year);
        ident += "_x" + pt.tc + "_y" + pt.vc;
        ident = ident.replace(".", "_");  //need valid CSS selector val
        pt.id = ident;
        //log any point id duplicates. shouldn't happen, but worth verifying
        if(ptids) {
            if(ptids[pt.id]) {
                jt.log("Duplicate point id: " + pt.id + " " + ptids[pt.id] +
                       " and " + pt.dsId); }
            ptids[pt.id] = pt.dsId; }
    }


    function compareStartDate (a, b) {
        a.tc = a.tc || getTimeCode(a);
        b.tc = b.tc || getTimeCode(b);
        return a.tc - b.tc;
    }


    //Important that all arrays of points be in chronological sorted order
    //when processing.  This is what enables merging points from a randomly
    //selected timeline with points from a chronological timeline.  Prebuilt
    //timeline data for a timeline is saved in edit order (not chronological).
    function prepPointsArray (pts) {
        pts.forEach(function (pt) {
            if(pt.refs && !Array.isArray(pt.refs)) {
                app.refmgr.deserialize(pt); }
            if(!pt.start) {
                parseDate(pt); }
            if(!pt.tc) {
                pt.tc = getTimeCode(pt); } });
        pts.sort(function (a, b) {  //verify in chrono order
            return compareStartDate(a, b); });
    }


    //The preb data points in the timeline are a subset of the database
    //fields as written by tldat.py point_preb_summary.  The following
    //fields are added from calculations and user data:
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
        jt.log("Preparing data for " + tl.name + "...");
        tl.points = tl.preb || [];
        prepPointsArray(tl.points);
        app.db.cachePoints(tl.points);
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


    function parseProgStr (str) {
        var ces; 
        var pes = {isoShown:"", isoClosed:"", viewCount:0, tagCodes:""};
        if(str) {
            ces = str.split(";");
            pes.isoShown = ces[1];
            pes.isoClosed = ces[2];
            if(ces.length > 3) {
                pes.viewCount = Number(ces[3]); }
            if(ces.length > 4) {
                pes.tagCodes = ces[4]; } }
        return pes;
    }


    function getProgressElements (csv, id) {
        var idx; var str;
        idx = csv.indexOf(id);
        if(idx < 0) {
            return parseProgStr(); }
        str = csv.slice(idx);
        idx = str.indexOf(",");
        if(idx >= 0) {
            str = str.slice(0, idx); }
        return parseProgStr(str);
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
        pes = getProgressElements(dcon.prog.pts, pt.dsId);
        Object.keys(pes).forEach(function (key) {
            pt[key] = pes[key]; });
        pt.visited = pt.isoShown;
        return pt.visited;
    }


    function unvisitPoint (pt) {
        pt.isoShown = "";
        pt.isoClosed = "";
        pt.viewCount = 0;
        pt.tagCodes = "";
        pt.visited = "";
    }


    function clearVisited () {
        dcon.ds.forEach(function (tl) {
            tl.visited = "";
            tl.levs.forEach(function (lev) {
                lev.visited = "";
                lev.points.forEach(function (pt) {
                    unvisitPoint(pt); }); }); });
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
        dcon.prog.st = jt.isoString2Time(compinst.latest);
    }


    function verifyProgressInfo () {
        var acc; var proginst;
        if(!dcon.prog) {
            dcon.prog = {tlid:dcon.lastTL.dsId,
                         st:new Date().toISOString(),
                         remindme:"yes", svs:"", pts:""}; }
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
        dcon.ds.forEach(function (tl) {
            if(!tl.visited) {
                tl.visited = true;
                tl.levs.forEach(function (lev) {
                    if(!lev.visited) {
                        lev.rempts = [];
                        lev.points.forEach(function (pt) {
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
                            currlev = {};
                            currlev.tl = tl;
                            currlev.lev = lev; } }
                    tl.visited = tl.visited && lev.visited; }); } });
        if(!currlev) {  //return last level of final timeline for display
            currlev = {tl:dcon.lastTL, lev:dcon.lastLev};
            currlev.lev.levpcnt = 1;
            currlev.lev.rempts = []; }
        return currlev;
    }


    function makeTimelineLevels () {
        dcon.ds.forEach(function (tl) {
            var levs = []; var ppl;
            tl.svs.csvarray().forEach(function (svn) {
                levs.push({svname:svn,
                           svShown:"",       //suppviz not displayed yet
                           levelupShown:"",  //levelup viz not displayed yet
                           num:levs.length + 1}); });
            //end with empty level to show levelup and then finale
            levs.push({svname:"none", num:levs.length + 1});
            ppl = Math.floor(tl.points.length / levs.length);
            levs.forEach(function (lev, idx) {
                if(idx < levs.length - 1) {
                    lev.points = tl.points.slice(idx * ppl, (idx + 1) * ppl); }
                else {  //any remainder points go in last level
                    lev.points = tl.points.slice(idx * ppl); } });
            // levs.forEach(function (lev, idx) {
            //     var txt = "lev " + idx + ": " + lev.points.length + " ";
            //     if(lev.points.length) {
            //         txt += lev.points[0].dsId + "..." +
            //             lev.points[lev.points.length - 1].dsId; }
            //     jt.log(txt); });
            tl.levs = levs; });
        //calculate endpoint values (just avoiding cluttering up prev loop)
        dcon.ds.forEach(function (tl) {
            dcon.lastTL = tl;
            tl.levs.forEach(function (lev) {
                dcon.lastLev = lev; }); });
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
            if(points[i].dsId === ptid) {
                return i; } }
        return -1;
    }


    function rebuildRandomPointsSelection(tl, ctc) {
        var idx; var prog = getTimelineProgressRecord();
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


    function mergePointsIntoAppCache (aps) {
        aps.forEach(function (pt) {
            var acpt = app.mpac[pt.dsId];
            if(!acpt || acpt.modified < pt.modified) {
                app.mpac[pt.dsId] = pt; } });
    }


    function mergePoints (aps, bps) {
        var mps = [];
        app.mpac = {};  //keep for easy general lookup by point id
        if(!aps || !bps) {
            jt.log("db.mergePoints missing parameter"); }
        mergePointsIntoAppCache(aps);
        mergePointsIntoAppCache(bps);
        Object.keys(app.mpac).forEach(function (ptid) {
            mps.push(app.mpac[ptid]); });
        mps.sort(compareStartDate);
        return mps;
    }


    function cachePoints (pts) {
        app.allpts = app.allpts || [];
        app.allpts = mergePoints(app.allpts, pts);
    }


    function initTimelinesContent () {
        var ny = new Date().getFullYear(); var ptids = {};
        if(!dcon || !dcon.ds) { return; }  //timelines not loaded yet
        dcon.points = [];  //all points for all timelines in series
        dcon.ds.forEach(function (tl, ix) {
            var ctc = tl.ctype.split(":");
            ctc = {type:ctc[0], levcnt:ctc[1] || 6, rndmax:ctc[2] || 18};
            tl.pointsPerSave = Number(ctc.levcnt);
            tl.dsindex = ix;
            prepData(tl);  //parse dates, sort, set tl.points..
            if(ctc.type === "Random") {
                rebuildRandomPointsSelection(tl, ctc); }
            dcon.points = mergePoints(dcon.points, tl.points); });
        dcon.ctx = makeCoordContext(dcon.points);
        dcon.points.forEach(function (pt) {
            makeCoordinates(pt, dcon.ctx); });
        dcon.points.forEach(function (pt) {
            makePointIdent(pt, ny, ptids); });  //id requires pt.vc calculated
        dcon.points.forEach(function (pt) {     //convert from -maxy|maxy
            pt.vc = pt.vc + dcon.ctx.maxy; });  //to 0|2*maxy for chart
        makeTimelineLevels();
    }


    function makeTimelineDisplaySeries (tls) {
        var serstr = "";
        tls.forEach(function (tl) {
            jt.log("caching timeline " + tl.dsId + " " + tl.name);
            app.user.tls[tl.dsId] = tl; });
        dcon = {ds:[], tlid:tls[0].dsId, prog:null};  //reset display context
        stackTimeline(tls[0]);   //recursive walk to build display series 
        initTimelinesContent();  //points for random, levels
        dcon.ds.forEach(function (tl) {
            if(serstr) {
                serstr += ", "; }
            serstr += tl.name; });
        jt.log("Timeline display series: " + serstr);
    }


    function parseComment (cmt) {
        var m;
        if(!cmt) {
            return ""; }
        m = cmt.match(/(.*)\[(.*)\]/);
        if(m) {
            return {type:"popup", text:m[1], button:m[2]}; }
        return {type:"unknown", text:cmt};
    }


    function nextInteraction () {
        var currlev = recalcProgress();
        var points = currlev.lev.rempts.slice(0, currlev.tl.pointsPerSave);
        dcon.mrcl = currlev;  //most recent currlev, non-critical reference
        if(currlev.tl.dsindex === 0 && currlev.lev.num === 1 &&
           currlev.lev.levpcnt === 0 && !currlev.lev.startbuttonshown) {
            currlev.lev.startbuttonshown = true;
            return app.dlg.start(dcon.lastTL.title, dcon.lastTL.subtitle,
                                 jt.fs("app.db.nextInteraction()"),
                                 parseComment(dcon.lastTL.comment)); }
        app.dlg.verifyClosed();  //clear any stray save status dlg
        app.mode.updlev(currlev);
        if(points.length > 0) {
            points.reverse();  //so they can be popped off in order...
            return app.mode.showNextPoints(points); }
        if(!currlev.lev.svShown && currlev.lev.svname !== "none") {
            app.mode.updqrc(0);
            return app[currlev.lev.svname].display(); }
        if(!currlev.lev.levelupShown) {
            return app.levelup.display(currlev); }
        //no points left, sv shown, levelup shown, go with the finale
        app.finale.display(true);  //record it so on reload they can restart
    }


    function findPointById (ptid, points) {
        var i; var pt;
        if(app.mpac && app.mpac[ptid]) {
            return app.mpac[ptid]; }
        //allpts is the largest repository of available points merged for
        //latest data.  Use provided default only if allpts is unavailable.
        if(app.allpts && app.allpts.length) {
            points = app.allpts; }
        else {
            points = points || []; }
        for(i = 0; i < points.length; i += 1) {
            pt = points[i];
            if(pt.dsId === ptid) {
                return pt; } }
        return null;
    }


    //Markdown transformation manager
    var mkdmgr = {
        html2mkd: function (txt) {
            txt = txt.replace(/<a\shref\s*=\s*"#([^"]+)">([^<]+)<\/a>/gi,
                              "[$2]($1)");
            txt = txt.replace(/<i>([^<]+)<\/i>/gi, "*$1*");
            txt = txt.replace(/<b>([^<]+)<\/b>/gi, "**$1**");
            txt = txt.replace(/<em\sclass="titleem">([^<]):<\/em>/gi, "$1:");
            return txt; },
        mkd2html: function (txt, ptid, pts, fname) {
            txt = txt.replace(/\[([^\]]*)\]\(([^)]*)\)/gi,
                function (ignore /*match*/, p1, p2) {
                    return mkdmgr.pointRefLink(p1, p2, ptid, pts, fname); });
            txt = txt.replace(/\*{2}([^*]+)\*{2}/gi, "<b>$1</b>");
            txt = txt.replace(/\*([^*]+)\*/gi, "<i>$1</i>");
            txt = txt.replace(/^((\s?[^\s:]+){1,5}):/gi,
                              "<em class=\"titleem\">$1:</em>");
            return txt; },
        pointRefLink: function (linktext, srcval, ptid, pts, fname) {
            var refid = mkdmgr.src2ptid(srcval, ptid, pts);
            if(!refid) {
                jt.log("Point " + ptid + ": [" + linktext + "](" + srcval + 
                       ") not found.");
                //leave the standardized link to indicate not converted
                return "[" + linktext + "](" + srcval + ")"; }
            //fname params: dsId of linked Point, dsId of this Point
            return "<a href=\"#" + jt.enc(srcval) + "\" onclick=" +
                jt.fs(fname + "('" + refid + "','" + ptid + "')") +
                "\">" + linktext + "</a>"; },
        src2ptid: function (srcval, ptid, pts) {
            var s = {spid:0, idx:0, subpid:0, subsrc:""};
            //while no match found and before the current point
            while(!s.spid && s.idx < pts.length && pts[s.idx].dsId !== ptid) {
                if(pts[s.idx].source === srcval) {
                    s.spid = pts[s.idx].dsId; }
                else if(pts[s.idx].source
                        .toLowerCase().indexOf(srcval.toLowerCase()) >= 0) {
                    s.subsrc = pts[s.idx].source;
                    s.subpid = pts[s.idx].dsId; }
                s.idx += 1; }
            if(s.spid) {
                return s.spid; }
            // if(s.subsrc) {
            //     jt.log("Connecting " + srcval + " link to " + s.subsrc); }
            return s.subpid; },
        fmt: function (pt, pts, fname) {
            var txt = pt.text || "";
            txt = mkdmgr.html2mkd(txt);  //normalize legacy included html
            txt = mkdmgr.mkd2html(txt, pt.dsId, pts, fname);
            return txt; }
    };


    function mergeProgToAccount () {
        var prog = dcon.prog; var i; var stp; var update = false;
        prog.latestsave = new Date().toISOString();
        prog.reminder = "";
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


    function getTimelineSlug () {
        var slug = ""; var params; var href = window.location.href;
        var tlmarker = "/timeline/"; var idx = href.indexOf(tlmarker);
        if(idx >= 0) {
            slug = href.slice(idx + tlmarker.length);
            if(slug.indexOf("#") > 0) {
                slug = slug.slice(0, slug.indexOf("#")); }
            if(slug.indexOf("?") > 0) {
                slug = slug.slice(0, slug.indexOf("?")); } }
        if(slug) { 
            return slug; }
        params = jt.parseParams("String");
        if(params.compcert && params.email) {
            app.mode.showcert(); }
        else {
            app.mode.showlanding(); }
        return "";
    }


    function fetchDisplayTimeline () {
        var url; var slug = getTimelineSlug();
        if(!slug) {  //no timeline specified, alt display already handled
            return; }
        jt.log("fetchDisplayTimeline slug: " + slug);
        jt.out("loadstatdiv", "Loading " + slug + "...");
        app.user.tls = app.user.tls || {};
        //PENDING: Go with localStorage timeline if available, then redisplay
        //if db fetch shows anything has changed.
        url = "/api/fetchtl?" + app.db.uidp() + "&slug=" + slug;
        if(app.user.acc) {
            url += "&uid=" + app.user.acc.dsId; }
        jt.call("GET", url, null,
                function (result) {
                    result.forEach(function (tl) {
                        app.refmgr.put(app.refmgr.deserialize(tl)); });
                    makeTimelineDisplaySeries(result);
                    app.linear.display(recalcProgress()); },
                function (code, errtxt) {
                    jt.out("rhcontentdiv", jt.tac2html([
                        "Could not load " + slug + ": " + code + " " + errtxt,
                        ["br"],
                        ["a", {href:"https://pastkey.org"},
                         "Click here to return to the main site."]]));
                    app.dlg.signin(); },
                jt.semaphore("db.fetchDisplayTimeline"));
    }


    function noteSuppvizDone (svid, start, end) {
        var svs = dcon.prog.svs; var upd = "";
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


    function userIdParam () {
        var td = app.amdtimer.load.end;
        var uid = td.toISOString() + td.getTimezoneOffset();
        if(app.user && app.user.acc) {
            uid = app.user.acc.dsId; }
        return "uidp=" + uid;
    }


    return {
        parseDate: function (pt) { parseDate(pt); },
        makeCoordContext: function (pts) { return makeCoordContext(pts); },
        makeCoordinates: function (pt, ctx) { makeCoordinates(pt, ctx); },
        fetchDisplayTimeline: function () { fetchDisplayTimeline(); },
        displayContext: function () { return dcon; },
        svdone: function (svid, sta, end) { noteSuppvizDone(svid, sta, end); },
        nextInteraction: function () { nextInteraction(); },
        mergeProgToAccount: function () { mergeProgToAccount(); },
        pt4id: function (ptid, points) { return findPointById(ptid, points); },
        initTimelines: function () { initTimelinesContent(); },
        ptt2html: function (p, s, f) { return mkdmgr.fmt(p, s, f); },
        uidp: function () { return userIdParam(); },
        cachePoints: function (pts) { return cachePoints(pts); },
        unvisitPoint: function (pt) { unvisitPoint(pt); },
        recalcProgress: function () { return recalcProgress(); },
        compareStartDate: function (a, b) { return compareStartDate(a, b); },
        parseProgStr: function (str) { return parseProgStr(str); }
    };
}());
