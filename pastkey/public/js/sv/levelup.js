/*jslint browser, white, fudge */
/*global app, window, jt, d3 */

//for stacked chart dev, modify db.nextInteraction to unconditionally return
//levelup, then comment out the call to displayPie.  Set chart.mouseovers.

app.levelup = (function () {
    "use strict";

    var tl = null;  //grab useful geometry from linear timeline display
    var levinf = null;
    var chart = {colors: {bg: "#fff5ce", bbg: "#fdd53a", bb: "#7d6a22"},
                 mouseovers:false,
                 exited:false};
    var sa = {};  //stacked area chart vars
    var pc = {};  //pie chart vars


    function initDisplayElements () {
        var lnh = 40;  //line height
        d3.select("#suppvisdiv")
            .style("left", tl.margin.left + "px")
            .style("top", tl.margin.top + "px")
            .style("width", "30px")
            .style("height", "30px")
            .style("background", chart.colors.bg)
            .style("visibility", "visible")
            .transition().duration(2000)
            .style("width", tl.width2 + "px")
            .style("height", tl.height + "px");
        jt.out("suppvisdiv", jt.tac2html(
            ["svg", {id: "svgin", width: tl.width2, height: tl.height}]));
        chart.vg = d3.select("#svgin").append("g");
        chart.tp = {xl:tl.margin.left + 10,
                    xc:Math.round(0.5 * tl.width2),
                    xr:tl.width2 - tl.margin.right,
                    h:lnh,  //line height
                    fs:20,  //font-size
                    yt:tl.margin.top + lnh,
                    ym:Math.round(0.5 * (tl.height + lnh)),
                    yb:tl.margin.top + tl.height - lnh};
    }


    function noteSummaryField (fieldname, accum) {
        sa.fldsum = sa.fldsum || {};
        sa.fldsum[fieldname] = sa.fldsum[fieldname] || {};
        sa.fldsum[fieldname].accum = accum;
    }


    function appendInteractionTime (fp, pt) {
        var fieldname = "interaction time";
        sa.progpts = app.db.displayContext().prog.pts;
        //if running levelup outside of the normal app flow, then progpts
        //may not have anything in it.  Don't add the field then.
        if(!sa.progpts) {
            return; }
        var val = 0;
        var idx = sa.progpts.indexOf(pt.dsId);
        if(idx >= 0) {
            val = sa.progpts.slice(idx);
            val = val.split(";");
            val = {start:jt.isoString2Time(val[1]).getTime(),
                   end:jt.isoString2Time(val[2]).getTime()};
            val = val.end - val.start; }
        noteSummaryField(fieldname, "scalar");
        fp[fieldname] = val;
    }


    function flattenDifferenceFields () {
        sa.pts = [];  //init holder for unpacked point field data
        levinf.lev.points.forEach(function (pt) {
            var fp = {tc:pt.tc};  //flattened point with just attr vals
            Object.keys(app.qts).forEach(function (key) {
                var fieldname = app.qts[key];
                noteSummaryField(fieldname, "binary");
                fp[fieldname] = 0;
                if(pt.qtype === key) {
                    fp[fieldname] = 1; } });
            //If the point has the same value in two different CSV fields,
            //then only the last one is getting counted.  That's ok.
            app.keyflds.forEach(function (key) {
                pt[key] = pt[key] || "";
                pt[key].csvarray().forEach(function (val) {
                    var fieldname = val;
                    noteSummaryField(fieldname, "binary");
                    fp[fieldname] = 1; }); });
            app.pqls.forEach(function (field) {
                var fieldname = field;
                noteSummaryField(fieldname, "scalar");
                fp[fieldname] = pt[fieldname] || "";
                fp[fieldname] = fp[fieldname].length; });
            appendInteractionTime(fp, pt);
            sa.pts.push(fp); });
        // jt.log("flattenDifferenceFields --------------------");
        // jt.log(JSON.stringify(sa.pts));
        // jt.log(JSON.stringify(sa.fldsum));
        // jt.log("--------------------");
    }


    function normalizeAndSummarizePoints () {
        Object.keys(sa.fldsum).forEach(function (key) {
            var sum = sa.fldsum[key];
            if(sum.accum === "binary") {
                sum.present = 0;
                sum.missing = 0; }
            else if(sum.accum === "scalar") {
                sum.max = 0;
                sum.min = 0; } });
        sa.pts.forEach(function (fp) {
            Object.keys(sa.fldsum).forEach(function (key) {
                fp[key] = fp[key] || 0;
                var sum = sa.fldsum[key];
                if(sum.accum === "binary") {
                    if(fp[key]) {
                        sum.present += 1; }
                    else {
                        sum.missing += 1; } }
                else if(sum.accum === "scalar") {
                    sum.max = Math.max(sum.max, fp[key]);
                    sum.min = Math.min(sum.min, fp[key]); } }); });
        // jt.log("normalizeAndSummarizePoints  --------------------");
        // jt.log(JSON.stringify(sa.pts))
        // jt.log(JSON.stringify(sa.fldsum))
        // jt.log("--------------------");
    }


    function findHighDifferenceFields () {
        flattenDifferenceFields();  //inits sa.pts and sa.fldsum
        normalizeAndSummarizePoints();
        var hdfs = [];
        Object.keys(sa.fldsum).forEach (function (key) {
            var sum = sa.fldsum[key];
            sum.field = key;
            if(sum.accum === "binary") {
                var ttl = sum.present + sum.missing;
                sum.diff = ttl - Math.abs(sum.present - sum.missing); }
            else if(sum.accum === "scalar") {
                sum.diff = sum.max - sum.min; }
            hdfs.push(sum); });
        // jt.log("findHighDifferenceFields  --------------------");
        // jt.log(JSON.stringify(hdfs))
        // jt.log("--------------------");
        hdfs.sort(function (a, b) { return b.diff - a.diff; });
        sa.fields = hdfs.slice(0, sa.cs.length);  //one field per color
        sa.ks = sa.fields.map((x) => x.field);
    }


    function calculatePointGroupingForChart (pts) {
        //Setting the number of chart x ticks to a higher number accentuates
        //the jaggedness on the right as point density and diversity
        //increases.  Setting it low doesn't look like much.  Exceeding the
        //number of points in the level breaks the last stack.  Tried 10,
        //20, 30, 60.
        var ncxt = 20;
        var grp = Math.ceil(pts.length / ncxt);
        return grp;
    }


    function groupPointsIntoChartData (grp) {
        var dat = [];
        var currd = {};
        var count = 0;
        sa.pts.forEach(function (pt) {
            currd.tc = currd.tc || pt.tc;
            sa.fields.forEach(function (sum) {
                var field = sum.field;
                currd[field] = currd[field] || 0;
                currd[field] += pt[field]; });
            count += 1;
            if(count >= grp) {
                dat.push(currd);
                currd = {};
                count = 0; } });
        //adjust the field summaries to account for the grouping
        sa.fields.forEach(function (sum) {
            if(sum.accum === "scalar") {
                sum.max = grp * sum.max; } });
        return dat;
    }


    function makeStackData () {
        var pts = levinf.lev.points;
        var grp = calculatePointGroupingForChart(pts);
        var dat = groupPointsIntoChartData(grp);
        //convert data values to percentages of total
        dat.forEach(function (dp) {
            sa.fields.forEach(function (fd) {
                var val = dp[fd.field];
                if(fd.accum === "binary") {
                    var ttl = fd.present + fd.missing;
                    val = Math.floor((val / ttl) * 10000) / 10000;
                    dp[fd.field] = val; }
                else if(fd.accum === "scalar") {
                    val = Math.floor((val / fd.max) * 10000) / 10000;
                    dp[fd.field] = val; } }); });
        // jt.log("makeStackData (post percentage) --------------------");
        // jt.log(JSON.stringify(dat));
        // jt.log("--------------------");
        return dat;
    }


    function consoleKeyForStackedArea () {
        jt.log("consoleKeyForStackedArea:");
        sa.fields.forEach(function (sum, idx) {
            jt.log("    " + sa.vs[idx] + ": " + sum.field + " (" + sum.accum + 
                   ") diff:" + sum.diff); });
    }


    function areaMouseover (d) {
        if(chart.mouseovers) {
            chart.tdg.attr("opacity", 1);
            d3.select("#maintext")
                .text(d.key)
                .attr("font-size", 22)
                .attr("opacity", 1); }
    }


    function areaMouseout () {
        if(chart.mouseovers) {
            d3.select("#maintext").text("").attr("opacity", 0); }
    }


    //Background graphic is a stacked area chart covering the timeline point
    //distributions across the more differential point classifications.
    function displayStacked () {
        sa.cs = ["#ff0000","#700000","#5caf79","#ffff00","#800080","#9191ff"];
        sa.vs = ["    red","darkred","  green"," yellow"," purple","skyblue"];
        findHighDifferenceFields();  //sets sa.fields, sa.ks
        sa.dat = makeStackData();
        consoleKeyForStackedArea();
        sa.x = d3.scaleLinear()
            .domain([sa.dat[0].tc, sa.dat[sa.dat.length - 1].tc])
            .range([0, tl.width2]);
        sa.y = d3.scaleLinear().range([tl.height, 0]);
        sa.z = d3.scaleOrdinal(sa.cs).domain(sa.ks);
        sa.stack = d3.stack().keys(sa.ks);
        sa.area = d3.area()
            .x(function (d) { return sa.x(d.data.tc); })
            .y0(function (d) { return sa.y(d[0]); })
            .y1(function (d) { return sa.y(d[1]); });
        sa.g = chart.vg.append("g").attr("opacity", 1.0);
        sa.layer = sa.g.selectAll(".layer")
            .data(sa.stack(sa.dat))
            .enter().append("g").attr("class", "layer");
        sa.layer.append("path")
            .attr("class", "area")
            .on("mouseover", areaMouseover)
            .on("mouseout", areaMouseout)
            .style("fill", function (d) { return sa.z(d.key); })
            .attr("d", sa.area);
        sa.g.transition().delay(1500).duration(3000)
            .attr("opacity", 0.6);
    }


    function closeAndReturn () {
        var timing = 1000;
        if(!chart.exited) {  //ignore stray double clicks or bubbling
            chart.exited = true;
            levinf.lev.levelupShown = new Date().toISOString();
            d3.select("#suppvisdiv")
                .transition().duration(timing)
                .style("left", Math.round(0.5 * tl.width2) + "px")
                .style("top", Math.round(0.5 * tl.height) + "px")
                .style("width", "1px")
                .style("height", "1px");
            setTimeout(function () {
                d3.select("#suppvisdiv")
                    .style("visibility", "hidden"); 
                app.db.nextInteraction(); }, timing); }
    }


    function displayStartButton () {
        var sb = {r:Math.round(0.8 * pc.ir),
                  sh:3, timing:1000};
        //FF gives a 1/4 circle if starting from 0,0 even if g translated
        sb.cx = sb.r;
        sb.cy = sb.cx;
        sb.ox = pc.x - sb.cx;
        sb.oy = pc.y - sb.cy;
        sb.g = chart.vg.append("g")
            .attr("transform", "translate(" + sb.ox + "," + sb.oy + ")");
        sb.ds = sb.g.append("circle")
            .attr("r", sb.r)
            .attr("cx", sb.cx + sb.sh, sb.cy + sb.sh)
            .attr("cy", sb.cx + sb.sh, sb.cy + sb.sh)
            .attr("fill", "333")
            .attr("opacity", 0.0)
            .transition().duration(sb.timing + 500)
            .attr("opacity", 1.0);
        sb.cb = sb.g.append("circle")
            .attr("r", 2)
            .attr("cx", sb.cx, sb.cy)
            .attr("cy", sb.cx, sb.cy)
            .attr("fill", "#07e048")
            .attr("class", "clickable")
            .on("click", closeAndReturn)
            .attr("opacity", 0.0)
            .transition().duration(sb.timing)
            .attr("r", sb.r)
            .attr("opacity", 1.0);
        sb.txt = sb.g.append("text")
            .attr("class", "svintext")
            .attr("text-anchor", "middle")
            .attr("x", sb.cx)
            .attr("y", sb.cy + 8)
            .attr("font-size", 28)
            .text("Go")
            .on("click", closeAndReturn)
            .attr("opacity", 0.0)
            .transition().duration(sb.timing)
            .attr("opacity", 1.0);
    }


    function displayCompletionText () {
        var timing = {delay:2000, duration:1000};
        var words = ["Level " + levinf.lev.num, "Completed"];
        if(levinf.levs.length === levinf.lev.num) {
            words = ["Done!"]; }
        chart.tdg = chart.vg.append("g").attr("opacity", 1);
        words.forEach(function (word, idx) {
            chart.tdg.append("text")
                .attr("id", "maintext")
                .attr("x", chart.tp.xc)
                .attr("y", Math.round(0.4 * tl.height) + (idx * 60))
                .attr("text-anchor", "middle")
                .attr("font-weight", "bold")
                .attr("font-size", 52)
                .text(word)
                .attr("opacity", 1)
            //this next transition used to work but is now ignored 25mar19
                .transition().delay(timing.delay).duration(timing.duration)
                .attr("opacity", 0); });
        //fade entire group in case individual word fading ignored.
        chart.tdg.transition().delay(timing.delay).duration(timing.duration)
            .attr("opacity", 0);
    }


    function displayText () {
        var words = [{x:chart.tp.xl, y:chart.tp.yt, ta:"start", 
                      txt:"Knowledge", x2:chart.tp.xr},
                     {x:chart.tp.xc, y:chart.tp.ym, ta:"middle",
                      txt:"Respect", x2:chart.tp.xc},
                     {x:chart.tp.xr, y:chart.tp.yb, ta:"end",
                      txt:"Community", x2:chart.tp.xl}];
        var idel = 2500;
        var wdel = 1000;
        var wft = 1000;
        var tv = 3000;
        chart.krcg = chart.vg.append("g").attr("opacity", 1);
        words.forEach(function (word, idx) {
            chart.krcg.append("text")
                .attr("x", word.x)
                .attr("y", word.y)
                .attr("text-anchor", word.ta)
                .attr("font-weight", "bold")
                .attr("font-size", 28)
                .text(word.txt)
                .attr("opacity", 0)
                .transition().delay(idel + (idx * wdel)).duration(wft)
                .attr("opacity", 1)
                .transition().delay(tv - (idx * wdel)).duration(wft)
                .attr("x", word.x2)
                .attr("opacity", 0); 
        });
        var total = idel + (wdel * words.length) + wft;
        //fade entire group in case individual word fading ignored.
        chart.krcg.transition().delay(total).duration(wft)
            .attr("opacity", 0);
        return total;
    }


    function autodone () {
        var tt = 1400;
        pc.g.transition().duration(tt)
            .attr("opacity", 1.0)
            .attr("transform", "translate(" + pc.x + "," + pc.y + ")" +
                              ",scale(10)");
        setTimeout(closeAndReturn, tt);
    }


    function displayLevText () {
        var lines = [];
        var nextlev = levinf.levs[levinf.lev.num];  //last level calls finale
        var txty = Math.round(0.4 * pc.y); var ys; var ye;
        var nextf = displayStartButton;
        if(!nextlev || !nextlev.points || !nextlev.points.length) {
            lines.push("");
            lines.push("All points completed!");
            nextf = autodone; }
        else {
            ys = nextlev.points[0].start.year;
            ye = nextlev.points[nextlev.points.length - 1].start.year;
            if(ys < 0) {
                ys = String(Math.abs(ys)) + " BCE"; }
            if(ye < 0) {
                ye = String(Math.abs(ye)) + " BCE"; }
            lines.push("Level " + nextlev.num);
            lines.push(ys + " - " + ye); }
        lines.forEach(function (line, idx) {
            chart.vg.append("text")
                .attr("x", chart.tp.xc)
                .attr("y", txty + (idx * chart.tp.h))
                .attr("text-anchor", "middle")
                .attr("font-weight", "bold")
                .attr("font-size", 26)
                .text(line)
                .attr("opacity", 0)
                .transition().delay(idx * 500).duration(1000)
                .attr("opacity", 1); });
        setTimeout(nextf, 2000);
    }


    function makePieData () {
        var ttl = levinf.tl.points.length;
        var pcttl = 0;
        var data = [];
        levinf.levs.forEach(function (lev, idx) {
            var datum = {label:"Level " + lev.num,
                         stat:idx - levinf.lev.num,
                         count:((lev.points.length / ttl) * 100)};
            //jt.log("makePieData lev " + idx + ": " + lev.points.length);
            pcttl += datum.count;
            data.push(datum); });
        return data;
    }


    function displayPie () {
        var timing = 2000;
        pc = {x:Math.round(0.5 * tl.width2),
              y:Math.round(0.45 * tl.height)};
        pc.r = Math.min(pc.x, pc.y);
        pc.data = makePieData();
        pc.g = chart.vg.append("g")
            .attr("opacity", 0.1)
            .attr("transform", "translate(" + pc.x + "," + pc.y + ")" +
                              ",scale(0.1)");
        pc.ir = Math.round(0.35 * pc.r);
        pc.arc = d3.arc()
            .innerRadius(pc.ir)
            .outerRadius(pc.r);
        pc.pie = d3.pie()
            .value(function(d) { return d.count; })
            .sort(null);
        pc.path = pc.g.selectAll("path")
            .data(pc.pie(pc.data))
            .enter()
            .append("path")
            .attr("d", pc.arc)
            .attr("fill", function(d) {
                if(d.data.stat < 0) { return "#00ff4c"; }
                if(d.data.stat === 0) { return "#fefefe"; }
                return "#ccc";
            })
            .attr("fill-opacity", function (d) { 
                return ((d.data.stat < 0)? 1.0 : 0.6); 
            })
            .attr("stroke", "#333");
        pc.g.transition().duration(timing)
            .attr("opacity", 1.0)
            .attr("transform", "translate(" + pc.x + "," + pc.y + ")" +
                              ",scale(1)");
        setTimeout(displayLevText, timing);
    }


    function initLevelInfo (currlev) {
        levinf = {tl:currlev.tl, lev:currlev.lev, levs:[]};
        app.db.displayContext().ds.forEach(function (tl) {
            tl.levs.forEach(function (lev) {
                levinf.levs.push(lev); }); });
    }


    function display (currlev) {
        var delay = 0;
        tl = app.linear.timeline();
        initLevelInfo(currlev);
        chart.exited = false;
        initDisplayElements();
        displayStacked();
        displayCompletionText();
        delay = displayText();
        setTimeout(displayPie, delay);
    }


    return {
        display: function (currlev) { display(currlev); }
    };
}());
