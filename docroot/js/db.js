/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.db = (function () {
    "use strict";

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


    function loadSavedState () {
        var visited;
        visited = jt.parseParams();
        app.data.pts.forEach(function (pt) {
            pt.visited = jt.toru(visited[pt.id]); });
        //local storage is probably more recent, so it takes precedence
        visited = window.localStorage.getItem("visited");
        if(visited) {
            try {
                visited = JSON.parse(visited);
                app.data.pts.forEach(function (pt) {
                    pt.visited = jt.toru(visited[pt.id]) || pt.visited; });
            } catch(exception) {
                jt.err("loadSavedState failed: " + exception);
            } }
        app.oldestVisit = (new Date()).toISOString();
        app.data.pts.forEach(function (pt) {
            if(pt.visited && pt.visited < app.oldestVisit) {
                app.oldestVisit = pt.visited; } });
    }


    function describeData () {
        jt.log("Timeline codes and names");
        app.data.timelines.forEach(function (tl) {
            jt.log("  " + tl.code + ": " + tl.name + 
                        " (" + tl.ident + ")"); });
        //an sv datum will have an sv field set to the sv code.
        // jt.log("Supplemental Visualizations");
        // app.data.suppvis.forEach(function (sv) {
        //     jt.log("  " + sv.code + ": " + sv.name); });
    }


    //Each data point has the following fields:
    //  code: One or more timeline letter codes this point is associated with
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
        jt.out(app.dispdivid, "Preparing data...");
        app.data.pts.forEach(function (pt) {
            if(!pt.cid) {
                throw "Missing cid " + pt.date + " " + pt.text; }
            if(cs[pt.cid]) {
                throw "Duplicate cid: " + pt.cid; }
            if(pt.code.indexOf("U") >= 0 && pt.code.indexOf("D") >= 0) {
                throw "Either 'U' or 'D' (no save on intro) cid: " + pt.cid; }
            cs[pt.cid] = pt;
            parseDate(pt);
            makeCoordinates(pt, ctx);
            makePointIdent(pt, ny); });
        app.data.maxy = ctx.maxy;
        ctx = {yr: 0, grp: null};
        app.data.pts.forEach(function (pt) {
            centerYCoordinates(pt, ctx); });
        loadSavedState();
        //describeData();
    }


    function saveState () {
        var visited = {};
        app.data.pts.forEach(function (pt) {
            if(pt.visited) {
                visited[pt.id] = pt.visited; } });
        visited = JSON.stringify(visited);
        window.localStorage.setItem("visited", visited);
    }


    return {
        prepData: function () { prepData(); },
        saveState: function () { saveState(); }
    };
}());
