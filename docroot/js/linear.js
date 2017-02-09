/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.linear = (function () {
    "use strict";

    var tl; //timeline data object

    function setChartWidthAndHeight () {
        var over, minw = 320,      //full width of a standard phone
            rat = {w: 3, h: 2};    //default to nice 3:2 aspect ratio
        if(window.innerWidth < 600) {
            rat = {w: 2, h: 3}; }  //switch to long and tall (phone)
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


    function brushed () {
        var sel;
        if(d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") {
            return; } // ignore brush-by-zoom
        sel = d3.event.selection || tl.x2.range();
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
        tl.deco.append("path")
            .attr("d", "M " + tl.margin.left + " " + tri.midy +
                      " L " + tl.margin2.left + " " + tl.margin2.top +
                      " L " + tl.margin2.left + " " + tri.ttly +
                      " Z")
            .attr("class", "contextArrowhead");
        tl.deco.append("path")
            .attr("d", "M " + tri.rightmost + " " + tri.midy +
                      " L " + rightx + " " + tl.margin2.top +
                      " L " + rightx + " " + tri.ttly +
                      " Z")
            .attr("class", "contextArrowhead");
        tl.deco.append("path")
            .attr("d", "M " + tl.margin2.left + " " + tri.midy +
                      " L " + rightx + " " + tri.midy +
                      " Z")
            .attr("class", "contextMidline");
    }


    function fillColorForPoint (pt) {
        var oldest, now;
        if(!tl.heat) {
            oldest = jt.ISOString2Time(app.oldestVisit);
            now = jt.ISOString2Time();
            tl.heat = d3.scaleTime()
                .domain([oldest, now])
                .range([d3.rgb("#0000FF"), d3.rgb("#FF0000")])
                .interpolate(d3.interpolateHcl);
            // console.log("oldest: " + oldest + ": " + tl.heat(oldest));
            // console.log("   now: " + now + ": " + tl.heat(now));
            }
        if(pt.visited) {
            return tl.heat(jt.ISOString2Time(pt.visited)); }
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


    function displayDialog (d, html) {
        var dim, elem;
        if(tl.width < 500) {  //use full space on small devices
            dim = {x: tl.margin.left + Math.round(0.02 * tl.width),
                   y: tl.margin.top + Math.round(0.04 * tl.height),
                   w: Math.round(0.9 * tl.width),
                   h: Math.round(0.8 * tl.height)}; }
        else { //larger display tracks the point height for visual interest
            dim = {tracked: true,
                   x: tl.margin.left + Math.round(0.04 * tl.width),
                   y: tl.margin.top + Math.round(0.04 * tl.height),
                   w: Math.round(0.9 * tl.width)};
            if(d) {
                dim.y = tl.margin.top + tl.y(d.oc); }
            dim.h = Math.round(0.9 * tl.height) - dim.y; }
        d3.select("#itemdispdiv")
            .style("left", dim.x + "px")
            .style("top", dim.y + "px")
            .style("max-width", dim.w + "px")
            .style("max-height", dim.h + "px");
        jt.out("itemdispdiv", html);
        if(dim.tracked) {
            elem = jt.byId("itemdispdiv");
            if(elem.scrollHeight > elem.offsetHeight) {  //overflowed
                dim.y = tl.margin.top + Math.round(0.04 * tl.height);
                dim.h = Math.round(0.8 * tl.height);
                d3.select(".dlgtextdiv")
                    .style("max-height", Math.round(0.8 * dim.h) + "px");
                d3.select("#itemdispdiv")
                    .style("top", dim.y + "px")
                    .style("max-height", dim.h + "px"); } }
        d3.select("#itemdispdiv")
            .style("visibility", "visible")
            .style("max-height", "4px")
            .transition().duration(250)
            .style("max-height", dim.h + "px");
    }


    function getPointsForDisplay () {
        if(tl.fetchpoints) {
            app.lev.updateVisited(tl.fetchpoints); }
        tl.fetchpoints = app.lev.getNextPoints();
        tl.series = tl.fetchpoints.slice();  //working copy to chew up
    }


    function initSeriesAndStart () {
        var html;
        getPointsForDisplay();
        updateLevelDisplay();
        html = [["div", {cla: "dlgxdiv"},
                 ["a", {href: "#close", 
                        onclick: jt.fs("app.linear.closeDlg()")},
                  "X"]],
                ["div", {cla: "dlgtextdiv"},
                 ["div", {cla: "introdlgdiv"},
                  [["div", {cla: "titlediv"},
                    "American<br/>" + 
                    "Race<br/>" + 
                    "History<br/>" + 
                    "Navigable</br>" + 
                    "Timeline<br/>"],
                   ["div", {cla: "startdiv",
                            onclick: jt.fs("app.linear.next()")},
                    ["div", {cla: "startcontdiv"},
                     "Start"]]]]]];
        displayDialog(null, jt.tac2html(html));
    }


    function openInfoDialog (d) {
        var html;
        html = [["div", {cla: "dlgdatediv"}, d.date],
                ["div", {cla: "dlgxdiv"},
                 ["a", {href: "#close", 
                        onclick: jt.fs("app.linear.closeDlg()")},
                  "X"]],
                ["div", {cla: "dlgtextdiv"}, d.text],
                ["div", {cla: "buttondiv"},
                 ["button", {type: "button", id: "nextbutton",
                             onclick: jt.fs("app.linear.next()")},
                  "Next"]]];
        displayDialog(d, jt.tac2html(html));
        //setting focus the first time does not work for whatever
        //reason, but it helps for subsequent dialog displays.
        setTimeout(function () { jt.byId("nextbutton").focus(); }, 100);
    }


    function markPointVisited (d) {
        d.visited = (new Date()).toISOString();
        tl.focus.select("#" + d.id)
            .style("fill", fillColorForPoint(d));
        tl.pendingSaves = tl.pendingSaves || [];
        tl.pendingSaves.push(d);
    }


    function zoomToPoint (d) {
        var sel;
        sel = [tl.x2(d.tc) - Math.round(tl.width2 / 8),
               tl.x2(d.tc) + Math.round(tl.width2 / 8)];
        sel[0] = Math.max(sel[0], 0);
        sel[1] = Math.min(sel[1], tl.width2);
        tl.svg.select(".zoom").transition().duration(2000).call(
            tl.zoom.transform,
            d3.zoomIdentity.scale(tl.width2 / (sel[1] - sel[0]))
                .translate(-sel[0], 0));
    }


    function clickCircle (d) {
        zoomToPoint(d);
        markPointVisited(d);
        openInfoDialog(d);
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
        addFocusInteractiveElements();
        addContextDecorativeElements();
        adjustTickTextVisibility();
    }


    function initDisplayVariableValues () {
        var outdiv = jt.byId(app.dispdivid);
        outdiv.style.width = String(tl.chart.w) + "px"; //show bg if big screen
        outdiv.innerHTML = jt.tac2html(
            [["div", {id: "lcontdiv"},
              ["svg", {id: "svgmain", width: tl.chart.w, height: tl.chart.h}]],
             ["div", {id: "navdiv"},
              ["svg", {id: "svgnav", width: tl.chart.w, height: 30}]],
             ["div", {id: "itemdispdiv"}, "hello"]]);
        tl.progsvg = d3.select("#svgnav");
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
        tl = {offset: { x:10, y:10 }, pts: app.data.pts, zscale: 1};
        setChartWidthAndHeight();
        initDisplayVariableValues();
        initMainDisplayElements();
        bindDataAndDrawChart();
        initSeriesAndStart();
    }


    function closeDialog () {
        d3.select("#itemdispdiv")
            .style("visibility", "hidden");
    }


    function showSaveConfirmationDialog () {
        var html, subj, body, vps = "";
        subj = "Race History restore link";
        body = "Click this link to restore your browser state:\n" +
            "http://localhost:8080";
        tl.pts.forEach(function (pt) {
            if(pt.visited) {
                vps += "&" + pt.id + "=" + jt.enc(pt.visited); } });
        body += "?" + vps.slice(1);
        html = [["div", {cla: "dlgxdiv"},
                 ["a", {href: "#close", 
                        onclick: jt.fs("app.linear.closeDlg()")},
                  "X"]],
                ["div", {cla: "dlgtextdiv"},
                 [["div", {id: "dlgsavetitlediv"}, "Progress saved."],
                  ["div", {id: "dlgsavelinkdiv"},
                   ["a", {href: "mailto:?subject=" + jt.dquotenc(subj) + 
                                    "&body=" + jt.dquotenc(body)},
                    "Mail a Restore Link"]]]],
                ["div", {cla: "buttondiv"},
                 ["button", {type: "button", id: "nextbutton",
                             onclick: jt.fs("app.linear.next()")},
                  "Continue"]]];
        displayDialog(null, jt.tac2html(html));
    }


    function updateLevelDisplay () {
        var proginfo = app.lev.progInfo(),
            ti = {fs: 18,   //font size for level number
                  p: {t: 1, r: 2, b: 1, l: 2},  //padding top right bottom left
                  m: {t: 3, r: 2, b: 0, l: 3}}, //margin  top right bottom left
            tc = {x: ti.m.l + ti.p.l,
                  y: ti.m.t + ti.p.t + ti.fs,
                  h: ti.p.t + ti.fs + ti.p.b,
                  w: ti.p.l + ti.fs + ti.p.r},
            rc = {x: tc.x + tc.w + ti.m.r,
                  y: Math.floor(tc.h / 2),
                  h: Math.floor(tc.h / 4),
                  w: tl.width - (tc.x + tc.w)};
        if(!tl.prog) {
            tl.prog = tl.progsvg.append("g");
            tl.prog.append("rect")
                .attr("class", "levnumbackrect")
                .attr("ry", 5)
                .attr("x", tc.x - ti.p.l)
                .attr("y", ti.m.t)
                .attr("height", tc.h)
                .attr("width", tc.w);
            tl.prog.append("text")
                .attr("class", "levelnumber")
                .attr("text-anchor", "middle")  //variable width font
                .attr("x", ti.m.l + Math.round(tc.w / 2))
                .attr("y", tc.y - ti.p.t)
                .attr("dy", "-.1em")   //fudge text baseline
                .attr("font-size", ti.fs)
                .text(String(proginfo.level));
            tl.prog.append("rect")
                .attr("class", "progbarback")
                .attr("x", rc.x)
                .attr("y", rc.y)
                .attr("height", rc.h)
                .attr("width", rc.w);
            tl.prog.append("rect")
                .attr("class", "progbarfilled")
                .attr("id", "progdisprect")
                .attr("x", rc.x)
                .attr("y", rc.y)
                .attr("height", rc.h)
                .attr("width", 0); }
        d3.select("#progdisprect")
            .attr("width", Math.round(proginfo.levpcnt * rc.w));
    }


    function next () {
        var pt;
        closeDialog();
        if(!tl.series || !tl.series.length) {
            app.db.saveState();
            getPointsForDisplay();
            updateLevelDisplay();
            showSaveConfirmationDialog(); }
        else {
            pt = tl.series.pop();
            clickCircle(pt); }
    }


    return {
        display: function () { display(); },
        closeDlg: function () { closeDialog(); },
        next: function () { next(); }
    };
}());
