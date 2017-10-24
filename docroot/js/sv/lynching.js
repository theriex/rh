/*jslint browser, multivar, white, fudge, this */
/*global app, window, jt, d3 */

app.lynching = (function () {
    "use strict";

    var sv = null,
        tl = null,
        endf = null,
        chart = {colors:{bg: "#fef6d7", 
                         map:{neutral:"#fadb66",
                              hover:"#d3aaaa"}},
                 //Map SVG and related values
                 ms: {w:0, h:0, tm:20}, //top margin space
                 //Bar chart SVG and related values
                 bs: {w:0, h:0, bi:{}, tmax:0, clkto:null}},
        ani = {},
        //See http://www.chesnuttarchive.org/classroom/lynchingstat.html
        //in particular the notes about totals and "Whites".
        ldty = [["year", "other", "black", "total"],
                [1882, 64, 49, 113],
                [1883, 77, 53, 130],
                [1884, 160, 51, 211],
                [1885, 110, 74, 184],
                [1886, 64, 74, 138],
                [1887, 50, 70, 120],
                [1888, 68, 69, 137],
                [1889, 76, 94, 170],
                [1890, 11, 85, 96],
                [1891, 71, 113, 184],
                [1892, 69, 161, 230],
                [1893, 34, 118, 152],
                [1894, 58, 134, 192],
                [1895, 66, 113, 179],
                [1896, 45, 78, 123],
                [1897, 35, 123, 158],
                [1898, 19, 101, 120],
                [1899, 21, 85, 106],
                [1900, 9, 106, 115],
                [1901, 25, 105, 130],
                [1902, 7, 85, 92],
                [1903, 15, 84, 99],
                [1904, 7, 76, 83],
                [1905, 5, 57, 62],
                [1906, 3, 62, 65],
                [1907, 3, 58, 61],
                [1908, 8, 89, 97],
                [1909, 13, 69, 82],
                [1910, 9, 67, 76],
                [1911, 7, 60, 67],
                [1912, 2, 62, 64],
                [1913, 1, 51, 52],
                [1914, 4, 51, 55],
                [1915, 13, 56, 69],
                [1916, 4, 50, 54],
                [1917, 2, 36, 38],
                [1918, 4, 60, 64],
                [1919, 7, 76, 83],
                [1920, 8, 53, 61],
                [1921, 5, 59, 64],
                [1922, 6, 51, 57],
                [1923, 4, 29, 33],
                [1924, 0, 16, 16],
                [1925, 0, 17, 17],
                [1926, 7, 23, 30],
                [1927, 0, 16, 16],
                [1928, 1, 10, 11],
                [1929, 3, 7, 10],
                [1930, 1, 20, 21],
                [1931, 1, 12, 13],
                [1932, 2, 6, 8],
                [1933, 2, 24, 28],
                [1934, 0, 15, 15],
                [1935, 2, 18, 20],
                [1936, 0, 8, 8],
                [1937, 0, 8, 8],
                [1938, 0, 6, 6],
                [1939, 1, 2, 3],
                [1940, 1, 4, 5],
                [1941, 0, 4, 4],
                [1942, 0, 6, 6],
                [1943, 0, 3, 3],
                [1944, 0, 2, 2],
                [1945, 0, 1, 1],
                [1946, 0, 6, 6],
                [1947, 0, 1, 1],
                [1948, 1, 1, 2],
                [1949, 0, 3, 3],
                [1950, 1, 1, 2],
                [1951, 0, 1, 1],
                [1952, 0, 0, 0],
                [1953, 0, 0, 0],
                [1954, 0, 0, 0],
                [1955, 0, 3, 3],
                [1956, 0, 0, 0],
                [1957, 1, 0, 1],
                [1958, 0, 0, 0],
                [1959, 0, 1, 1],
                [1960, 0, 0, 0],
                [1961, 0, 1, 1],
                [1962, 0, 0, 0],
                [1963, 0, 1, 1],
                [1964, 2, 1, 3],
                [1965, 0, 0, 0],
                [1966, 0, 0, 0],
                [1967, 0, 0, 0],
                [1968, 0, 0, 0]],
        ldts = [["state", "other", "black", "total"],
                ["Alabama", 48, 299, 347],
                ["Arizona", 31, 0, 31],
                ["Arkansas", 58, 226, 284],
                ["California", 41, 2, 43],
                ["Colorado", 65, 3, 68],
                ["Delaware", 0, 1, 1],
                ["Florida", 25, 257, 282],
                ["Georgia", 39, 492, 531],
                ["Idaho", 20, 0, 20],
                ["Illinois", 15, 19, 34],
                ["Indiana", 33, 14, 47],
                ["Iowa", 17, 2, 19],
                ["Kansas", 35, 19, 54],
                ["Kentucky", 63, 142, 205],
                ["Louisiana", 56, 335, 391],
                ["Maine", 1, 0, 1],
                ["Maryland", 2, 27, 29],
                ["Michigan", 7, 1, 8],
                ["Minnesota", 5, 4, 9],
                ["Mississippi", 42, 539, 581],
                ["Missouri", 53, 69, 122],
                ["Montana", 82, 2, 84],
                ["Nebraska", 52, 5, 57],
                ["Nevada", 6, 0, 6],
                ["New Jersey", 1, 1, 2],
                ["New Mexico", 33, 3, 36],
                ["New York", 1, 1, 2],
                ["North Carolina", 15, 86, 101],
                ["North Dakota", 13, 3, 16],
                ["Ohio", 10, 16, 26],
                ["Oklahoma", 82, 40, 122],
                ["Oregon", 20, 1, 21],
                ["Pennsylvania", 2, 6, 8],
                ["South Carolina", 4, 156, 160],
                ["South Dakota", 27, 0, 27],
                ["Tennessee", 47, 204, 251],
                ["Texas", 141, 352, 493],
                ["Utah", 6, 2, 8],
                ["Vermont", 1, 0, 1],
                ["Virginia", 17, 83, 100],
                ["Washington", 25, 1, 26],
                ["West Virginia", 20, 28, 48],
                ["Wisconsin", 6, 0, 6],
                ["Wyoming", 30, 5, 35]];


    function centerPoint (path) {
        var ptd = {xttl:0, xcount:0, yttl:0, ycount:0};
        path = path.toLowerCase();
        path = path.replace(/m/g, "");
        path = path.replace(/l/g, "");
        path = path.replace(/z/g, "");
        //console.log("centerPoint: " + path);
        path.split(" ").forEach(function (pt) {
            //console.log("centerPoint: " + pt);
            if(pt.startsWith("v")) {  //vertical line
                ptd.yttl += +(pt.slice(1));
                ptd.ycount += 1; }
            else if(pt.startsWith("h")) {  //horizontal line
                ptd.xttl += +(pt.slice(1));
                ptd.xcount += 1; }
            else { //x,y coordinate
                pt = pt.split(",");
                ptd.xttl += +(pt[0].trim());
                ptd.xcount += 1; 
                ptd.yttl = +(pt[1].trim());
                ptd.ycount += 1; } });
        return {x:Math.round(ptd.xttl / ptd.xcount),
                y:Math.round(ptd.yttl / ptd.ycount)};
    }


    function makeYearDataObject (ldtr) {
        var obj = {};
        ldty[0].forEach(function (key, idx) {
            obj[key] = ldtr[idx]; });
        return obj;
    }


    function groupDataYears (dat, gc, limit) {
        var grps = [], i, cgc = gc, cs = null, rem;
        limit = limit || dat.length;
        rem = dat.length - limit;
        for(i = dat.length - 1; i >= 0 && limit > 0; i -= 1) {
            if(!cs) {  //use current year data as grouping accumulator
                cgc = gc;
                cs = dat[i];
                cs.year = String(cs.year).slice(-2); }
            else {  //add current year data to accumulator
                ldty[0].forEach(function (key, idx) {
                    if(idx) {  //skip year field
                        cs[key] += dat[i][key]; } }); }
            limit -= 1;
            cgc -= 1;
            if(cgc <= 0 || limit <= 0 || i === 0) {
                chart.bs.tmax = Math.max(chart.bs.tmax, cs.total);
                cs.year = String(dat[i].year).slice(0,4) + "-" + cs.year;
                grps.unshift(cs);
                cs = null; } }
        if(rem) {
            grps = dat.slice(0, rem).concat(grps); }
        return grps;
    }


    function initData () {
        var ttl = 0;
        //initialize bar chart data series
        chart.dat = [];
        ldty.forEach(function (yrd, idx) {
            var obj;
            if(idx) {  //skip first line with key values
                obj = makeYearDataObject(yrd);
                chart.bs.tmax = Math.max(chart.bs.tmax, obj.total);
                chart.dat.push(obj); } });
        chart.dat = groupDataYears(chart.dat, 5, 30);
        chart.dat = groupDataYears(chart.dat, 5);
        //initialize percentages and center points for states
        chart.pct = {};
        ldts.forEach(function (st, idx) {
            if(idx) {
                ttl += st[3]; } });
        ldts.forEach(function (st, idx) {
            if(idx) {
                chart.pct[st[0]] = {pct:st[3] / ttl}; } });
        app.svcommon.usmap().forEach(function (state) {
            if(chart.pct[state.name]) {
                chart.pct[state.name].id = state.id;
                chart.pct[state.name].center = centerPoint(state.d); } });
    }


    function usmapTAC () {
        var html = [];
        app.svcommon.usmap().forEach(function (state) {
            html.push(["path", {id:state.id, d:state.d,
                                fill:chart.colors.map.neutral}]) });
        html = ["svg", {id:"mapsvg", width:chart.ms.w, height:chart.ms.h,
                        viewBox:"0 0 959 593", preserveAspectRatio:"none"},
                ["g", {id:"outlines"},
                 html]];
        return html;
    }


    function barTAC () {
        var html, bi = chart.bs.bi;
        bi.margin = {top:50, right:20, bottom:30, left:60};
        bi.w = chart.bs.w - bi.margin.right - bi.margin.left;
        bi.h = chart.bs.h - bi.margin.top - bi.margin.bottom;
        bi.sx = d3.scaleBand()
            .rangeRound([0, bi.w]).padding(0.1)
            .domain(chart.dat.map(function (d) { return d.year; }));
        bi.sy = d3.scaleLinear()
            .rangeRound([bi.h, 0])
            .domain([chart.bs.tmax, 0]);
        html = ["svg", {id:"barsvg", width:chart.bs.w, height:chart.bs.h}];
        return html;
    }


    function hideSelectionBars () {
        chart.dat.forEach(function (ignore, idx) {
            d3.select("#bar" + idx + "column").style("opacity", 0.0); });
    }


    function mouseover () {
        var rid = this.id;
        d3.select("#" + rid).style("opacity", 0.4);
    }


    function rectclick (rid) {
        var selidx;
        if(chart.bs.clkto) {
            clearTimeout(chart.bs.clkto);
            chart.bs.clkto = null; }
        rid = rid || this.id;
        selidx = +(rid.match(/bar(\d+)column/)[1]);
        console.log("rectclick selidx: " + selidx);
        chart.dat.forEach(function (bd, idx) {
            var opa = 0.0;
            if(idx < selidx) {
                opa = 0.35; }
            else if(idx === selidx) {
                opa = 1.0; }
            d3.select("#bar" + idx + "other")
                .transition().duration(1000).style("opacity", opa);
            d3.select("#bar" + idx + "black")
                .transition().duration(1000).style("opacity", opa);
            d3.select("#bar" + idx + "column")
                .transition().duration(1000).style("opacity", 0.0); });
        selidx += 1;
        if(selidx <= chart.dat.length) {
            chart.bs.clkto = setTimeout(function () { 
                rectclick("bar" + selidx + "column"); },
                                        2500); }
    }


    function barInit () {
        var svg = d3.select("#barsvg"), bi = chart.bs.bi;
        chart.bs.transg = svg.append("g").attr("id", "lytransg")
            .attr("transform", "translate(" + bi.margin.left + "," +
                                              bi.margin.top + ")");
        chart.bs.transg.append("g").attr("id", "xaxisg")
            .attr("class", "xaxis")
            .call(d3.axisTop(bi.sx))
            .selectAll("text")
            .style("text-anchor", "start")
            .attr("dx", "0.55em")
            .attr("dy", "1.1em")
            .attr("transform", function(d) {
                return "rotate(-65)" });
        chart.bs.transg.append("g").attr("id", "yaxisg")
            .attr("class", "yaxis")
            .call(d3.axisLeft(bi.sy).ticks(10));
        chart.dat.forEach(function (bd, idx) {
            chart.bs.transg.append("rect")
                .attr("id", "bar" + idx + "other")
                .style("fill", "red")
                .style("opacity", 0.0)
                .attr("x", chart.bs.bi.sx(bd.year))
                .attr("y", 0)
                .attr("width", chart.bs.bi.sx.bandwidth())
                .attr("height", chart.bs.bi.sy(bd.other));
            chart.bs.transg.append("rect")
                .attr("id", "bar" + idx + "black")
                .style("fill", "brown")
                .style("opacity", 0.0)
                .attr("x", chart.bs.bi.sx(bd.year))
                .attr("y", chart.bs.bi.sy(bd.other))
                .attr("width", chart.bs.bi.sx.bandwidth())
                .attr("height", chart.bs.bi.sy(bd.black));
            chart.bs.transg.append("rect")
                .attr("id", "bar" + idx + "column")
                .style("fill", "#666")
                .style("opacity", 0.0)
                .attr("x", chart.bs.bi.sx(bd.year))
                .attr("y", 0)
                .attr("width", chart.bs.bi.sx.bandwidth())
                .attr("height", chart.bs.bi.sy(chart.bs.tmax))
                .on("mouseover", mouseover)
                .on("mouseout", hideSelectionBars)
                .on("click", rectclick);
        });
    }


    function displayTitle () {
        var mid, tg, delay = 3500, duration = 2000;
        mid = {x: Math.round(0.5 * 959),   //calculate from viewbox
               y: Math.round(0.35 * 593)};
        tg = d3.select("#mapsvg").append("g").attr("opacity", 1.0);
        tg.append("text")
            .attr("text-anchor", "middle")
            .attr("x", mid.x)
            .attr("y", mid.y)
            .attr("font-size", 78)
            .attr("font-weight", "bold")
            .text("Lynching");
        tg.transition().delay(delay).duration(duration)
            .attr("opacity", 0.0)
            .remove();
        setTimeout(function () { rectclick("bar0column"); },
                   delay + duration - 500);
    }


    function initDisplayElements () {
        var mid;
        chart.ms.w = tl.width2;
        chart.ms.h = Math.min(tl.height, tl.width2) - chart.ms.tm;
        chart.bs.w = tl.width2;
        chart.bs.h = chart.ms.h + chart.ms.tm;
        jt.out("suppvisdiv", jt.tac2html(
            [["div", {id:"mapdiv"}, usmapTAC()],
             ["div", {id:"bardiv"}, barTAC()],
             ["div", {id:"lytdiv"}]]));
        barInit();
        displayTitle();
        mid = {x: Math.round(tl.width2 / 2) + tl.margin.left,
               y: Math.round(tl.height / 2) + tl.margin.top};
        d3.select("#suppvisdiv")
            .style("left", mid.x - 15 + "px")
            .style("top", mid.y - 15 + "px")
            .style("width", 30 + "px")
            .style("height", 30 + "px")
            .style("background", chart.colors.bg)
            .style("visibility", "visible")
            .transition().duration(2000)
            .style("left", tl.margin.left + "px")
            .style("top", tl.margin.top + "px")
            .style("width", tl.width2 + "px")
            .style("height", tl.height + "px");
    }


    function initAnimationSequence () {
        //???
    }


    function display (suppvis, timeline, endfunc) {
        sv = suppvis || app.lev.suppVisByCode("sl");
        tl = timeline || app.linear.tldata();
        endf = endfunc || app.dlg.close;
        sv.startDate = new Date();
        initData();
        initDisplayElements();
        initAnimationSequence();
    }


    function finish () {
        var date, nowiso;
        if(!ani.finished) {
            ani.finished = true;
            date = new Date();
            sv.startstamp = app.db.wallClockTimeStamp(sv.startDate);
            sv.duration = app.db.getElapsedTime(date, sv.startDate);
            nowiso = date.toISOString();
            sv.pts.forEach(function (pt) {
                pt.visited = nowiso; });
            sv.visited = nowiso;
            d3.select("#suppvisdiv")
                .style("visibility", "hidden");
            endf(); }
    }


    return {
        //TODO: need to init data points for each year so they show up in
        //the main display at start.
        display: function (sv, tl, endf) { display(sv, tl, endf); },
        yrsel: function (year) { displayYear(year); },
        transport: function (command) { transport(command); },
        selcid: function (cid) { displayPointById(cid); },
        selyear: function (year) { displayPointByYear(year); },
        stclick: function (stid) { stateClick(stid); },
        stunclick: function (stid) { stateUnclick(stid); },
        stmouseover: function (stid) { stateMouseOver(stid); },
        stmouseout: function (stid) { stateMouseOut(stid); },
        finish: function () { finish(); }
    };
}());

