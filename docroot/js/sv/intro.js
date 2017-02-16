/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.intro = (function () {
    "use strict";

    var sv = null,
        tl = null,
        endf = null,
        chart = {colors: {bg: "#fff5ce", bbg: "#fdd53a", bb: "#7d6a22"}},
        exited = false;


    function initDisplayElements () {
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
                   x: chart.tx, y: Math.round(4.2 * chart.th),
                   defw: 20, defh: 10},
            ele = {};
        dim.defbox = {x: dim.x - Math.round(dim.defw / 2),
                      y: dim.y - Math.round(dim.defw / 2),
                      w: dim.defw, h: dim.defh};
        ele.drop = makeRect("sbShadowRect", dim.defbox, 
                      {r: dim.ro, fill:"#dad0a8", stroke: chart.colors.bg});
        ele.or = makeRect("sbOuterRect", dim.defbox, 
                          {r: dim.ro, fill: chart.colors.bb});
        ele.ir = makeRect("sbInnerRect", dim.defbox, 
                          {r: dim.ri, fill: chart.colors.bbg});
        ele.txt = chart.vg.append("text")
            .attr("class", "svintext")
            .attr("text-anchor", "middle")
            .attr("x", dim.x)
            .attr("y", dim.y)
            .attr("font-size", chart.fs)
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
        chart.tx = tl.margin.left + Math.round(0.5 * tl.width2);
        chart.th = 40;
        chart.fs = 20;
        chart.vg.append("text")
            .attr("class", "svintext")
            .attr("text-anchor", "middle")
            .attr("x", chart.tx)
            .attr("y", chart.th)
            .attr("font-size", 0)
            .text("Intro Level Completed!")
            .transition().duration(2000)
            .attr("font-size", chart.fs);
        chart.vg.append("text")
            .attr("class", "svintext")
            .attr("text-anchor", "middle")
            .attr("x", chart.tx)
            .attr("y", 2 * chart.th)
            .attr("font-size", 0)
            .attr("opacity", 1)
            .text("Welcome.")
            .transition().delay(2000).duration(1000)
            .attr("font-size", chart.fs)
            .transition().delay(1000).duration(500)
            .attr("opacity", 0);
        chart.vg.append("text")
            .attr("class", "svintext")
            .attr("text-anchor", "middle")
            .attr("x", chart.tx)
            .attr("y", 2 * chart.th)
            .attr("font-size", chart.fs)
            .attr("opacity", 0)
            .text("The next levels are chronological.")
            .transition().delay(4000).duration(1000)
            .attr("opacity", 1)
            .transition().delay(2000).duration(1000)
            .attr("opacity", 0);
        chart.vg.append("text")
            .attr("class", "svintext")
            .attr("text-anchor", "middle")
            .attr("x", chart.tx)
            .attr("y", 2 * chart.th)
            .attr("font-size", chart.fs)
            .attr("opacity", 0)
            .text("There are " + app.lev.progInfo().numlevels + " levels.")
            .transition().delay(7000).duration(1000)
            .attr("opacity", 1)
        chart.vg.append("text")
            .attr("class", "svintext")
            .attr("text-anchor", "middle")
            .attr("x", chart.tx)
            .attr("y", 3 * chart.th)
            .attr("font-size", chart.fs)
            .attr("opacity", 0)
            .text("Good luck!")
            .transition().delay(9000).duration(1000)
            .attr("opacity", 1)
        setTimeout(displayReturnLink, 10000);
    }


    function display (suppvis, timeline, endfunc) {
        sv = suppvis;
        tl = timeline;
        endf = endfunc;
        initDisplayElements();
        displayText();
    }


    return {
        display: function (sv, tl, endf) { display(sv, tl, endf); },
    };
}());
