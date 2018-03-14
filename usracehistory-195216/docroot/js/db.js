/*jslint browser, multivar, white, fudge */
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
        descr = descr.join("<br\>");
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
        pt.start.year = +(pt.start.year);
        if(date.indexOf(" BCE") >= 0) {
            date = date.slice(date.indexOf(" BCE") + 4);
            pt.start.year *= -1; }
        //start month
        mres = date.match(/^\-\d\d(\-|$)/);
        if(mres) {
            date = date.slice(3);
            pt.start.month = +(mres[0].slice(1,3)); }
        //start day
        mres = date.match(/^\-\d\d(\-|$)/);
        if(mres) {
            date = date.slice(3);
            pt.start.day = +(mres[0].slice(1,3)); }
        //end year
        if(date.indexOf("-") >= 0) {
            date = date.slice(date.indexOf("-") + 1); }
        mres = date.match(/^\d\d?\d?\d?/);
        if(mres) {
            date = date.slice(mres[0].length);
            pt.end = {};
            pt.end.year = +(mres[0]); }
        //end month
        mres = date.match(/^\-\d\d(\-|$)/);
        if(mres) {
            date = date.slice(3);
            pt.end.month = +(mres[0].slice(1,3)); }
        //end day
        mres = date.match(/^\-\d\d/);
        if(mres) {
            date = date.slice(3);
            pt.end.day = +(mres[0].slice(1,3)); }
        makeDisplayDate(pt);
    }


    //D3 has very good support for dates, but that level of precision
    //is more than the data specifies in many instances so using a
    //fractional year rounded to two decimal places instead.  The y
    //coordinate is the one-based point count within the year.
    function makeCoordinates (pt, ctx) {
        var y, m, d;
        y = pt.start.year;
        m = pt.start.month || 0;
        d = pt.start.day || 0;
        pt.tc = Math.round((y + m/12 + d/365) * 100) / 100;
        if(ctx.yr === pt.start.year) {
            ctx.dy += 1;   //next y coordinate value within year
            if(ctx.dy > ctx.maxy) {
                //alert("Increasing maxy to " + ctx.dy + " year: " + ctx.yr);
                ctx.maxy = ctx.dy; } }
        else {
            ctx.yr = pt.start.year;  //reset year context
            ctx.dy = 1; }            //first y coordinate value within year
        pt.oc = ctx.dy;
    }


    //vertically center all points for a year
    function centerPointGroup(pts) {
        if(!pts) {
            return; }
        // if(pts.length >= 4) {
        //     jt.log("centerPointGroup " + pts[0].start.year); }
        pts.forEach(function (pt) {
            var mx = dcon.maxy,
                mid = Math.round(mx / 2),
                off = mid - Math.round(pts.length / 2);
            pt.oc = (mx + 1) - pt.oc;   //invert so first point in series is top
            pt.oc -= off;  //cluster points around center line
        });
    }


    //Organize the points so they start in the middle and extend both
    //upwards and downwards to an equal degree.
    function centerYCoordinates (pt, ctx) {
        if(ctx.yr === pt.start.year) {
            ctx.grp.push(pt); }
        else {
            centerPointGroup(ctx.grp);
            ctx.yr = pt.start.year;
            ctx.grp = [pt]; }
    }


    //The core of the point identifier is the number of years ago the
    //event occurred.  That keeps more modern history entries more
    //concise and generally reduces clutter.  D3 has problems with
    //numeric ids, so a letter prefix is required.  Multiple entries
    //within the same year are distinguished by their y coordinate.
    function makePointIdent (pt, ny) {
        var ident = "y" + (ny - pt.start.year);
        if(pt.oc > 1) {
            ident += "_" + pt.oc; }
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


    function getStateURLParams () {
        var pstr = "", pb = "", pc = 0, pidx = 0, pbm = 100;
        pstr += "id=" + (app.userId || 0);
        pstr += "&st=" + app.startTime;
        app.data.suppvis.forEach(function (sv) {
            if(sv.visited) {
                pstr += "&" + sv.code + "=" + sv.startstamp + ":" + 
                    sv.duration; } });
        app.data.pts.forEach(function (pt) {
            if(pt.visited && !pt.sv) {
                if(pb) {
                    pb += ":"; }
                pb += String(pt.duration) + pt.cid;
                if(pt.remembered) {
                    pb += "r"; }
                pc += 1;
                if(pc >= pbm) {
                    pstr += "&pb" + pidx + "=" + pb;
                    pb = "";
                    pc = 0;
                    pidx += 1; } } });
        if(pb) {  //append partially filled points block
            pstr += "&pb" + pidx + "=" + pb; }
        return pstr;
    }


    function describePoints () {
        jt.log("Point distributions for " + dcon.tl.name + 
               " (" + dcon.tl.points.length + " for display)");
        Object.keys(dcon.stat).forEach(function (key) {
            var stat = dcon.stat[key];
            jt.log(("    " + stat.count).slice(-4) + " " + stat.name); });
    }


    function notePointCounts (pt) {
        dcon.stat = dcon.stat || {
            N: {count:0, name:"Native American"},
            B: {count:0, name:"African American"},
            L: {count:0, name:"Latino/as"},
            A: {count:0, name:"Asian American"},
            M: {count:0, name:"Middle East and North Africa"},
            R: {count:0, name:"Multiracial"}};
        for(var i = 0; i < pt.codes.length; i += 1) {
            if(dcon.stat[pt.codes.charAt(i)]) {
                dcon.stat[pt.codes.charAt(i)].count += 1; } }
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
    //    ptid: The database point instance id.  Aka "citation id"
    //    date: Date or range.  See README.md for allowed formats.
    //    text: Description of the point (max 1200 chars)
    //    codes: NBLAMRUFD (see point.py point_codes)
    //    orgid: Organization id, 1 is public
    //    keywords: CSV of org defined keywords (regions, categories, tags)
    //    source: Arbitrary source tag used when the point was loaded.
    //    pic: ptid if an image exists, empty string otherwise
    //    modified: ISO when the point was last updated
    //These fields added from calculations and user data:
    //    start: {year: number, month?, day?}
    //    end?: {year: number, month?, day?}
    //    tc: time coordinate number (start year + percentage) * 100
    //    oc: offset coordinate number (one-based start year event count val)
    //    id: text years ago + sep + offset (used for dom elements)
    //    isoShown: ISO date when last shown
    //    isoClosed: ISO date when last completed (ok, right date, etc)
    //    tagCodes: rku1234 (see appuser.py AppUser class def comment)
    function prepData () {
        var ctx = {yr: 0, dy: 0, maxy: 0},
            ny = new Date().getFullYear();
        if(dcon.tl.dataPrepared) {
            return jt.log("data already prepared for " + dcon.tl.name); }
        jt.out("rhcontentdiv", "Preparing data...");
        dcon.tl.points.forEach(function (pt, idx) {
            notePointCounts(pt);
            pt.currdataindex = idx;
            parseDate(pt);
            makeCoordinates(pt, ctx);
            makePointIdent(pt, ny); });
        dcon.maxy = ctx.maxy;
        ctx = {yr: 0, grp: null};
        dcon.tl.points.sort(function (a, b) {  //verify in chrono order
            return compareStartDate(a, b); });
        dcon.tl.points.forEach(function (pt) {
            centerYCoordinates(pt, ctx); });
        describePoints();
        dcon.tl.dataPrepared = true;
    }


    function saveState () {
        var state = getStateURLParams();
        jt.log("db.saveState: " + state);
        window.localStorage.setItem("savestatestr", state);
    }


    function stackTimeline (par) {
        //present all children in order, then this timeline
        if(par.ctype.startsWith("Timelines")) {
            par.cids.csvarray().forEach(function (tlid) {
                var chi = app.user.tls[tlid] || null;
                stackTimeline(chi); }); }
        dcon.ds.push(par);
    }


    function getTimelineProgressRecord (tl) {
        var prog = {tlid:tl.instid, st:new Date().toISOString(), 
                    svs:"", pts:""};
        if(app.user && app.user.acc && app.user.acc.started) {
            app.user.acc.started.forEach(function (st) {
                if(st.tlid === tl.instid) {
                    prog = st; } }); }
        return prog;
    }


    function pointIndexForId (ptid, points) {
        var i;
        for(i = 0; i < points.length; i += 1) {
            if(points[i].ptid === ptid) {
                return i; } }
        return -1;
    }


    function makeTimelineDisplaySeries (tls) {
        var prog, serstr = "", idx;
        tls.forEach(function (tl) {
            jt.log("caching timeline " + tl.instid + " " + tl.name);
            app.user.tls[tl.instid] = tl; });
        dcon = {ds:[], tl:null, prog:null};  //reset display context
        stackTimeline(tls[0]);  //recursive walk to build display series 
        dcon.ds.forEach(function (tl) {
            var ctc;
            ctc = tl.ctype.split(":");
            ctc = {type:ctc[0], levcnt:ctc[1] || 6, rndmax:ctc[2] || 18};
            tl.pointsPerSave = Number(ctc.levcnt);
            tl.points = tl.preb;
            if(ctc.type === "Random") {
                ctc.rndmax = Number(ctc.rndmax);
                tl.randpts = [];
                tl.unused = tl.preb.slice();
                //move all visited points from unused into randpts
                prog = getTimelineProgressRecord(tl);
                prog.pts.csvarray().forEach(function (pp) {
                    var idx = pointIndexForId(pp.split(":")[0], tl.unused);
                    if(idx >= 0) {
                        tl.randpts.push(tl.unused[idx]);
                        tl.unused.splice(idx, 1); } });
                //randomly select remaining points from unused
                while(tl.randpts.length < ctc.rndmax) {
                    idx = Math.floor(Math.random() * tl.unused.length);
                    tl.randpts.push(tl.unused.splice(idx, 1)[0]); }
                jt.log("Random points for " + tl.name);
                tl.randpts.forEach(function (pt, idx) {
                    jt.log(("    " + idx).slice(-4) + " " + pt.date + " " +
                           pt.text.slice(0, 40) + "..."); });
                tl.points = tl.randpts; } });
        dcon.ds.forEach(function (tl) {
            if(serstr) {
                serstr += ", "; }
            serstr += tl.name; });
        jt.log("Timeline display series: " + serstr);
    }


    function timelineCompleted (tl) {
        var svsdone = true, prog = getTimelineProgressRecord(tl);
        prog.ttlpts = 0;
        prog.cmplpts = 0;
        tl.cids.csvarray().forEach(function (cid) {
            if(prog.pts.csvcontains(cid)) {
                prog.cmplpts += 1; }
            prog.ttlpts += 1; });
        if(prog.cmplpts === prog.ttlpts) {
            if(prog.svs) {
                tl.svs.csvarray().forEach(function (sv) {
                    if(prog.svs.indexOf(sv) < 0) {
                        svsdone = false; } }); }
            if(svsdone) {
                return true; } }
        dcon.tl = tl;
        dcon.prog = prog;
        return false;
    }


    function displayNextTimeline () {
        dcon.tl = null;
        dcon.prog = null;
        dcon.tlidx = 0;
        while(dcon.ds[dcon.tlidx].ctype.startsWith("Timelines") ||
              timelineCompleted(dcon.ds[dcon.tlidx])) {
            dcon.tlidx += 1; }
        if(dcon.tlidx < dcon.ds.length) {
            dcon.tl = dcon.ds[dcon.tlidx];
            prepData(); }
        app.linear.display();  //displays finale if dcon.tl is null
    }


    function nextUnvisitedPoint (numpoints) {
        var res = [];
        numpoints = numpoints || 1;
        if(!dcon.prog || !dcon.tl) {
            return jt.log("db.nextUnvisitedPoint called without tl or prog"); }
        dcon.tl.points.forEach(function (pt) {
            if(res.length < numpoints && dcon.prog.pts.indexOf(pt.ptid) < 0) {
                res.push(pt); } });
        if(!res.length) {
            return null; }
        if(numpoints === 1) {
            return res[0]; }
        return res;
    }


    function findPointById (ptid) {
        var points, i, pt;
        points = app.allpts || dcon.tl.points;
        for(i = 0; i < points.length; i += 1) {
            pt = points[i];
            if(pt.instid === ptid || pt.ptid === ptid) {
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
        var ptid = updpt.instid || updpt.ptid;
        if(app.allpts) {
            app.allpts.forEach(function (pt) {
                if(pt.instid === ptid) {
                    mergePointDataToPoint(pt, updpt); } }); }
        if(app.user.tls) {
            Object.keys(app.user.tls).forEach(function (tlid) {
                app.user.tls[tlid].points.forEach(function (pt) {
                    if(pt.instid === ptid || pt.ptid === ptid) {
                        mergePointDataToPoint(pt, updpt); } }); }); }
    }


    function fetchDisplayTimeline () {
        var slug = "demo",
            url = window.location.href,
            idx = url.indexOf("/timeline/")
        if(idx >= 0) {
            slug = url.slice(idx + "/timeline/".length); }
        jt.log("fetchDisplayTimeline: " + slug);
        jt.out("rhcontentdiv", "Loading " + slug + "...");
        app.user.tls = app.user.tls || {};
        //PENDING: Go with localStorage timeline if available, then redisplay
        //if db fetch shows anything has changed.
        jt.call("GET", "fetchtl?slug=" + slug, null,
                function (result) {  //one or more timeline objects
                    result.forEach(function (tl) {
                        app.db.deserialize("Timeline", tl); });
                    makeTimelineDisplaySeries(result);
                    displayNextTimeline();},
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
                                end.toISOString() + ";0") }
        svs.csvarray().forEach(function (sv) {
            if(upd) {
                upd += ","; }
            sv = sv.split(";");
            if(sv[0] === svid) {
                sv[3] = String(Number(sv[3]) + 1); }
            upd += sv.join(";"); })
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
            dbo.remtls = JSON.parse(dbo.remtls || "[]")
            dbo.completed = JSON.parse(dbo.completed || "[]")
            dbo.started = JSON.parse(dbo.started || "[]")
            dbo.built = JSON.parse(dbo.built || "[]")
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
        noteStartTime: function () { noteStartTime(); },
        wallClockTimeStamp: function (d) { return wallClockTimeStamp(d); },
        getElapsedTime: function (sd, ed) { return getElapsedTime(sd, ed); },
        getStateURLParams: function () { return getStateURLParams(); },
        saveState: function () { saveState(); },
        parseDate: function (pt) { parseDate(pt); },
        describeDateFormat: function () { return describeDateFormat(); },
        fetchDisplayTimeline: function () { fetchDisplayTimeline(); },
        serialize: function (dbc, dbo) { serialize(dbc, dbo); },
        deserialize: function (dbc, dbo) { deserialize(dbc, dbo); },
        postdata: function (dbc, dbo) { return postdata(dbc, dbo); },
        displayContext: function () { return dcon; },
        nextPoint: function (ptc) { return nextUnvisitedPoint(ptc); },
        svdone: function (svid, sta, end) { noteSuppvizDone(svid, sta, end) },
        displayNextTimeline: function () { displayNextTimeline(); },
        mergeProgToAccount: function () { mergeProgToAccount(); },
        pt4id: function (ptid) { return findPointById(ptid); },
        mergeUpdatedPointData: function (pt) { mergeUpdatedPointData(pt); }
    };
}());
