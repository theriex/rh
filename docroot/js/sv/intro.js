/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.intro = (function () {
    "use strict";

    var sv = null,
        tl = null,
        endf = null,
        chart = {colors: {bg: "#fff5ce", bbg: "#fdd53a", bb: "#7d6a22"}},
        sa = {},  //stacked area chart vars
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
            .style("height", tl.height + "px")
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
                gd.push(cg)
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
        sa.cs = ["#ff0000","#700000","#008000","#ffff00","#800080","#9191ff"];
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
        sa.g = chart.vg.append("g");
        sa.layer = sa.g.selectAll(".layer")
            .data(sa.stack(sa.dat))
            .enter().append("g").attr("class", "layer");
        sa.layer.append("path")
            .attr("class", "area")
            .style("fill", function (d) { return sa.z(d.key); })
            .attr("d", sa.area);
    }


    function makeRect (cname, dims, xtra) {
        var rect = chart.vg.append("rect")
            .attr("class", cname)
            .attr("x", dims.x)
            .attr("y", dims.y)
            .attr("width", dims.w)
            .attr("height", dims.h);
        if(xtra && xtra.r) {
            rect.attr("rx", xtra.r).attr("ry", xtra.r); }
        if(xtra && xtra.fill) {
            rect.attr("fill", xtra.fill); }
        if(xtra && xtra.opa) {
            rect.attr("opacity", xtra.opa); }
        return rect;
    }


    function transRect (rect, dims, duration) {
        rect.transition().duration(duration)
            .attr("x", dims.x)
            .attr("y", dims.y)
            .attr("width", dims.w)
            .attr("height", dims.h);
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



    function displayReturnLink () {
        var dim = {pad: 8, border: 4, ro: 8, ri: 6, drop: 4,
                   x: chart.tp.xc, y: Math.round(4.2 * chart.tp.h),
                   defw: 20, defh: 10},
            ele = {};
        dim.defbox = {x: dim.x - Math.round(dim.defw / 2),
                      y: dim.y - Math.round(dim.defw / 2),
                      w: dim.defw, h: dim.defh};
        ele.drop = makeRect("sbShadowRect", dim.defbox, 
                      {r: dim.ro, fill:"#333333", opa:0.6});
        ele.or = makeRect("sbOuterRect", dim.defbox, 
                          {r: dim.ro, fill: chart.colors.bb});
        ele.ir = makeRect("sbInnerRect", dim.defbox, 
                          {r: dim.ri, fill: chart.colors.bbg});
        ele.txt = chart.vg.append("text")
            .attr("class", "svintext")
            .attr("text-anchor", "middle")
            .attr("x", dim.x)
            .attr("y", dim.y)
            .attr("font-size", chart.tp.fs)
            .text("I'm ready");
        dim.bb = ele.txt.node().getBBox();
        dim.ib = {x: dim.bb.x - dim.pad,
                  y: dim.bb.y - dim.pad,
                  h: dim.bb.height + (2 * dim.pad), 
                  w: dim.bb.width + (2 * dim.pad)};
        dim.ob = {x: dim.ib.x - dim.border, 
                  y: dim.ib.y - dim.border,
                  h: dim.ib.h + (2 * dim.border), 
                  w: dim.ib.w + (2 * dim.border)};
        ele.click = makeRect("sbClickRect", dim.ob);
        ele.click.on("click", closeAndReturn);
        ele.txt.on("click", closeAndReturn);
        ele.ir.on("click", closeAndReturn);
        transRect(ele.ir, dim.ib, 400);
        transRect(ele.or, dim.ob, 400);
        dim.ob.x += dim.drop;
        dim.ob.y += dim.drop;
        transRect(ele.drop, dim.ob, 400);
    }


    function displayText () {
        var words = [{x:chart.tp.xl, y:chart.tp.yt, ta:"start", 
                      txt:"Knowledge"},
                     {x:chart.tp.xc, y:chart.tp.ym, ta:"middle",
                      txt:"Respect"},
                     {x:chart.tp.xr, y:chart.tp.yb, ta:"end",
                      txt:"Community"}],
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
                .transition().delay(tv).duration(wft)
                .attr("opacity", 0); 
        });
    }


    function display (suppvis, timeline, endfunc) {
        sv = suppvis;
        tl = timeline;
        endf = endfunc;
        initDisplayElements();
        displayStacked();
        displayText();
        //display pie
        //display "Starting from the beginning"
        setTimeout(displayReturnLink, 10000);
    }


    return {
        display: function (sv, tl, endf) { display(sv, tl, endf); },
    };
}());
