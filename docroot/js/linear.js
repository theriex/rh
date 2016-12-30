/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.linear = (function () {
    "use strict";

    var tl; //timeline data object

    //aim for a nice 3-2 aspect ratio scaling to the screen width
    function setChartWidthAndHeight () {
        var over, minw = 320;  //full width of a standard phone
        tl.chart = {w: 0, h: 0};
        tl.chart.w = window.innerWidth - tl.offset.x;
        tl.chart.h = Math.round((tl.chart.w * 2) / 3);
        over = tl.chart.h - window.innerHeight;
        if(over > 0) {  //blew the available height, squish vertically
            tl.chart.w -= Math.round((over * 3) / 2);
            tl.chart.h = Math.round((tl.chart.w * 2) / 3); }
        if(tl.chart.w < minw) {  //underflowed minimum phone width, re-expand
            tl.chart.w = minw;
            tl.chart.h = Math.round((tl.chart.w * 2) / 3); }
    }


    function redraw () {
        tl.focus.select(".axis--x").call(tl.xAxis);
        tl.focus.selectAll("circle")
            .attr("cx", function(d) { return tl.x(d.tc); })
            .attr("cy", function(d) { return tl.y(d.oc); });
    }


    function brushed () {
        var sel;
        if(d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") {
            return; } // ignore brush-by-zoom
        sel = d3.event.selection || tl.x2.range();
        tl.x.domain(sel.map(tl.x2.invert, tl.x2));
        redraw();
        tl.svg.select(".zoom").call(
            tl.zoom.transform, 
            d3.zoomIdentity.scale(tl.width / (sel[1] - sel[0]))
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
            tl.brush.move, tl.x.range().map(tran.invertX, tran));
    }


    function bindDataAndDrawChart () {
        tl.x.domain([tl.pts[0].tc - 20,  //avoid half dots at edges
                     tl.pts[tl.pts.length - 1].tc + 1]);
        tl.y.domain([0, app.data.maxy + 2]);  //avoid half dots at top
        tl.x2.domain(tl.x.domain());
        tl.y2.domain(tl.y.domain());
        tl.focus.selectAll("circle")
            .data(tl.pts)
            .enter().append("circle")
            .attr("r", 5)
            .attr("cx", function(d) { return tl.x(d.tc); })
            .attr("cy", function(d) { return tl.y(d.oc); });
        tl.focus.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + tl.height + ")")
            .call(tl.xAxis);
        tl.focus.append("g")
            .attr("class", "axis axis--y")
            .call(tl.yAxis);
        tl.context.selectAll("circle")
            .data(tl.pts)
            .enter().append("circle")
            .attr("class", "contextCircle")
            .attr("r", 3)
            .attr("cx", function(d) { return tl.x2(d.tc); })
            .attr("cy", function(d) { return tl.y2(d.oc); });
        // tl.context.append("g")
        //     .attr("class", "axis axis--x")
        //     .attr("transform", "translate(0," + tl.height2 + ")")
        //     .call(tl.xAxis2);
        tl.context.append("g")
            .attr("class", "brush")
            .call(tl.brush)
            .call(tl.brush.move, tl.x.range());
        tl.svg.append("rect")
            .attr("class", "zoom")
            .attr("width", tl.width)
            .attr("height", tl.scaleheight)
            .attr("transform", "translate(" + tl.margin.left + "," + 
                                              tl.margin.top + ")")
            .call(tl.zoom);
        adjustTickTextVisibility();
    }


    function display () {
        var outdiv = jt.byId(app.dispdivid);
        tl = {offset: { x:10, y:10 }, pts: app.data.pts, zscale: 1};
        setChartWidthAndHeight();
        outdiv.style.width = String(tl.chart.w) + "px"; //show bg if big screen
        outdiv.innerHTML = jt.tac2html(
            ["div", {id: "lcontdiv"},
             ["svg", {width: tl.chart.w, height: tl.chart.h}]]);
        tl.svg = d3.select("svg");
        tl.margin = {top: 20, right: 20, bottom: 60, left: 30};
        tl.margin.hpad = tl.margin.top + tl.margin.bottom;
        tl.margin.wpad = tl.margin.left + tl.margin.right;
        tl.height = tl.chart.h - tl.margin.hpad;
        tl.vth = Math.round((tl.chart.h - tl.margin.hpad) / app.data.maxy);
        tl.height2 = (app.data.ybump - 1) * tl.vth;
        tl.margin2 = {top: (tl.height - tl.height2) + Math.round(0.9 * tl.vth),
                      right: tl.margin.right,
                      bottom: tl.margin.bottom,
                      left: tl.margin.left};
        tl.width = tl.chart.w - tl.margin.wpad;
        tl.scaleheight = tl.height - tl.height2;

        tl.x = d3.scalePow().exponent(10).range([0, tl.width]);
        tl.x2 = d3.scalePow().exponent(10).range([0, tl.width]);
        tl.y = d3.scaleLinear().range([tl.height, 0]);
        tl.y2 = d3.scaleLinear().range([tl.height2, 0]);
        tl.xAxis = d3.axisBottom(tl.x).tickFormat(d3.format("d"));
        tl.xAxis2 = d3.axisBottom(tl.x2);
        tl.yAxis = d3.axisLeft(tl.y).tickFormat(function (d) { return ""; });
        tl.brush = d3.brushX()
            .extent([[0, 0], [tl.width, tl.height2]])
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
        tl.focus = tl.svg.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(" + tl.margin.left + "," + 
                                              tl.margin.top + ")");
        tl.context = tl.svg.append("g")
            .attr("class", "context")
            .attr("transform", "translate(" + tl.margin2.left + "," + 
                                              tl.margin2.top + ")");
        bindDataAndDrawChart();
    }


    return {
        display: function () { display(); }
    };
}());
