/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.linear = (function () {
    "use strict";

    var tl; //timeline data object

    //aim for a nice 3-2 aspect ratio scaling to the screen width
    // function setChartWidthAndHeight () {
    //     var over, minw = 320;  //full width of a standard phone
    //     tl.width = window.innerWidth - tl.offset.x;
    //     tl.height = Math.round((tl.width * 2) / 3);
    //     over = tl.height - window.innerHeight;
    //     if(over > 0) {  //blew the available height, squish vertically
    //         tl.width -= Math.round((over * 3) / 2);
    //         tl.height = Math.round((tl.width * 2) / 3); }
    //     if(tl.width < minw) {  //underflowed minimum phone width, re-expand
    //         tl.width = minw;
    //         tl.height = Math.round((tl.width * 2) / 3); }
    //     jt.byId(app.displaydiv).style.width = String(tl.width) + "px";
    // }


    function brushed () {
        var sel;
        if(d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") {
            return; } // ignore brush-by-zoom
        sel = d3.event.selection || tl.x2.range();
        tl.x.domain(sel.map(tl.x2.invert, tl.x2));
        tl.focus.select(".area").attr("d", tl.area);
        tl.focus.select(".axis--x").call(tl.xAxis);
        tl.svg.select(".zoom").call(
            tl.zoom.transform, 
            d3.zoomIdentity.scale(tl.width / (sel[1] - sel[0]))
                .translate(-sel[0], 0));
    }

    function zoomed () {
        var tran;
        if(d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") {
            return; } // ignore zoom-by-brush
        tran = d3.event.transform;
        tl.x.domain(tran.rescaleX(tl.x2).domain());
        tl.focus.select(".area").attr("d", tl.area);
        tl.focus.select(".axis--x").call(tl.xAxis);
        tl.context.select(".brush").call(
            tl.brush.move, tl.x.range().map(tran.invertX, tran));
    }


    function bindDataAndDrawChart () {
        tl.x.domain([tl.pts[0].tc, tl.pts[tl.pts.length - 1].tc]);
        tl.y.domain([0, app.data.maxy]);
        tl.x2.domain(tl.x.domain());
        tl.y2.domain(tl.y.domain());
        tl.focus.append("path")
            .datum(tl.pts)
            .attr("class", "area")
            .attr("d", tl.area);
        tl.focus.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + tl.height + ")")
            .call(tl.xAxis);
        tl.focus.append("g")
            .attr("class", "axis axis--y")
            .call(tl.yAxis);
        tl.context.append("path")
            .datum(tl.pts)
            .attr("class", "area")
            .attr("d", tl.area2);
        tl.context.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + tl.height2 + ")")
            .call(tl.xAxis2);
        tl.context.append("g")
            .attr("class", "brush")
            .call(tl.brush)
            .call(tl.brush.move, tl.x.range());
        tl.svg.append("rect")
            .attr("class", "zoom")
            .attr("width", tl.width)
            .attr("height", tl.height)
            .attr("transform", "translate(" + tl.margin.left + "," + tl.margin.top + ")")
            .call(tl.zoom);
    }


    function display () {
        var outdiv = jt.byId(app.dispdivid);
        outdiv.innerHTML = jt.tac2html(
            ["div", {id: "lcontdiv"},
             ["svg", {width: 960, height: 500}]]);
        tl = {offset: { x:30, y:20 }, pts: app.data.pts};
        //setChartWidthAndHeight();
        tl.svg = d3.select("svg");
        tl.margin = {top: 20, right: 20, bottom: 110, left: 40};
        tl.margin2 = {top: 430, right: 20, bottom: 30, left: 40};
        tl.width = +tl.svg.attr("width") - tl.margin.left - tl.margin.right;
        tl.height = +tl.svg.attr("height") - tl.margin.top - tl.margin.bottom;
        tl.height2 = +tl.svg.attr("height") - tl.margin2.top - tl.margin2.bottom;
        tl.x = d3.scaleLinear().range([0, tl.width]);
        tl.x2 = d3.scaleLinear().range([0, tl.width]);
        tl.y = d3.scaleLinear().range([tl.height, 0]);
        tl.y2 = d3.scaleLinear().range([tl.height2, 0]);
        tl.xAxis = d3.axisBottom(tl.x);
        tl.xAxis2 = d3.axisBottom(tl.x2);
        tl.yAxis = d3.axisLeft(tl.y);
        tl.brush = d3.brushX()
            .extent([[0, 0], [tl.width, tl.height2]])
            .on("brush end", brushed);
        tl.zoom = d3.zoom()
            .scaleExtent([1, Infinity])
            .translateExtent([[0, 0], [tl.width, tl.height]])
            .extent([[0, 0], [tl.width, tl.height]])
            .on("zoom", zoomed);
        tl.area = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function(d) { return tl.x(d.tc); })
            .y0(tl.height)
            .y1(function(d) { return tl.y(d.oc); });
        tl.area2 = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function(d) { return tl.x2(d.tc); })
            .y0(tl.height2)
            .y1(function(d) { return tl.y2(d.oc); });
        tl.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", tl.width)
            .attr("height", tl.height);
        tl.focus = tl.svg.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(" + tl.margin.left + "," + tl.margin.top + ")");
        tl.context = tl.svg.append("g")
            .attr("class", "context")
            .attr("transform", "translate(" + tl.margin2.left + "," + tl.margin2.top + ")");
        bindDataAndDrawChart();
    }


    return {
        display: function () { display(); }
    };
}());
