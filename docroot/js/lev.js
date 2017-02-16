/*jslint browser, multivar, white, fudge, for */
/*global app, window, jt, d3 */

app.lev = (function () {
    "use strict";

    //Each level ends with a supplemental visualization.  A level is
    //complete when its points are all visited and the sv is visited.
    var levels = [], timelines = {}, suppvs = {},
        ps = {avail: 0, visited: 0},
        pointsPerSave = 6;


    function initStructures () {
        app.data.timelines.forEach(function (tl) {
            tl.pttl = 0;
            timelines[tl.code] = tl; });
        app.data.suppvis.forEach(function (sv, idx) {
            sv.pts = [];
            suppvs[sv.code] = sv;
            levels.push({levnum: idx + 1, pa: 0, pv: 0, sv: sv}); });
        app.data.pts.forEach(function (pt) {
            var i, code;
            if(pt.sv) {
                if(pt.visited) {
                    suppvs[pt.sv].visited = true; }
                suppvs[pt.sv].pts.push(pt); }
            else {  //not a supplemental visualization point
                if(pt.visited) {
                    ps.visited += 1; }
                else {
                    ps.avail += 1; } }
            for(i = 0; i < pt.code.length; i += 1) {
                code = pt.code.charAt(i);
                timelines[code].pttl += 1; } });
    }


    function pointsForLevel (cc, lev, pttl) {
        lev.pttl = pttl;
        if(cc.dv) {
            if(cc.dv >= lev.pttl) {  //all points level are visited
                lev.pv = lev.pttl;
                cc.dv -= lev.pttl; }
            else {                   //some points visited but not all
                lev.pv = cc.dv;
                cc.dv = 0; } }
        if(lev.pv < lev.pttl) { //not all points were visited
            lev.pa = lev.pttl - lev.pv;
            cc.da -= lev.pa; }
    }


    function distributePoints () {
        var cc = {la: 0,            //levels available for distribution
                  da: ps.avail,     //available points left to distribute
                  dv: ps.visited};  //visited points left to distribute
        levels.forEach(function (lev) {
            if(lev.sv.passes) {
                pointsForLevel(cc, lev, lev.sv.passes * pointsPerSave); }
            else {
                cc.la += 1; } });
        cc.tp = cc.da + cc.dv;              //total points to distribute
        cc.lb = Math.floor(cc.tp / cc.la);  //points per level (base)
        cc.lr = cc.tp % cc.la;              //points per level (remainder)
        levels.forEach(function (lev, idx) {
            if(!lev.sv.passes) {
                lev.pttl = cc.lb;
                if(idx === levels.length - 1) {
                    lev.pttl += cc.lr; }    //add leftover points to last level
                pointsForLevel(cc, lev, lev.pttl); } });
    }


    function logLevels () {
        jt.log("Total " + (ps.avail + ps.visited) + ", avail: " + ps.avail + 
               ", visited: " + ps.visited);
        levels.forEach(function (lev, idx) {
            jt.log("level " + idx + " ttl: " + lev.pttl + ", ava: " + lev.pa +
                   ", vis: " + lev.pv + ", sv: " + (lev.sv.visited || false));
        });
    }


    function init () {
        initStructures();
        distributePoints();
        logLevels();
    }


    function getCurrentLevel () {
        var currlev = null;
        levels.forEach(function (lev) {
            if(!currlev) {
                if(lev.pa) {
                    currlev = lev; }
                else if(!lev.sv.visited) {
                    currlev = lev; } } });
        return currlev;
    }


    function distributeAvailPointsByTL () {
        var ttlavail = 0;
        app.data.timelines.forEach(function (tl) {
            tl.visited = 0;
            tl.pts = []; });
        app.data.pts.forEach(function (pt) {
            if(!pt.sv && !pt.visited) {
                ttlavail += 1; }
            app.data.timelines.forEach(function (tl) {
                if(!pt.sv && pt.code.indexOf(tl.code) >= 0) {
                    if(pt.visited) {
                        tl.visited += 1; }
                    else {
                        tl.pts.push(pt); } } }); });
        app.data.timelines.forEach(function (tl) {
            tl.pcntcomp = 1;
            if(tl.pts.length) {
                tl.pcntcomp = tl.visited / tl.pts.length; } });
        return ttlavail;
    }


    //Given there are points available for display, and given that the
    //available points for display have been distributed across the
    //timelines already with percentage complete calculated, choose the next
    //timeline to select points from.
    function selectNextTimeline (code) {
        var tls = [];
        //if there is a preferred timeline specified by code, and there
        //are points available in that timeline, return it.
        if(code && timelines[code].pts.length) {
            return timelines[code]; }
        //Select from real timelines that still have points available
        //for display.
        app.data.timelines.forEach(function (tl) {
            if(tl.code !== "U" && tl.code !== "D" && tl.pts.length) {
                tls.push(tl); } });
        //Choose by oldest unvisited timeline point to avoid leaping around
        //in time. If same, go with whichever timeline has more points left.
        tls.sort(function (a, b) {
            if(a.pts[0].tc < b.pts[0].tc) { return -1; }
            if(a.pts[0].tc > b.pts[0].tc) { return 1; }
            return a.pcntcomp - b.pcntcomp; });
        return tls[0];
    }


    function selectPoints (pts, method) {
        var sel = [], idx;
        while(pts.length && sel.length < pointsPerSave) {
            if(method === "random") {
                idx = Math.floor(Math.random() * pts.length); }
            else {  //sequential
                idx = 0; }
            sel.push(pts[idx]);
            pts.splice(idx, 1); }
        //sort in reverse order so points pop off in chrono order
        sel.sort(function (a, b) { return b.tc - a.tc; });
        return sel;
    }


    //Return an array of points that have not been visited yet.  For
    //presentation consistency, the returned points are all from the
    //same timeline.  The number of points returned might be less than
    //pointsPerSave if the level is nearly finished or if the chosen
    //timeline is nearly finished.
    function getNextPoints () {
        var currlev, tl, pts;
        currlev = getCurrentLevel();
        if(!currlev) {     //no more points to display, done.
            return []; }
        currlev.pa = Math.min(currlev.pa, distributeAvailPointsByTL());
        if(currlev.pa > 0) {
            tl = selectNextTimeline(currlev.sv.pc);
            pts = selectPoints(tl.pts, currlev.sv.select);
            jt.log("Selected " + pts.length + " points from " + tl.ident + 
                   " out of " + currlev.pa + " left available");
            return pts; }
        jt.log("Selected supp vis points for " + currlev.sv.name);
        return currlev.sv.pts;  //only the final supp vis left
    }


    function updateVisited (pts) {
        var currlev = getCurrentLevel();
        if(pts) {
            if(!pts[0].sv) {  //regular progress update
                currlev.pa -= pts.length;
                currlev.pv += pts.length;
                ps.avail -= pts.length;
                ps.visited += pts.length; }
            else {
                //the supplemental visualization takes care of marking
                //all of its covered points as visited 
                currlev.sv.visited = true; } }
    }


    function progInfo () {
        var currlev = getCurrentLevel();
        return {level: currlev.levnum, numlevels: levels.length, 
                levpcnt: currlev.pv / currlev.pttl,
                mainpcnt: ps.visited / (ps.avail + ps.visited)};
    }


    return {
        init: function () { init(); },
        getNextPoints: function () { return getNextPoints(); },
        updateVisited: function (pts) { return updateVisited(pts); },
        progInfo: function () { return progInfo(); },
        suppVisByCode: function (code) { return suppvs[code]; }
    };
}());
