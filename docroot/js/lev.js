/*jslint browser, multivar, white, fudge, for */
/*global app, window, jt, d3 */

app.lev = (function () {
    "use strict";

    //Each level ends with a supplemental visualization.  A level is
    //complete when its points are all visited and the sv is visited.
    var levels = [], timelines = {}, suppvs = {},
        ps = {avail: 0, visited: 0};


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


    function distributePoints () {
        var tl, tp, lb, lr, da, dv;
        tl = levels.length;         //total number of levels
        tp = ps.avail + ps.visited; //total points to distribute
        lb = Math.floor(tp / tl);   //base number of points per level
        lr = tp % tl;               //leftover points for last level
        da = ps.avail;              //available points left to distribute
        dv = ps.visited;            //visited points left to distribute
        levels.forEach(function (lev, idx) {
            lev.pttl = lb;
            if(idx === levels.length - 1) {
                lev.pttl += lr; }   //add leftover points to last level
            if(dv) {
                if(dv >= lev.pttl) {
                    lev.pv = lev.pttl;
                    dv -= lev.pttl; }
                else {
                    lev.pv = dv;
                    dv = 0; } }
            if(lev.pv < lev.pttl) {
                lev.pa = lev.pttl - lev.pv;
                da -= lev.pa; } });
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
        //logLevels();
    }


    //If no points have been displayed yet, return several not
    //generally known points across all timelines.  This is just an
    //intro to draw people in with kind of a trivial persuit feel and
    //hopefully evoke that learning could be fun(ish).  After the
    //first intro, all timelines that have points not yet visited are
    //eligible.
    function getEligibleTimelines () {
        var tls = [], elig = [];
        app.data.timelines.forEach(function (tl) {
            if(!ps.visited) {
                if(tl.code === "U") {
                    tls.push(tl); } }
            else { //not intro pass
                if(tl.code !== "U" && tl.code !== "D") {
                    tls.push(tl); } } });
        tls.forEach(function (tl) {
            tl.visited = 0;
            tl.pts = []; });
        app.data.pts.forEach(function (pt) {
            tls.forEach(function (tl) {
                if(!pt.sv && pt.code.indexOf(tl.code) >= 0) {
                    if(pt.visited) {
                        tl.visited += 1; }
                    else {
                        tl.pts.push(pt); } } }); });
        tls.forEach(function (tl) {
            if(tl.pts.length) {
                tl.pcntcomp = tl.visited / tl.pts.length;
                elig.push(tl); } });
        return elig;
    }


    //The next timeline to use as a point source is selected priority
    //round robin based on the least percentage complete.  That way no
    //timeline starves and they all get exhausted at a similar rate.
    function selectNextTimeline (tls) {
        tls.sort(function (a, b) { return a.pcntcomp - b.pcntcomp; });
        return tls[0];
    }


    function selectRandom (pts, ttl) {
        var sel = [], idx;
        while(pts.length && sel.length <= ttl) {
            idx = Math.floor(Math.random() * pts.length);
            sel.push(pts[idx]);
            pts.splice(idx, 1); }
        return sel;
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


    //Return an array of points that have not been visited yet.  For
    //presentation consistency, the returned points are all from the
    //same timeline.  The number of points returned is a based on how
    //many points people can remember at a time, that way it feels
    //like a comprehensible chunk.
    function getNextPoints () {
        var currlev, tls, tl, pts, slen = 6;
        currlev = getCurrentLevel();
        if(!currlev) {     //no more points to display, done.
            return []; }
        if(currlev.pa) {   //have regular points to choose from
            slen = Math.min(slen, currlev.pa);
            tls = getEligibleTimelines();
            tl = selectNextTimeline(tls);
            pts = selectRandom(tl.pts, slen);
            //newest first so you can pop points off the array in chrono order
            pts.sort(function (a, b) { return b.tc - a.tc; });
            return pts; }
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
        return {level: currlev.levnum,
                levpcnt: currlev.pv / currlev.pttl,
                mainpcnt: ps.visited / (ps.avail + ps.visited)};
    }


    return {
        init: function () { init(); },
        getNextPoints: function () { return getNextPoints(); },
        updateVisited: function (pts) { return updateVisited(pts); },
        progInfo: function () { return progInfo(); }
    };
}());
