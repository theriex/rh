/*jslint browser, multivar, white, fudge, for */
/*global app, window, jt, d3 */

app.lev = (function () {
    "use strict";

    //Each level ends with a supplemental visualization.  A level is
    //complete when its points are all visited and the sv is visited.
    var levels = [], ptcs = {}, suppvs = {},
        ps = {avail:0, visited:0, supp:0},
        currlev = null, rdist = null;


    function initStructures () {
        app.data.ptcs.forEach(function (tl) {
            tl.pttl = 0;
            ptcs[tl.code] = tl; });
        app.data.suppvis.forEach(function (sv, idx) {
            sv.pts = [];
            suppvs[sv.code] = sv;
            levels.push({levnum: idx + 1, pa: 0, pv: 0, sv: sv}); });
        app.data.pts.forEach(function (pt) {
            var i, code;
            if(pt.sv) {
                ps.supp += 1;
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
                ptcs[code].pttl += 1; } });
    }


    function pointsPerSave (level) {
        if(level && level.sv && level.sv.ppp) {
            return level.sv.ppp; }
        //By default, cover enough points to make it feel like you've done
        //some reading, but with a reasonable chance of remembering the
        //points you've covered (so definitely <= 7).
        return 6; 
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
            //intro level is 3 passes with 3 points per pass
            if(lev.sv.passes && lev.sv.ppp) {
                pointsForLevel(cc, lev, lev.sv.passes * lev.sv.ppp); }
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
        var tstat = {min:9999, max:0, sum:0, count:0, 
                     green:0, yellow:0, red:0, over:0};
        app.data.pts.forEach(function (pt) {
            if(pt.text.length < 400) {
                tstat.green += 1; }
            else if(pt.text.length < 600) {
                tstat.yellow += 1; }
            else if(pt.text.length < 1200) {
                tstat.red += 1; }
            else {
                jt.log("   OVER: " + pt.cid + " " + pt.text.slice(0,40)); }
            tstat.min = Math.min(tstat.min, pt.text.length);
            tstat.max = Math.max(tstat.max, pt.text.length);
            tstat.sum += pt.text.length;
            tstat.count += 1; });
        jt.log("Point text length min: " + tstat.min + ", max: " + tstat.max +
               ", avg: " + Math.round(tstat.sum / tstat.count) +
               ", green: " + tstat.green + ", yellow: " + tstat.yellow + 
               ", red: " + tstat.red);
        jt.log("Total interactive: " + (ps.avail + ps.visited) + 
               ", avail: " + ps.avail + ", visited: " + ps.visited + 
               ", additional suppviz points: " + ps.supp);
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


    function findCurrentLevel () {
        currlev = null;
        levels.forEach(function (lev) {
            if(!currlev) {
                if(lev.pa > 0) {
                    currlev = lev; }
                else if(!lev.sv.visited) {
                    currlev = lev; } } });
        return currlev;
    }


    function distributeAvailPointsByTL () {
        var ttlavail = 0;
        app.data.ptcs.forEach(function (tl) {
            tl.visited = 0;
            tl.pts = []; });
        app.data.pts.forEach(function (pt) {
            if(!pt.sv && !pt.visited) {
                ttlavail += 1; }
            app.data.ptcs.forEach(function (tl) {
                if(!pt.sv && pt.code.indexOf(tl.code) >= 0) {
                    if(pt.visited) {
                        tl.visited += 1; }
                    else {
                        tl.pts.push(pt); } } }); });
        app.data.ptcs.forEach(function (tl) {
            tl.pcntcomp = 1;
            if(tl.pts.length) {
                tl.pcntcomp = tl.visited / tl.pts.length; } });
        return ttlavail;
    }


    //Given there are points available for display, and given that the
    //available points for display have been distributed across the usrace
    //groups already with percentage complete calculated, choose the next
    //usrace group to select points from.
    function selectNextPointsGroup (code) {
        var tls = [];
        //if there is a preferred points group specified by code, and there
        //are points available in that group, return it.
        if(code && ptcs[code].pts.length) {
            return ptcs[code]; }
        //Select from non-marker groups that still have points available
        //for display.
        app.data.ptcs.forEach(function (tl) {
            if(tl.type !== "marker" && tl.pts.length) {
                tls.push(tl); } });
        //Choose by oldest unvisited grouping point to avoid leaping around
        //in time. If same, go with whichever group has more points left.
        tls.sort(function (a, b) {
            if(a.pts[0].tc < b.pts[0].tc) { return -1; }
            if(a.pts[0].tc > b.pts[0].tc) { return 1; }
            return a.pcntcomp - b.pcntcomp; });
        return tls[0];
    }


    function noteRandomlySelectedPoint (pt) {
        Object.keys(rdist).forEach(function (code) {
            if(pt.code.indexOf(code) >= 0) {
                rdist[code] += 1; } });
    }


    function findDistributedRandomPointIndex (pts) {
        var mino, idx;
        if(!rdist) {
            rdist = {};
            app.data.ptcs.forEach(function (tl) {
                if(tl.type !== "marker") {
                    rdist[tl.code] = 0; } }); }
        mino = {code:"x", count:9999999};
        Object.keys(rdist).forEach(function (code) {
            if(rdist[code] < mino.count) {
                mino.code = code;
                mino.count = rdist[code]; } });
        idx = Math.floor(Math.random() * pts.length);
        while(idx < pts.length && pts[idx].code.indexOf(mino.code) < 0) {
            idx += 1; }
        if(idx < pts.length) {  //found something
            noteRandomlySelectedPoint(pts[idx]);
            return idx; }       //done
        idx = 0;  //retry from beginning
        while(idx < pts.length && pts[idx].code.indexOf(mino.code) < 0) {
            idx += 1; }
        if(idx < pts.length) {  //found something
            noteRandomlySelectedPoint(pts[idx]);
            return idx; }       //done
        //give up and just return random
        idx = Math.floor(Math.random() * pts.length);
        return idx;
    }


    function selectPoints (pts, method, maxsel) {
        var sel = [], idx;
        while(pts.length && sel.length < maxsel) {
            if(method === "random") {
                idx = findDistributedRandomPointIndex(pts); }
            else {  //sequential
                idx = 0; }
            sel.push(pts[idx]);
            pts.splice(idx, 1); }
        //sort in reverse order so points pop off in chrono order
        sel.sort(function (a, b) { return b.tc - a.tc; });
        // if(method === "random") {
        //     jt.log("Random distribution:");
        //     Object.keys(rdist).forEach(function (code) {
        //         jt.log(code + ": " + rdist[code]); });
        //     sel.forEach(function (pt) {
        //         jt.log(pt.code + " " + pt.date + 
        //                " " + pt.text.slice(0,60)); }); }
        return sel;
    }


    //Return an array of points that have not been visited yet.  For
    //presentation consistency, the returned points are all from the same
    //usrace grouping.  The number of points returned might be less than
    //pointsPerSave if the level is nearly finished or if the chosen
    //grouping is nearly finished.
    function getNextPoints () {
        var tl, pts;
        findCurrentLevel();  //updated currlev
        if(!currlev) {     //no more points to display, done.
            return []; }
        currlev.pa = Math.min(currlev.pa, distributeAvailPointsByTL());
        if(currlev.pa > 0) {
            tl = selectNextPointsGroup(currlev.sv.pc);
            pts = selectPoints(tl.pts, currlev.sv.select,
                               Math.min(currlev.pa, pointsPerSave(currlev)));
            jt.log("Selected " + pts.length + " points from " + tl.ident + 
                   " out of " + currlev.pa + " left available");
            return pts; }
        //no points available left, return the final supp viz pts
        jt.log("Selected supp vis points for " + currlev.sv.name);
        return currlev.sv.pts;
    }


    function updateVisited (pts) {
        if(pts && !pts[0].sv) {  //the sv handles itself and all its points
            currlev.pa -= pts.length;
            currlev.pv += pts.length;
            ps.avail -= pts.length;
            ps.visited += pts.length; }
    }


    function progInfo () {
        return {level: currlev.levnum, numlevels: levels.length, 
                levpcnt: currlev.pv / currlev.pttl,
                mainpcnt: ps.visited / (ps.avail + ps.visited),
                levPtsAvail: currlev.pa, levPtsVis: currlev.pv,
                savelen: pointsPerSave(currlev), levels: levels};
    }


    return {
        init: function () { init(); },
        getNextPoints: function () { return getNextPoints(); },
        updateVisited: function (pts) { return updateVisited(pts); },
        progInfo: function () { return progInfo(); },
        suppVisByCode: function (code) { return suppvs[code]; }
    };
}());
