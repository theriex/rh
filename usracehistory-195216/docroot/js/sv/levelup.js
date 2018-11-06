/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.levelup = (function () {
    "use strict";

    var tl = null,  //grab useful geometry from linear timeline display
        levinf = null,
        chart = {colors: {bg: "#fff5ce", bbg: "#fdd53a", bb: "#7d6a22"},
                 exited:false},
        sa = {},  //stacked area chart vars
        pc = {};  //pie chart vars


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


    function noteField(fields, field, value, pname) {
        var key = field + value;
        if(!fields[key]) {
            fields[key] = {name:field, value:value, count:0, 
                           pname:pname || value}; }
        fields[key].count += 1;
    }


    function findHighDifferenceFields () {
        var fields = {}, hdfs = [];
        //go through the points and note the fields to differentiate with
        levinf.lev.points.forEach(function (pt) {
            Object.keys(app.qts).forEach(function (key) {
                if(pt.qtype === key) {
                    noteField(fields, "qtype", key, app.qts[key]); } });
            app.keyflds.forEach(function (key) {
                pt[key] = pt[key] || "";
                pt[key].csvarray().forEach(function (val) {
                    noteField(fields, key, val); }); }); });
        Object.keys(fields).forEach(function (key) {
            var fdef = fields[key];
            fdef.missing = levinf.lev.points.length - fdef.count;
            fdef.diff = Math.abs(fdef.count - fdef.missing);
            hdfs.push(fdef); });
        hdfs.sort(function (a, b) { return a.diff - b.diff; });
        sa.fields = hdfs.slice(0, sa.cs.length);  //one field per color
        sa.ks = sa.fields.map((x) => x.pname);
        jt.log("levelup.findHighDifferenceFields:");
        sa.fields.forEach(function (field) {
            jt.log("    " + field.name + " " + field.value + " " + 
                   field.count + " " + field.missing + " " + field.diff); });
    }


    function makeStackData () {
        var dat = [], currd = {}, pts = levinf.lev.points,
            //Setting the number of chart x ticks to a higher number
            //accentuates the jaggedness on the right as point density and
            //diversity increases.  Setting it low doesn't look like much.
            //Exceeding the number of points in the level breaks the last
            //stack.  Tried 10, 20, 30, 60.
            ncxt = 20,
            grp = Math.ceil(pts.length / ncxt), count = 0;
        pts.forEach(function (pt) {
            currd.tc = currd.tc || pt.tc;
            sa.fields.forEach(function (fd) {
                currd[fd.pname] = currd[fd.pname] || 0;
                if(pt[fd.name].csvcontains(fd.value)) {
                    currd[fd.pname] += 1; } });
            count += 1;
            if(count >= grp) {
                dat.push(currd);
                currd = {};
                count = 0; } });
        //convert data values to percentages of total
        dat.forEach(function (dp) {
            var ttl = 0;
            sa.fields.forEach(function (fd) {
                ttl += dp[fd.pname]; });
            sa.fields.forEach(function (fd) {
                var val = dp[fd.pname];
                val = Math.round((val / ttl) * 10000) / 10000;
                dp[fd.pname] = val; }); });
        return dat;
    }


    //Background graphic is a stacked area chart covering the timeline point
    //distributions across the more differential point classifications.
    function displayStacked () {
        sa.cs = ["#ff0000","#700000","#5caf79","#ffff00","#800080","#9191ff"];
        findHighDifferenceFields();  //sets sa.fields, sa.ks
        sa.dat = makeStackData();
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
        var words = ["Level " + levinf.lev.num, "Completed"];
        if(levinf.levs.length === 1) {
            words = ["Level Complete"]; }
        words.forEach(function (word, idx) {
            chart.vg.append("text")
                .attr("x", chart.tp.xc)
                .attr("y", Math.round(0.4 * tl.height) + (idx * 60))
                .attr("text-anchor", "middle")
                .attr("font-weight", "bold")
                .attr("font-size", 52)
                .text(word)
                .attr("opacity", 1)
                .transition().delay(2000).duration(1000)
                .attr("opacity", 0); });
    }


    function displayText () {
        var words = [{x:chart.tp.xl, y:chart.tp.yt, ta:"start", 
                      txt:"Knowledge", x2:chart.tp.xr},
                     {x:chart.tp.xc, y:chart.tp.ym, ta:"middle",
                      txt:"Respect", x2:chart.tp.xc},
                     {x:chart.tp.xr, y:chart.tp.yb, ta:"end",
                      txt:"Community", x2:chart.tp.xl}],
            idel = 2500,
            wdel = 1000,
            wft = 1000,
            tv = 3000;
        words.forEach(function (word, idx) {
            chart.vg.append("text")
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
        return idel + (wdel * words.length) + wft;
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
        var lines = [],
            nextlev = levinf.levs[levinf.lev.num],  //last level calls finale
            txty = Math.round(0.4 * pc.y), ys, ye,
            nextf = displayStartButton;
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
        var ttl = levinf.tl.points.length,
            pcttl = 0, 
            data = [];
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
                return (d.data.stat < 0)? 1.0 : 0.6; 
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
