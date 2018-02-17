/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.db = (function () {
    "use strict";

    var maxcids = {}, pointcounts = {};

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


    //See the project readme for allowable date form specfications.
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
            var mx = app.data.maxy,
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


    function wallClockTimeStamp2Date (ts) {
        ts = ts || wallClockTimeStamp();
        ts = ts.slice(0, ts.indexOf("Z") + 1);
        return jt.isoString2Time(ts);
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


    function readStateURLParams (pstr) {
        var pobj = {}, preg = /(\d+)([A-Z]\d+)(r)?/, ptd = {}, idx, et;
        pstr = pstr || window.location.search;
        pobj = jt.paramsToObj(pstr, pobj, "String");  //userId too big for int
        Object.keys(pobj).forEach(function (key) {
            switch(key) {
            case "id": app.userId = pobj[key]; break;
            case "st": app.startTime = pobj[key]; break;
            default:
                try {
                    if(key.startsWith("pb")) {
                        pobj[key].split(":").forEach(function (ps) {
                            var pcs = preg.exec(ps);
                            ptd[pcs[2]] = {t:+pcs[1], r:pcs[3]}; }); }
                    else {  //treat as supplemental visualization
                        idx = pobj[key].lastIndexOf(":");
                        ptd[key] = {s:pobj[key].slice(0, idx),
                                    t:+pobj[key].slice(idx+1)}; }
                } catch (err) {
                    jt.log("readStateURLParams param error " + key + ": " + 
                           pobj[key] + " " + err);
                } } });
        //reconstruct visit time differences based on time per point
        et = wallClockTimeStamp2Date(app.startTime).getTime();
        app.data.pts.forEach(function (pt) {
            if(ptd[pt.cid]) {
                pt.visited = new Date(et).toISOString();
                pt.duration = ptd[pt.cid].t;
                et += pt.duration;
                pt.remembered = ptd[pt.cid].r; }
            else if(pt.sv && ptd[pt.sv]) {
                //using the same reconstructed visit time for chromacoding
                pt.visited = new Date(et).toISOString();
                pt.duration = ptd[pt.sv].t; } });
        app.data.suppvis.forEach(function (sv) {
            if(ptd[sv.code]) {
                idx = pobj[sv.code].lastIndexOf(":");
                sv.startstamp = pobj[sv.code].slice(0, idx);
                sv.duration = pobj[sv.code].slice(idx+1); } });
    }


    function loadSavedState () {
        var state = window.localStorage.getItem("savestatestr");
        if(state) {
            return readStateURLParams(state); }
        readStateURLParams();  //read from URL parameters
    }


    function describeData () {
        jt.log("Point racial codes and names");
        app.data.ptcs.forEach(function (tl) {
            if(tl.type !== "marker") {
                jt.log("  " + tl.code + ": " + pointcounts[tl.code] + " " + 
                       tl.name + " (" + tl.ident + ") maxcid: " + 
                       maxcids[tl.code]); } });
        //an sv datum will have an sv field set to the sv code.
        // jt.log("Supplemental Visualizations");
        // app.data.suppvis.forEach(function (sv) {
        //     jt.log("  " + sv.code + ": " + sv.name); });
    }


    function noteCitationIdMax (pt) {
        var i, code = pt.cid.charAt(0),
            count = +(pt.cid.slice(1));
        maxcids[code] = Math.max((maxcids[code] || 0), count);
        for(i = 0; i < pt.code.length; i += 1) {
            if(!pointcounts[pt.code.charAt(i)]) {
                pointcounts[pt.code.charAt(i)] = 1; }
            else {
                pointcounts[pt.code.charAt(i)] += 1; } }
    }


    //Each data point has the following fields:
    //  code: One or more code letter ids this point is associated with
    //  cid: Unique citation identifier
    //  date: Colloquial text for display date or date range
    //  text: Event description text
    //  start: {year: number, month?, day?}
    //  end?: {year: number, month?, day?}
    //  tc: time coordinate number (start year + percentage) * 100
    //  oc: offset coordinate number (one-based start year event count val)
    //  id: text years ago + sep + offset
    //  visited?: ISO date when last displayed
    function prepData () {
        var ctx = {yr: 0, dy: 0, maxy: 0},
            cs = {},
            ny = new Date().getFullYear();
        jt.out("rhcontentdiv", "Preparing data...");
        app.data.pts.forEach(function (pt, idx) {
            if(!pt.cid) {
                throw "Missing cid " + pt.date + " " + pt.text; }
            if(cs[pt.cid]) {
                throw "Duplicate cid: " + pt.cid; }
            if(pt.code.indexOf("U") >= 0 && pt.code.indexOf("D") >= 0) {
                throw "Either 'U' or 'D' (no save on intro) cid: " + pt.cid; }
            noteCitationIdMax(pt);
            cs[pt.cid] = pt;
            pt.currdataindex = idx;
            parseDate(pt);
            makeCoordinates(pt, ctx);
            makePointIdent(pt, ny); });
        app.data.maxy = ctx.maxy;
        ctx = {yr: 0, grp: null};
        app.data.pts.forEach(function (pt) {
            centerYCoordinates(pt, ctx); });
        loadSavedState();
        describeData();
    }


    function saveState () {
        var state = getStateURLParams();
        jt.log("db.saveState: " + state);
        window.localStorage.setItem("savestatestr", state);
    }


    return {
        noteStartTime: function () { noteStartTime(); },
        wallClockTimeStamp: function (d) { return wallClockTimeStamp(d); },
        getElapsedTime: function (sd, ed) { return getElapsedTime(sd, ed); },
        getStateURLParams: function () { return getStateURLParams(); },
        prepData: function () { prepData(); },
        saveState: function () { saveState(); }
    };
}());
