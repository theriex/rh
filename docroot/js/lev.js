/*jslint browser, multivar, white, fudge */
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
        app.data.suppvis.forEach(function (sv) {
            sv.pts = [];
            suppvs[sv.code] = sv;
            levels.push({pa: 0, pv: 0, sv: sv}); });
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
        logLevels();
    }


    return {
        init: function () { init(); }
    };
}());
