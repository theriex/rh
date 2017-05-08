/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.intro = (function () {
    "use strict";

    var sv = null,
        tl = null,
        endf = null,
        chart = {colors: {bg: "#fff5ce", bbg: "#fdd53a", bb: "#7d6a22"}},
        sa = {},  //stacked area chart vars
        pc = {},  //pie chart vars
        exited = false;


    function initDisplayElements () {
        var lnh = 40;  //line height
        d3.select("#suppvisdiv")
            .style("left", tl.margin.left + "px")
            .style("top", tl.margin.top + "px")
            .style("width", 30 + "px")
            .style("height", 30 + "px")
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


    function makeStackData (yg) {
        var rd = [], xg, gd = [], cg = null;
        yg = yg || 10;  //by default group years into decades
        app.data.pts.forEach(function (pt) {
            var dp = {tc:pt.tc};
            app.data.timelines.forEach(function (tl) {
                dp[tl.code] = (pt.code.indexOf(tl.code) >= 0)? 1 : 0; });
            rd.push(dp); });
        rd.sort(function (a, b) { return a.tc - b.tc; });
        xg = 1600;  //everything before this year is lumped together
        rd.forEach(function (dat) {
            if(dat.tc > xg) {
                gd.push(cg);
                cg = null;
                xg = Math.floor(dat.tc) + yg; }
            if(!cg) {
                cg = {tc:xg};
                app.data.timelines.forEach(function (tl) {
                    cg[tl.code] = dat[tl.code]; }); }
            else {
                app.data.timelines.forEach(function (tl) {
                    cg[tl.code] += dat[tl.code]; }); } });
        //convert data to percentages
        gd.forEach(function (dat) {
            var ttl = 0;
            app.data.timelines.forEach(function (tl) {
                ttl += dat[tl.code]; });
            app.data.timelines.forEach(function (tl) {
                var val = dat[tl.code];
                val = Math.round((val / ttl) * 10000) / 10000;
                dat[tl.code] = val; }); });
        return gd;
    }


    function displayStacked () {
        sa.dat = makeStackData(5);
        sa.ks = ["N",      "B",      "L",      "A",      "M",      "R"];
        sa.cs = ["#ff0000","#700000","#5caf79","#ffff00","#800080","#9191ff"];
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
        var nowiso;
        if(!exited) {
            exited = true;
            nowiso = (new Date()).toISOString();
            sv.pts.forEach(function (pt) {
                pt.visited = nowiso; });
            sv.visited = nowiso;
            d3.select("#suppvisdiv")
                .style("visibility", "hidden");
            endf(); }
    }


    function displayStartButton () {
        var sb = {r:Math.round(0.8 * pc.ir),
                  sh:3, timing:1000};
        sb.ds = pc.g.append("circle")
            .attr("r", sb.r)
            .attr("cx", sb.sh, sb.sh)
            .attr("cy", sb.sh, sb.sh)
            .attr("fill", "333")
            .attr("opacity", 0.0)
            .transition().duration(sb.timing + 500)
            .attr("opacity", 1.0);
        sb.cb = pc.g.append("circle")
            .attr("r", 2)
            .attr("cx", 0, 0)
            .attr("cy", 0, 0)
            .attr("fill", "#07e048")
            .attr("class", "clickable")
            .on("click", closeAndReturn)
            .attr("opacity", 0.0)
            .transition().duration(sb.timing)
            .attr("r", sb.r)
            .attr("opacity", 1.0);
        sb.txt = pc.g.append("text")
            .attr("class", "svintext")
            .attr("text-anchor", "middle")
            .attr("x", 0)
            .attr("y", 8)
            .attr("font-size", 28)
            .text("Go")
            .on("click", closeAndReturn)
            .attr("opacity", 0.0)
            .transition().duration(sb.timing)
            .attr("opacity", 1.0);
    }


    // function makeRect (cname, dims, xtra) {
    //     var rect = chart.vg.append("rect")
    //         .attr("class", cname)
    //         .attr("x", dims.x)
    //         .attr("y", dims.y)
    //         .attr("width", dims.w)
    //         .attr("height", dims.h);
    //     if(xtra && xtra.r) {
    //         rect.attr("rx", xtra.r).attr("ry", xtra.r); }
    //     if(xtra && xtra.fill) {
    //         rect.attr("fill", xtra.fill); }
    //     if(xtra && xtra.opa) {
    //         rect.attr("opacity", xtra.opa); }
    //     return rect;
    // }


    // function transRect (rect, dims, duration) {
    //     rect.transition().duration(duration)
    //         .attr("x", dims.x)
    //         .attr("y", dims.y)
    //         .attr("width", dims.w)
    //         .attr("height", dims.h);
    // }


    // function displayReturnLink () {
    //     var dim = {pad: 8, border: 4, ro: 8, ri: 6, drop: 4,
    //                x: chart.tp.xc, y: Math.round(4.2 * chart.tp.h),
    //                defw: 20, defh: 10},
    //         ele = {};
    //     dim.defbox = {x: dim.x - Math.round(dim.defw / 2),
    //                   y: dim.y - Math.round(dim.defw / 2),
    //                   w: dim.defw, h: dim.defh};
    //     ele.drop = makeRect("sbShadowRect", dim.defbox, 
    //                   {r: dim.ro, fill:"#333333", opa:0.6});
    //     ele.or = makeRect("sbOuterRect", dim.defbox, 
    //                       {r: dim.ro, fill: chart.colors.bb});
    //     ele.ir = makeRect("sbInnerRect", dim.defbox, 
    //                       {r: dim.ri, fill: chart.colors.bbg});
    //     ele.txt = chart.vg.append("text")
    //         .attr("class", "svintext")
    //         .attr("text-anchor", "middle")
    //         .attr("x", dim.x)
    //         .attr("y", dim.y)
    //         .attr("font-size", chart.tp.fs)
    //         .text("I'm ready");
    //     dim.bb = ele.txt.node().getBBox();
    //     dim.ib = {x: dim.bb.x - dim.pad,
    //               y: dim.bb.y - dim.pad,
    //               h: dim.bb.height + (2 * dim.pad), 
    //               w: dim.bb.width + (2 * dim.pad)};
    //     dim.ob = {x: dim.ib.x - dim.border, 
    //               y: dim.ib.y - dim.border,
    //               h: dim.ib.h + (2 * dim.border), 
    //               w: dim.ib.w + (2 * dim.border)};
    //     ele.click = makeRect("sbClickRect", dim.ob);
    //     ele.click.on("click", closeAndReturn);
    //     ele.txt.on("click", closeAndReturn);
    //     ele.ir.on("click", closeAndReturn);
    //     transRect(ele.ir, dim.ib, 400);
    //     transRect(ele.or, dim.ob, 400);
    //     dim.ob.x += dim.drop;
    //     dim.ob.y += dim.drop;
    //     transRect(ele.drop, dim.ob, 400);
    // }


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


    function rangePoints (rangelimit) {
        var range = {spt:null, ept:null};
        app.data.pts.forEach(function (pt) {
            if(!range.spt) {
                if(!pt.visited && !pt.sv) {
                    range.spt = pt; } }
            else if(rangelimit > 0) {
                if(!pt.visited && !pt.sv) {
                    range.ept = pt;
                    rangelimit -= 1; } } });
        return range;
    }


    function displayLevText () {
        var lines = [],
            nextlev = pc.levinf.levels[pc.levinf.level],
            rng = rangePoints(nextlev.pa),
            txty = Math.round(0.4 * pc.y),
            ys = rng.spt.start.year,
            ye = rng.ept.start.year;
        if(ys < 0) {
            ys = String(Math.abs(ys)) + " BCE"; }
        if(ye < 0) {
            ye = String(Math.abs(ye)) + " BCE"; }
        lines.push("Level " + (pc.levinf.level + 1));
        lines.push(ys + " - " + ye);
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
        setTimeout(displayStartButton, 2000);
    }


    function makePieData () {
        var ttl = 0, 
            pcttl = 0, 
            data = [];
        pc.levinf = app.lev.progInfo();
        pc.levinf.levels.forEach(function (lev) {
            ttl += lev.pttl; });
        pc.levinf.levels.forEach(function (lev, idx) {
            var datum = {label:"Level " + (idx + 1),
                         stat:idx - pc.levinf.level,
                         count:Math.floor((lev.pttl / ttl) * 100)};
            pcttl += datum.count;
            data.push(datum); });
        if(pcttl < 100) {
            data[0].count = 100 - pcttl; }
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


    function display (suppvis, timeline, endfunc) {
        var delay = 0;
        sv = suppvis;
        tl = timeline;
        endf = endfunc;
        initDisplayElements();
        displayStacked();
        delay = displayText();
        setTimeout(displayPie, delay);
    }


    return {
        display: function (sv, tl, endf) { display(sv, tl, endf); }
    };
}());
