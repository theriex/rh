/*jslint browser, multivar, white, fudge, this, for */
/*global app, window, jt, d3 */

app.linear = (function () {
    "use strict";

    var tl, //timeline data object
        wall; //pic wallpaper variables

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
            .attr("cy", function(d) { return tl.y(d.vc); });
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
        var fc, now = jt.isoString2Time();  //use ISO Z time (no time zone)
        if(!tl.vrng) {
            tl.vrng = {start:now, end:0};
            tl.pts.forEach(function (pt) {
                var dt;
                if(pt.isoShown) {
                    dt = jt.isoString2Time(pt.isoShown);
                    if(dt < tl.vrng.start) {
                        tl.vrng.start = dt; }
                    if(!tl.vrng.end || dt > tl.vrng.end) {
                        tl.vrng.end = dt; } } });
            jt.log("tl.vrng: " + tl.vrng.start + " to " + tl.vrng.end); }
        if(!tl.heat) {
            tl.test = d3.scaleTime()
                .domain([tl.vrng.start, tl.vrng.end])
                .range([0, 100]);
            tl.heat = d3.scaleTime()
                .domain([tl.vrng.start, tl.vrng.end])
                .range([d3.rgb("#005eff"), d3.rgb("#FF7200")])
                .interpolate(d3.interpolateRgb);
            jt.log("tl.heat: " + tl.heat(tl.vrng.start) + " to " + 
                   tl.heat(tl.vrng.end)); }
        if(pt.isoShown) {
            fc = tl.heat(jt.isoString2Time(pt.isoShown));
            //jt.log("pt " + pt.instid + " " + fc);
            return fc; }
        return "#000";
    }


    function overCircle (d, over) {
        if(over) {
            tl.focus.select("#" + d.id)
                .style("fill", "#f00");
            //jt.log("overCircle x: " + tl.x(d.tc) + ", y: " + tl.y(d.vc + 1));
            //jt.log("overCircle d.vc: " + d.vc);
            tl.focus.select("#mouseoverLabel")
                .attr("x", tl.x(d.tc))
                .attr("y", tl.y(d.vc) - 14)  //above circle
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
        d.isoShown = (new Date()).toISOString();
        tl.focus.select("#" + d.id)
            .style("fill", fillColorForPoint(d));
    }


    function zoomToPoint (d) {
        var et = {fs:Math.round(0.3 * tl.height2), bpad:2};
        if(!d) {
            jt.log("linear.zoomToPoint given null");
            return; }
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
        app.dlg.info(d);
    }


    function byPtId (refid, srcid) {
        var i;
        for(i = 0; i < tl.pts.length; i += 1) {
            if(tl.pts[i].instid === srcid) {
                app.db.unvisitPoint(tl.pts[i]);
                app.mode.requeue(tl.pts[i]);
                break; } }
        for(i = 0; i < tl.pts.length; i += 1) {
            if(tl.pts[i].instid === refid) {
                return clickCircle(tl.pts[i]); } }
        jt.log("byPtId " + refid + " not found.");
    }


    function handlePicMouseClick (mouseinfo) {
        var mx = mouseinfo[0],
            my = mouseinfo[1],
            pb = {x: Math.floor(wall.grid.x * (mx / wall.dd.w)),
                  y: Math.floor(wall.grid.y * (my / wall.dd.h))},
            pt = wall.selpts[(pb.y * wall.grid.x) + pb.x];
        app.dlg.info(pt);
    }


    function bindDataAndDrawChart () {
        var dcon = app.db.displayContext();
        tl.x.domain([tl.pts[0].tc, tl.pts[tl.pts.length - 1].tc]);
        tl.y.domain([0, 2 * dcon.ctx.maxy]);
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
            .attr("cy", function(d) { return tl.y2(d.vc); });
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
            .attr("cy", function(d) { return tl.y(d.vc); })
            .attr("id", function(d) { return d.id; })
            .attr("fill", function(d) { return fillColorForPoint(d); })
            .attr("class", "focusCircle")
            .on("mouseover", function(d) { overCircle(d, true); })
            .on("mouseout", function(d) { overCircle(d, false); })
            .on("click", function(d) { clickCircle(d); });
        d3.select(".zoom").on("click", function () {
            handlePicMouseClick(d3.mouse(this)); });
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
        //Making the div draggable disables selecting text, which is annoying
        //when editing and copying text for search.
        //jt.makeDraggable("itemdispdiv");
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
        // tl.x = d3.scalePow().exponent(10).range([5, tl.width - 10]);
        // tl.x2 = d3.scalePow().exponent(10).range([0, tl.width2]);
        tl.x = d3.scaleLinear().range([8, tl.width - 16]);
        tl.x2 = d3.scaleLinear().range([0, tl.width2]);
        tl.y = d3.scaleLinear().range([tl.height - 16, 8]);
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


    function paintWallpaper (divid) {
        var html, picpts = [], grid, idx, div, sd, cs, i, j;
        wall = {selpts:[]};
        tl.pts.forEach(function (pt) {
            if(pt.pic) {
                picpts.push(pt); } });
        if(picpts.length >= 60)      { grid = {x:10, y:6}; }
        else if(picpts.length >= 40) { grid = {x:8, y:5}; }
        else if(picpts.length >= 24) { grid = {x:6, y:4}; }
        else if(picpts.length >= 12) { grid = {x:4, y:3}; }
        else { jt.log("Not enough pic points to display. " + picpts.length +
                     " of " + tl.pts.length + "."); return; }
        while(wall.selpts.length < (grid.x * grid.y)) {
            idx = Math.floor(Math.random() * picpts.length);
            wall.cand = picpts.splice(idx, 1)[0];
            if(wall.selpts.every(pt => pt.instid !== wall.cand.instid)) {
                wall.selpts.push(wall.cand); } }
        div = jt.byId(divid);
        wall.dd = {w:div.offsetWidth, h:div.offsetHeight};
        if(wall.dd.h > wall.dd.w) {  //invert grid to be tall instead of wide
            grid = {x:grid.y, y:grid.x}; }
        sd = {w: Math.floor(wall.dd.w / grid.x), wm: (wall.dd.w % grid.x) - 1,
              h: Math.floor(wall.dd.h / grid.y), hm: (wall.dd.h % grid.y) - 1};
        cs = {w: 0, h: 0};
        html = [];
        for(i = 0; i < grid.y; i += 1) {
            for(j = 0; j < grid.x; j += 1) {
                cs.w = sd.w;
                if(j < sd.wm) {
                    cs.w += 1; }
                cs.h = sd.h;
                if(i < sd.hm) {
                    cs.h += 1; }
                idx = (i * grid.x) + j;
                html.push(
                    ["div", {id:"pdx" + j + "y" + i, cla:"bgpicdiv",
                             style:"width:" + cs.w + "px;" +
                                   "height:" + cs.h + "px;"},
                     ["img", {src: "/ptpic?pointid=" + wall.selpts[idx].instid,
                              cla: "bgpicimg",
                              style: "max-width:" + cs.w + "px;" +
                                     "max-height:" + cs.h + "px;"}]]); } }
        jt.out(divid, jt.tac2html(html));
        wall.grid = grid;
    }


    function display (currlev) {
        tl = {divid:"navdiv", offset:{x:10,y:10}, zscale:1,
              pts:app.db.displayContext().points};
        setChartWidthAndHeight();
        initDisplayVariableValues();
        initMainDisplayElements();
        paintWallpaper("abgdiv");
        if(!tl.pts || tl.pts.length < 2) {
            jt.err("Timeline requires at least two points to display"); }
        else {
            bindDataAndDrawChart(); }
        app.mode.start(tl, currlev);
    }


    return {
        display: function (currlev) { display(currlev); },
        clickCircle: function (pt) { clickCircle(pt); },
        byPtId: function (refid, srcid) { byPtId(refid, srcid); },
        levelCompleted: function (levpi) { app.levelup.display(tl, levpi); },
        tldata: function () { return tl; },
        unzoom: function () { unzoom(); },
        timeline: function () { return tl; }
    };
}());
