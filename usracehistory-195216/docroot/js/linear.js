/*jslint browser, multivar, white, fudge, this */
/*global app, window, jt, d3 */

app.linear = (function () {
    "use strict";

    var tl; //timeline data object

    function setChartWidthAndHeight () {
        var over, minw = 320,      //full width of a standard phone
            rat = {w: 3, h: 2};    //default to nice 3:2 aspect ratio
        if(window.innerWidth < 700) {
            rat = {w: 2, h: 3}; }  //switch to long and tall (phone/portrait)
        tl.chart = {w: 0, h: 0};
        tl.chart.w = window.innerWidth - tl.offset.x;
        tl.chart.h = Math.round((tl.chart.w * rat.h) / rat.w);
        over = tl.chart.h - window.innerHeight;
        if(over > 0) {  //blew the available height, squish vertically
            tl.chart.w -= Math.round((over * rat.w) / rat.h);
            tl.chart.h = Math.round((tl.chart.w * rat.h) / rat.w); }
        if(tl.chart.w < minw) {  //underflowed minimum phone width, re-expand
            tl.chart.w = minw;
            tl.chart.h = Math.round((tl.chart.w * rat.h) / rat.w); }
    }


    function redraw () {
        tl.focus.select(".axis--x").call(tl.xAxis);
        tl.focus.selectAll("circle")
            .attr("cx", function(d) { return tl.x(d.tc); })
            .attr("cy", function(d) { return tl.y(d.oc); });
    }


    function unzoom () {
        tl.svg.select(".zoom").call(
            tl.zoom.transform,
            d3.zoomIdentity.scale(1));
    }


    function brushed () {
        var sel;
        if(d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") {
            return; } // ignore brush-by-zoom
        sel = d3.event.selection || tl.sel || tl.x2.range();
        tl.x.domain(sel.map(tl.x2.invert, tl.x2));
        redraw();
        //console.log("brushed sel[0]: " + sel[0] + ", sel[1]: " + sel[1]);
        tl.svg.select(".zoom").call(
            tl.zoom.transform, 
            d3.zoomIdentity.scale(tl.width2 / (sel[1] - sel[0]))
                .translate(-sel[0], 0));
    }


    function adjustTickTextVisibility () {
        d3.selectAll(".tick text")
            .attr("fill", tl.zscale === 1 ? "none" : "#000");
    }


    function zoomed () {
        var tran;
        if(d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") {
            return; } // ignore zoom-by-brush
        tran = d3.event.transform;
        tl.zscale = tran.k;
        //console.log("k: " + tran.k + ", x: " + tran.x + ", y: " + tran.y);
        adjustTickTextVisibility();
        tl.x.domain(tran.rescaleX(tl.x2).domain());
        redraw();
        tl.context.select(".brush").call(
            tl.brush.move, tl.x2.range().map(tran.invertX, tran));
    }


    function addFocusInteractiveElements () {
        tl.focus.append("text")
            .attr("id", "mouseoverLabel")
            .attr("text-anchor", "middle")
            .attr("x", 0)
            .attr("y", 0)
            .text("");
    }


    function arrowZoom (direction) {
        var jw;
        if(!tl.sel) {
            return; }
        jw = Math.round(tl.width2 / 16);
        tl.sel[0] += jw * direction;
        tl.sel[1] += jw * direction;
        if(direction < 0) {
            tl.sel[0] = Math.max(tl.sel[0], 0);
            tl.sel[1] = Math.max(tl.sel[1], jw); }
        else {
            tl.sel[0] = Math.min(tl.sel[0], tl.width2 - jw);
            tl.sel[1] = Math.min(tl.sel[1], tl.width2); }
        tl.svg.select(".zoom").transition().duration(1000).call(
            tl.zoom.transform,
            d3.zoomIdentity.scale(tl.width2 / (tl.sel[1] - tl.sel[0]))
                .translate(-tl.sel[0], 0));
    }


    function addContextDecorativeElements () {
        var label = {pad: 10, fs: Math.round(0.4 * tl.height2),
                     y: tl.margin2.top + Math.round(0.64 * tl.height2)},
            rightx = tl.margin2.left + tl.width2,
            tri = {midy: tl.margin2.top + Math.round(0.5 * tl.height2),
                   ttly: tl.margin2.top + tl.height2,
                   rightmost: tl.margin.left + tl.width};
        label.start = tl.pts[0].start.year;
        if(label.start < 0) {
            label.start = String(label.start * -1) + " BCE"; }
        label.end = tl.pts[tl.pts.length - 1].start.year;
        tl.deco = tl.svg.append("g");
        tl.deco.append("text")
            .attr("class", "contextLabel")
            .attr("x", tl.margin2.left + label.pad)
            .attr("y", label.y)
            .attr("font-size", label.fs)
            .text(label.start);
        tl.deco.append("text")
            .attr("class", "contextLabel")
            .attr("text-anchor", "end")
            .attr("x", rightx - label.pad)
            .attr("y", label.y)
            .attr("font-size", label.fs)
            .text(label.end);
        tl.deco.append("path")  //left arrow
            .attr("d", "M " + tl.margin.left + " " + tri.midy +
                      " L " + tl.margin2.left + " " + tl.margin2.top +
                      " L " + tl.margin2.left + " " + tri.ttly +
                      " Z")
            .attr("class", "contextArrowhead")
            .on("click", function () { arrowZoom(-1); });
        tl.deco.append("path")  //right arrow
            .attr("d", "M " + tri.rightmost + " " + tri.midy +
                      " L " + rightx + " " + tl.margin2.top +
                      " L " + rightx + " " + tri.ttly +
                      " Z")
            .attr("class", "contextArrowhead")
            .on("click", function () { arrowZoom(1); });
        tl.deco.append("path")
            .attr("d", "M " + tl.margin2.left + " " + tri.midy +
                      " L " + rightx + " " + tri.midy +
                      " Z")
            .attr("class", "contextMidline");
    }


    function fillColorForPoint (pt) {
        var oldest, now;
        if(!tl.heat) {
            oldest = jt.isoString2Time(app.oldestVisit);
            now = jt.isoString2Time();
            tl.heat = d3.scaleTime()
                .domain([oldest, now])
                .range([d3.rgb("#0000FF"), d3.rgb("#FF0000")])
                .interpolate(d3.interpolateHcl);
            // console.log("oldest: " + oldest + ": " + tl.heat(oldest));
            // console.log("   now: " + now + ": " + tl.heat(now));
            }
        if(!app.mode.ptmatch(pt)) {
            return "#ccc"; }
        if(pt.visited) {
            return tl.heat(jt.isoString2Time(pt.visited)); }
        return "#000";
    }


    function overCircle (d, over) {
        if(over) {
            tl.focus.select("#" + d.id)
                .style("fill", "#f00");
            tl.focus.select("#mouseoverLabel")
                .attr("x", tl.x(d.tc))
                .attr("y", tl.y(d.oc + 1))
                .text(d.id); }
        else {
            tl.focus.select("#" + d.id)
                .style("fill", fillColorForPoint(d));
            tl.focus.select("#mouseoverLabel")
                .attr("x", 0)
                .attr("y", 0)
                .text(""); }
    }


    function markPointVisited (d) {
        d.visited = (new Date()).toISOString();
        tl.focus.select("#" + d.id)
            .style("fill", fillColorForPoint(d));
        tl.pendingSaves = tl.pendingSaves || [];
        tl.pendingSaves.push(d);
    }


    function zoomToPoint (d) {
        var et = {fs:Math.round(0.3 * tl.height2), bpad:2};
        if(!tl.elevator) {
            et.g = d3.select(".brush");
            et.g.insert("text", "rect")
                .attr("class", "elevatortext")
                .attr("font-size", et.fs)
                .attr("x", Math.round(tl.width2 / 2))
                .attr("y", et.fs + et.bpad)
                .text("scroll: zoom");
            et.g.insert("text", "rect")
                .attr("class", "elevatortext")
                .attr("font-size", et.fs)
                .attr("x", Math.round(tl.width2 / 2))
                .attr("y", tl.height2 - et.bpad)
                .text("drag: pan"); }
        tl.sel = [tl.x2(d.tc) - Math.round(tl.width2 / 8),
                  tl.x2(d.tc) + Math.round(tl.width2 / 8)];
        tl.sel[0] = Math.max(tl.sel[0], 0);
        tl.sel[1] = Math.min(tl.sel[1], tl.width2);
        tl.svg.select(".zoom").transition().duration(2000).call(
            tl.zoom.transform,
            d3.zoomIdentity.scale(tl.width2 / (tl.sel[1] - tl.sel[0]))
                .translate(-tl.sel[0], 0));
    }


    function clickCircle (d) {
        zoomToPoint(d);
        markPointVisited(d);
        if(d.sv) {
            d.svo = app.lev.suppVisByCode(d.sv);
            if(!app[d.svo.module]) {
                jt.err("Not available yet. Point " + d.cid + " will be displayed as part of the " + d.svo.name + " supplemental visualization module.");
                return app.mode.start(tl); }
            app[d.svo.module].display(d.svo, tl, app.mode.nextQuiet); }
        else {
            app.dlg.info(d); }
    }


    function bindDataAndDrawChart () {
        tl.x.domain([tl.pts[0].tc - 20,  //avoid half dots at edges
                     tl.pts[tl.pts.length - 1].tc + 1]);
        tl.y.domain([0, app.data.maxy + 2]);  //avoid half dots at top
        tl.x2.domain(tl.x.domain());
        tl.y2.domain(tl.y.domain());
        tl.focus.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + tl.height + ")")
            .call(tl.xAxis);
        tl.context.selectAll("circle")
            .data(tl.pts)
            .enter().append("circle")
            .attr("class", "contextCircle")
            .attr("r", 3)
            .attr("cx", function(d) { return tl.x2(d.tc); })
            .attr("cy", function(d) { return tl.y2(d.oc); });
        tl.context.append("g")
            .attr("class", "brush")
            .call(tl.brush)
            .call(tl.brush.move, tl.x2.range());
        tl.focus.append("g")
            .attr("class", "axis axis--y")
            .call(tl.yAxis);
        tl.focus.selectAll("circle")
            .data(tl.pts)
            .enter().append("circle")
            .attr("r", 5)
            .attr("cx", function(d) { return tl.x(d.tc); })
            .attr("cy", function(d) { return tl.y(d.oc); })
            .attr("id", function(d) { return d.id; })
            .attr("fill", function(d) { return fillColorForPoint(d); })
            .attr("class", "focusCircle")
            .on("mouseover", function(d) { overCircle(d, true); })
            .on("mouseout", function(d) { overCircle(d, false); })
            .on("click", function(d) { clickCircle(d); });
        d3.select(".zoom").on("click", function () {
            app.picbg.click(d3.mouse(this)); });
        addFocusInteractiveElements();
        addContextDecorativeElements();
        adjustTickTextVisibility();
    }


    function initDisplayVariableValues () {
        var outdiv = jt.byId("rhcontentdiv");
        outdiv.style.width = String(tl.chart.w) + "px"; //show bg if big screen
        outdiv.style.height = String(tl.chart.h) + "px";
        outdiv.innerHTML = jt.tac2html(
            [["div", {id:"abgdiv", style:"left:10px;top:20px;width:" + 
                      (tl.chart.w - 20) + "px;"}],
             ["div", {id:"tcontdiv", style:"display:none;"}],
             ["div", {id:"lcontdiv"},
              ["svg", {id:"svgmain", width:tl.chart.w, height:tl.chart.h}]],
             ["div", {id:"leftcoldiv", style:"top:25px;width:10px;"}],
             ["div", {id:"navdiv"}],
             ["div", {id:"suppvisdiv"}],
             ["div", {id:"itemdispdiv"}, "hello"],
             ["div", {id:"menudiv"}]]);
        jt.makeDraggable("itemdispdiv");
        tl.svg = d3.select("#svgmain");
        tl.margin = {top: 20, right: 10, bottom: 60, left: 10};
        tl.margin.hpad = tl.margin.top + tl.margin.bottom;
        tl.margin.wpad = tl.margin.left + tl.margin.right;
        tl.margin.ttlh = tl.chart.h - tl.margin.hpad;
        tl.height = Math.round(0.9 * tl.margin.ttlh);
        tl.height2 = Math.round(0.08 * tl.margin.ttlh);
        tl.margin2 = {top: tl.margin.ttlh - tl.height2 + tl.margin.top + 10,
                      right: tl.margin.right + 10,
                      bottom: tl.margin.bottom,
                      left: tl.margin.left + 10};
        tl.width = tl.chart.w - tl.margin.wpad;
        tl.width2 = tl.chart.w - (tl.margin2.left + tl.margin2.right);
        tl.scaleheight = tl.height;
    }


    function initMainDisplayElements () {
        tl.x = d3.scalePow().exponent(10).range([0, tl.width]);
        tl.x2 = d3.scalePow().exponent(10).range([0, tl.width2]);
        tl.y = d3.scaleLinear().range([tl.height, 0]);
        tl.y2 = d3.scaleLinear().range([tl.height2, 0]);
        tl.xAxis = d3.axisBottom(tl.x).tickFormat(d3.format("d"));
        tl.xAxis2 = d3.axisBottom(tl.x2);
        tl.yAxis = d3.axisLeft(tl.y).tickFormat(function () { return ""; });
        tl.brush = d3.brushX()
            .extent([[0, 0], [tl.width2, tl.height2]])
            .on("brush end", brushed);
        tl.zoom = d3.zoom()
            .scaleExtent([1, Infinity])
            .translateExtent([[0, 0], [tl.width, tl.scaleheight]])
            .extent([[0, 0], [tl.width, tl.scaleheight]])
            .on("zoom", zoomed);
        tl.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", tl.width)
            .attr("height", tl.scaleheight);
        //set the covering left col div fallback if clipPath fails on FF
        d3.select("#leftcoldiv")
            .style("height", (tl.height - 8) + "px");
        d3.select("#abgdiv")
            .style("height", tl.height + "px");
        tl.svg.append("rect")
            .attr("class", "zoom")
            .attr("width", tl.width)
            .attr("height", tl.scaleheight)
            .attr("transform", "translate(" + tl.margin.left + "," + 
                                              tl.margin.top + ")")
            .call(tl.zoom);
        tl.focus = tl.svg.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(" + tl.margin.left + "," + 
                                              tl.margin.top + ")");
        tl.context = tl.svg.append("g")
            .attr("class", "context")
            .attr("transform", "translate(" + tl.margin2.left + "," + 
                                              tl.margin2.top + ")");
    }


    function display () {
        tl = {divid:"navdiv", offset:{x:10,y:10}, pts:app.data.pts, zscale:1};
        setChartWidthAndHeight();
        initDisplayVariableValues();
        initMainDisplayElements();
        app.mode.menu(false);
        app.picbg.init("abgdiv");
        bindDataAndDrawChart();
        app.mode.start(tl);
    }


    function search () {
        tl.focus.selectAll("circle")
            .attr("fill", function(d) { return fillColorForPoint(d); });
    }


    return {
        display: function () { display(); },
        clickCircle: function (pt) { clickCircle(pt); },
        levelCompleted: function (levpi) { app.levelup.display(tl, levpi); },
        search: function () { search(); },
        tldata: function () { return tl; },
        unzoom: function () { unzoom(); }
    };
}());