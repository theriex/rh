/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.finale = (function () {
    "use strict";

    var tl = null,       //grab useful geometry from linear timeline display
        chart = {},      //container for svg references
        hr = {};         //honor roll working variables


    function appendBackgroundImage () {
        d3.select("#svgf").append("g")
            .append("image")
            .attr("width", tl.width2)
            .attr("height", tl.height)
            .attr("href", "img/rhlogoFilled.png")
            .style("opacity", 0.2)
    }


    function appendCompletionText () {
        chart.tg = d3.select("#svgf").append("g")
        chart.tg.append("text")
            .attr("class", "finct")
            .attr("id", "finctitle")
            .attr("text-anchor", "middle")
            .attr("x", chart.cx)
            .attr("y", 30)
            .attr("font-size", 28)
            .text("Timeline Completed!")
            .style("opacity", 0.0)
            .transition().delay(1000).duration(2000)
            .style("opacity", 1.0)
        //PENDING: Detect TL name overflow and switch to text-anchor left
        //with ellipsis so it is readable.
        chart.tg.append("text")
            .attr("class", "finctln")
            .attr("text-anchor", "middle")
            .attr("x", chart.cx)
            .attr("y", 52)
            .attr("font-size", 14)
            .attr("stroke", "none")
            .attr("fill", "#666")
            .text(app.db.displayContext().lastTL.name)
            .style("opacity", 0.0)
            .transition().delay(1500).duration(2000)
            .style("opacity", 1.0)
    }


    function createHonorRollText(linedef, idx, txt) {
        var te = chart.hrg.append("text")
            .attr("id", "hrnte" + idx)
            .attr("class", "finhrn")
            .attr("text-anchor", "left")
            .attr("x", hr.x)
            .attr("y", linedef.y)
            .attr("font-size", 18)
            .attr("stroke", "none")
            .attr("fill", "#000")
            .text(txt)
            .style("opacity", linedef.opa);
        return te;
    }


    function updateHonorRoll () {
        var i, te, txt, transdef;
        //jt.log("--------- nidx: " + hr.nidx + " -------------------");
        for(i = 0; i < hr.ldefs.length; i += 1) {
            txt = hr.names[(hr.nidx + i) % hr.names.length];
            if(i === 0) {
                transdef = hr.ldefs[hr.ldefs.length - 1]; }
            else {
                transdef = hr.ldefs[i - 1]; }
            //jt.log(txt + " -> y: " + transdef.y + ", opa: " + transdef.opa);
            te = d3.select("#hrnte" + i);
            te.remove();  //have to rebuild or transitions crap out
            te = createHonorRollText(hr.ldefs[i], i, txt);
            te.transition().duration(hr.trt)
                .style("opacity", transdef.opa)
                .attr("y", transdef.y) }
        hr.nidx = (hr.nidx + 1) % hr.names.length;  //update circular queue idx
        if(!hr.placeholderTextCleared && hr.nidx > hr.ldefs.length) {
            hr.names = hr.names.slice(3);
            hr.nidx -= 3;
            hr.placeholderTextCleared = true; }
        setTimeout(updateHonorRoll, hr.trt);
    }


    function initHonorRoll () {
        var i;
        hr = {x:chart.cx - 120, y:30, lh:30, nidx:0, trt:1000};
        hr.username = app.user.acc.name || "User " + app.user.instid + " (You)";
        hr.ldefs = [{y:hr.y + 0 * hr.lh, opa:0.0},
                    {y:hr.y + 1 * hr.lh, opa:0.1},
                    {y:hr.y + 2 * hr.lh, opa:1.0},
                    {y:hr.y + 3 * hr.lh, opa:0.7},
                    {y:hr.y + 4 * hr.lh, opa:0.4},
                    {y:hr.y + 5 * hr.lh, opa:0.1},
                    {y:hr.y + 6 * hr.lh, opa:0.0}];
        //PENDING: When a static daily stats page becomes available, fetch
        //the names from there rather than by query.
        //STUB: This should call to query recent TLComp entries.
        hr.temptitle = "* Honor Roll *";
        hr.names = ["", "", hr.temptitle, hr.username];
        for(i = 1; i < 14; i += 1) {
            hr.names.push("Generated Name " + i); }
        chart.hrg = d3.select("#svgf").append("g")
        hr.ldefs.forEach(function (linedef, idx) {
            createHonorRollText(linedef, idx, hr.names[idx]); });
        setTimeout(updateHonorRoll, hr.trt);
    }


    function initDisplayElements () {
        chart.cx = Math.round(tl.width2 / 2);
        chart.cy = Math.round(tl.height / 2);
        d3.select("#suppvisdiv")
            .style("left", chart.cx + "px")
            .style("top", chart.cy + "px")
            .style("width", "30px")
            .style("height", "30px")
            .style("background", chart.colors.bg)
            .style("visibility", "visible")
            .transition().duration(2000)
            .style("left", tl.margin.left + "px")
            .style("top", tl.margin.top + "px")
            .style("width", tl.width2 + "px")
            .style("height", tl.height + "px");
        jt.out("suppvisdiv", jt.tac2html(
            ["svg", {id: "svgf", width: tl.width2, height: tl.height}]));
        appendBackgroundImage();
        appendCompletionText();
        initHonorRoll();
    }


    function display () {
        app.dlg.close();  //in case left open
        tl = app.linear.timeline();
        chart.colors = {bg:"#eefeff"};
        initDisplayElements();
        //display elements:
        //  - link to reference view the timeline they just completed so 
        //    they can revisit points or suppviz.  Point to menu for 
        //    finding timelines
        //  - Support this work
    }


    return {  //unlike regular suppviz, finale never returns to interactive
        display: function () { display(); }
    };
}());
