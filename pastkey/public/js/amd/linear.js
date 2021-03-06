/*jslint browser, white, fudge, this, for */
/*global app, window, jt, d3 */

app.linear = (function () {
    "use strict";

    var tl; //timeline data object
    var wall; //pic wallpaper variables

    function setChartWidthAndHeight () {
        var over; var minw = 320;  //full width of a standard phone
        var rat = {w: 3, h: 2};    //default to nice 3:2 aspect ratio
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
        tl.pts.forEach(function (pt) {
            d3.select("#lp" + pt.dsId)
                .attr("x1", tl.x(pt.tc))
                .attr("x2", tl.x(pt.tc)); });
        d3.select("#centerline")
            .attr("x1", tl.x(tl.pts[0].tc))
            .attr("x2", tl.x(tl.pts[tl.pts.length - 1].tc));
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


    function addFocusDecorativeElements () {
        var pa = tl.pts[0]; var pz = tl.pts[tl.pts.length - 1];
        //add a text element to use during mouseover on circles
        tl.focus.append("text")
            .attr("id", "mouseoverLabel")
            .attr("text-anchor", "middle")
            .attr("x", 0)
            .attr("y", 0)
            .text("");
        //add lollipop stick lines connecting all points to center line
        //tl.focus.selectAll("line") doesn't work, lines not first class
        tl.pts.forEach(function (pt) {
            tl.focus.append("line")
                .attr("class", "lpline")
                .attr("id", "lp" + pt.dsId)
                .attr("x1", tl.x(pt.tc))
                .attr("y1", tl.y(pt.vc))
                .attr("x2", tl.x(pt.tc))
                .attr("y2", tl.y(pa.vc))
                .style("stroke", "black")
                .style("fill", "black"); });
        //add a line connecting the first point (always vertically centered)
        //and where the last point would be if it were vertically centered.
        tl.focus.append("line")
            .attr("id", "centerline")
            .attr("x1", tl.x(pa.tc))
            .attr("y1", tl.y(pa.vc))
            .attr("x2", tl.x(pz.tc))
            .attr("y2", tl.y(pa.vc))
            .style("stroke", "black")
            .style("fill", "black");
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
                     y: tl.margin2.top + Math.round(0.64 * tl.height2)};
        var rightx = tl.margin2.left + tl.width2;
        var tri = {midy: tl.margin2.top + Math.round(0.5 * tl.height2),
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


    function chromacoding () {  //heat color values for elapsed human time
        var hc = {dcon:app.db.displayContext(),
                  oldest:new Date().toISOString()};
        if(app.user && app.user.acc && app.user.acc.started) {
            app.user.acc.started.forEach(function (st) {
                if(st.pts && st.tlid === hc.dcon.tlid) {
                    st.pts.csvarray().forEach(function (ps) {
                        var prog = app.db.parseProgStr(ps);
                        if(prog.isoClosed < hc.oldest) {
                            hc.oldest = prog.isoClosed; } }); } }); }
        //going with the fast color changes since most timelines are short
        //and it looks ok even for the long one.  Was previously using 5,
        //30, 24*60, 7*24*60 minutes.
        hc.buckets = [
            {name:"1min",   tdm:1,       cool:"#ffdd26", hot:"#ff7200"},
            {name:"2min",   tdm:2,       cool:"#00fe74", hot:"#deef82"},
            {name:"3min",   tdm:3,       cool:"#00d5fe", hot:"#00fe74"},
            {name:"4min",   tdm:4,       cool:"#0000ff", hot:"#00d5fe"}];
        return hc;
    }


    function updateChromaTimescale (hc) {
        var now = jt.isoString2Time();  //microseconds can bump outside range
        var window;
        if(hc && hc.upd && now.getTime() - hc.upd.getTime() < 30 * 1000) {
            return; }  //still fresh enough
        hc.upd = now;
        hc.newest = now.toISOString();
        window = {start:now};
        hc.buckets.forEach(function (bu) {
            window.end = window.start;
            window.start = new Date(window.end.getTime() - bu.tdm * 60 * 1000);
            bu.start = window.start.toISOString();
            hc.oldest = bu.start;
            bu.end = window.end.toISOString();
            bu.st = d3.scaleTime()
                .domain([window.start, window.end])
                .range([d3.rgb(bu.cool), d3.rgb(bu.hot)])
                .interpolate(d3.interpolateRgb); });
        app.linear.recolorPoints();
    }


    function fillColorForDate (date) {
        var fc = "#000"; var dstr;
        if(typeof date === "string") {
            date = jt.isoString2Time(date); }
        dstr = date.toISOString();
        tl.hc.buckets.forEach(function (bu) {
            //ok if a borderline case updates again from later bucket
            if(dstr <= bu.end && dstr >= bu.start) {
                fc = bu.st(date); } });
        return fc;
    }


    function fillColorForPoint (pt) {
        var fc = "#000"; var shown;
        if(!tl.hc) {
            tl.hc = chromacoding(); }
        updateChromaTimescale(tl.hc);
        if(pt.isoShown) {
            shown = pt.isoShown;
            if(shown > tl.hc.newest) {
                shown = tl.hc.newest; }
            if(shown < tl.hc.oldest) {
                shown = tl.hc.oldest; }
            fc = fillColorForDate(jt.isoString2Time(shown)); }
        return fc;
    }


    // function testChromaBuckets () {
    //     var now = Date.now();
    //     tl.hc.tests = [new Date(now - 1*60*1000),         //5 minutes
    //                    new Date(now - 2*60*1000),
    //                    new Date(now - 3*60*1000),
    //                    new Date(now - 4*60*1000),
    //                    new Date(now - 5*60*1000),
    //                    new Date(now - 10*60*1000),        //30 minutes
    //                    new Date(now - 15*60*1000),
    //                    new Date(now - 20*60*1000),
    //                    new Date(now - 25*60*1000),
    //                    new Date(now - 30*60*1000),
    //                    new Date(now - 1*60*60*1000),      //hours
    //                    new Date(now - 2*60*60*1000),
    //                    new Date(now - 6*60*60*1000),
    //                    new Date(now - 12*60*60*1000),
    //                    new Date(now - 18*60*60*1000),
    //                    new Date(now - 24*60*60*1000),
    //                    new Date(now - 2*24*60*60*1000),   //days
    //                    new Date(now - 3*24*60*60*1000),
    //                    new Date(now - 4*24*60*60*1000),
    //                    new Date(now - 5*24*60*60*1000),
    //                    new Date(now - 6*24*60*60*1000)];
    //     tl.hc.tests.forEach(function (date, idx) {
    //         var pt = tl.pts[idx], color;
    //         color = fillColorForDate(date);
    //         tl.focus.select("#" + pt.id)
    //             .style("fill", color); });
    // }


    function recolorPoints () {
        tl.pts.forEach(function (pt) {
            tl.focus.select("#" + pt.id)
                .style("fill", fillColorForPoint(pt)); });
    }
            

    function highlightPoint (d, highlight) {
        if(highlight) {
            tl.focus.select("#" + d.id)
                .style("fill", "#f00"); }
        else {
            tl.focus.select("#" + d.id)
                .style("fill", fillColorForPoint(d)); }
    }


    function overCircle (d, over) {
        if(over) {
            highlightPoint(d, true);
            //jt.log("overCircle x: " + tl.x(d.tc) + ", y: " + tl.y(d.vc + 1));
            //jt.log("overCircle d.vc: " + d.vc);
            tl.focus.select("#mouseoverLabel")
                .attr("x", tl.x(d.tc))
                .attr("y", tl.y(d.vc) - 14)  //above circle
                .text(jt.ellipsis(d.text, 40)); }
        else {
            highlightPoint(d, false);
            tl.focus.select("#mouseoverLabel")
                .attr("x", 0)
                .attr("y", 0)
                .text(""); }
    }


    function markPointVisited (d) {
        d.isoShown = (new Date()).toISOString();
        //let mode.next handle the highlighting
        //highlightPoint(d, false);
    }


    function zoomToPoint (d) {
        var zd = 4; //zoom divisor: 1/d === elevator width
        if(!d) {
            jt.log("linear.zoomToPoint given null");
            return; }
        tl.sel = [tl.x2(d.tc) - Math.round(tl.width2 / zd),
                  tl.x2(d.tc) + Math.round(tl.width2 / zd)];
        tl.sel[0] = Math.max(tl.sel[0], 0);
        tl.sel[1] = Math.min(tl.sel[1], tl.width2);
        tl.svg.select(".zoom").transition().duration(2000).call(
            tl.zoom.transform,
            d3.zoomIdentity.scale(tl.width2 / (tl.sel[1] - tl.sel[0]))
                .translate(-tl.sel[0], 0));
    }


    function clickCircle (d, inter) {
        var currpt = app.mode.currpt();
        if(currpt && !inter) {  //return to current interactive point after
            app.db.unvisitPoint(currpt);
            app.mode.requeue(currpt); }
        zoomToPoint(d);
        markPointVisited(d);
        app.dlg.info(d, inter);
    }


    function byPtId (refid, srcid) {
        var i;
        //find the current point and put it back on the stack to return to it.
        //unless it was already closed (like if following a link off a link)
        for(i = 0; i < tl.pts.length; i += 1) {
            if(tl.pts[i].dsId === srcid) {
                if(!tl.pts[i].isoClosed) {
                    app.db.unvisitPoint(tl.pts[i]);
                    app.mode.requeue(tl.pts[i]); }
                break; } }
        for(i = 0; i < tl.pts.length; i += 1) {
            if(tl.pts[i].dsId === refid) {
                return clickCircle(tl.pts[i]); } }
        jt.log("byPtId " + refid + " not found.");
    }


    function handlePicMouseClick (mouseinfo) {
        var mx = mouseinfo[0];
        var my = mouseinfo[1];
        var pb = {x: Math.floor(wall.grid.x * (mx / wall.dd.w)),
                  y: Math.floor(wall.grid.y * (my / wall.dd.h))};
        var pt = wall.selpts[(pb.x * wall.grid.y) + pb.y];
        var currpt = app.mode.currpt();
        if(currpt) {  //return to current interactive point after
            app.db.unvisitPoint(currpt);
            app.mode.requeue(currpt); }
        app.dlg.info(pt);
    }


    function addPointDescriptions () {
        tl.pts.forEach(function (d) {
            tl.defs.append("desc")
                .attr("id", "desc" + d.id)
                .text(d.text); });
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
        addFocusDecorativeElements();  //lines underneath circles..
        tl.focus.selectAll("circle")
            .data(tl.pts)
            .enter().append("circle")
            .attr("r", 5)
            .attr("cx", function(d) { return tl.x(d.tc); })
            .attr("cy", function(d) { return tl.y(d.vc); })
            .attr("id", function(d) { return d.id; })
            .attr("fill", function(d) { return fillColorForPoint(d); })
            .attr("class", "focusCircle")
            .attr("aria-describedby", function(d) { return "desc" + d.id; })
            .on("mouseover", function(d) { overCircle(d, true); })
            .on("mouseout", function(d) { overCircle(d, false); })
            .on("click", function(d) { clickCircle(d); });
        d3.select(".zoom").on("click", function () {
            handlePicMouseClick(d3.mouse(this)); });
        addContextDecorativeElements();
        addPointDescriptions();
        adjustTickTextVisibility();
        //testChromaBuckets();
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
             //circles can overflow the background when zooming, leftcoldiv
             //hides that overflow which otherwise can look sloppy.
             ["div", {id:"leftcoldiv", style:"top:25px;width:10px;"}],
             ["div", {id:"navdiv"}],
             ["div", {id:"suppvisdiv"}],
             ["div", {id:"itemdispdiv"}],
             ["div", {id:"popupdiv"}],
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
        tl.defs = tl.svg.append("defs");
        tl.defs.append("clipPath")
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


    function candidateNotOnWall (wall) {  //lint factoring..
        return wall.selpts.every((pt) => pt.dsId !== wall.cand.dsId);
    }


    function selectWallpaperPoints () {
        var picpts = []; var grid; var idx;
        wall = {selpts:[]};
        tl.pts.forEach(function (pt) {
            if(pt.pic) {
                picpts.push(pt); } });
        if(picpts.length >= 60)      { grid = {x:10, y:6}; }
        else if(picpts.length >= 40) { grid = {x:8, y:5}; }
        else if(picpts.length >= 24) { grid = {x:6, y:4}; }
        else if(picpts.length >= 12) { grid = {x:4, y:3}; }
        else if(picpts.length >= 9) { grid = {x:3, y:3}; }
        else if(picpts.length >= 6) { grid = {x:3, y:2}; }
        else if(picpts.length >= 4) { grid = {x:2, y:2}; }
        else if(picpts.length >= 2) { grid = {x:2, y:1}; }
        else if(picpts.length >= 1) { grid = {x:1, y:1}; }
        else { 
            jt.log("Not enough points with pics to make wallpaper. " +
                   picpts.length + " of " + tl.pts.length + ".");
            return false;}
        while(wall.selpts.length < (grid.x * grid.y)) {
            idx = Math.floor(Math.random() * picpts.length);
            wall.cand = picpts.splice(idx, 1)[0];
            if(candidateNotOnWall(wall)) {
                wall.selpts.push(wall.cand); } }
        wall.selpts.sort(app.db.compareStartDate);  //put in chrono order
        wall.grid = grid;
        return true;
    }


    function determineWallpaperDimensions (divid) {
        var div = jt.byId(divid);
        //wall display dimensions
        wall.dd = {w:div.offsetWidth, h:div.offsetHeight};
        if(wall.dd.h > wall.dd.w) {  //invert grid to be tall instead of wide
            wall.grid = {x:wall.grid.y, y:wall.grid.x}; }
        //wall standard dimensions
        wall.sd = {w: Math.floor(wall.dd.w / wall.grid.x), 
                   h: Math.floor(wall.dd.h / wall.grid.y)};
    }


    function paintWallpaper (divid) {
        var html = []; var i; var j; var idx;
        if(!selectWallpaperPoints()) {
            return; }  //nothing to make wallpaper out of
        determineWallpaperDimensions(divid);
        //fill top to bottom, then left to right (earlier points leftwards)
        //jt.log("wall.grid.x: " + wall.grid.x + ", y: " + wall.grid.y);
        for(i = 0; i < wall.grid.y; i += 1) {
            for(j = 0; j < wall.grid.x; j += 1) {
                idx = (j * wall.grid.y) + i;
                //jt.log("i: " + i + ", j: " + j + ", idx: " + idx);
                html.push(
                    ["div", {id:"pdx" + i + "y" + j, cla:"bgpicdiv",
                             style:"width:" + wall.sd.w + "px;" +
                                   "height:" + wall.sd.h + "px;"},
                     ["img", {src: app.ptimgsrc(wall.selpts[idx]),
                              cla: "bgpicimg",
                              style: "max-width:" + wall.sd.w + "px;" +
                                     "max-height:" + wall.sd.h + "px;" +
                                     //Safari inconsistent image top...
                                     "vertical-align:top;"}]]); } }
        jt.out(divid, jt.tac2html(html));
        //jt.log("wallpaper painted");
    }


    function display (currlev) {
        tl = {divid:"navdiv", offset:{x:10,y:10}, zscale:1,
              pts:app.db.displayContext().points};
        setChartWidthAndHeight();
        initDisplayVariableValues();
        initMainDisplayElements();
        setTimeout(function () {  //don't hold up starting the app
            paintWallpaper("abgdiv"); }, 200);
        if(!tl.pts || tl.pts.length < 2) {
            jt.err("Timeline requires at least two points to display"); }
        else { //calcs are assumed so synchronous call
            bindDataAndDrawChart(); }
        app.mode.start(tl, currlev);
    }


    return {
        display: function (currlev) { display(currlev); },
        clickCircle: function (pt, inter) { clickCircle(pt, inter); },
        byPtId: function (refid, srcid) { byPtId(refid, srcid); },
        levelCompleted: function (levpi) { app.levelup.display(tl, levpi); },
        tldata: function () { return tl; },
        unzoom: function () { unzoom(); },
        timeline: function () { return tl; },
        fillColorForPoint: function (d) { return fillColorForPoint(d); },
        recolorPoints: function () { return recolorPoints(); }
    };
}());
