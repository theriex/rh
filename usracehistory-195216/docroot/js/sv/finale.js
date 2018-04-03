/*jslint browser, multivar, white, fudge, for */
/*global app, window, jt, d3 */

app.finale = (function () {
    "use strict";

    var tl = null,       //grab useful geometry from linear timeline display
        chart = {},      //container for svg references
        hr = {},         //honor roll working variables
        //PENDING: stop running the dynamic stuff after 400 times or whatever
        //just so you don't chew up batteries
        hrto = null,     //honor roll timeout reference
        slto = null;     //searchlights timeout reference


    function moveSearchlights () {
        var dur = 3000;
        chart.lights.forEach(function (co) {
            co.circle.remove();  //previous duration is spent
            co.circle = chart.btg.append("circle")
                .attr("cx", co.cx)
                .attr("cy", co.cy)
                .attr("r", 40)
                .attr("stroke", "none")
                .attr("fill", "#fff");
            co.cx = Math.round(Math.random() * tl.width2);
            co.cy = Math.round(Math.random() * tl.height);
            co.circle.transition().duration(dur)
                .attr("cx", co.cx)
                .attr("cy", co.cy); });
        if(slto) { clearTimeout(slto); }
        slto = setTimeout(moveSearchlights, dur);
    }


    function initBackgroundLights () {
        chart.btg = d3.select("#svgf").append("g");
        chart.lights = [{cx:chart.cx + 50, cy:chart.cx - 50}, 
                        {cx:chart.cx - 50, cy:chart.cx - 50}, 
                        {cx:chart.cx - 50, cy:chart.cx + 50},
                        {cx:chart.cx + 50, cy:chart.cx + 50}];
        chart.lights.forEach(function (co) {
            co.circle = chart.btg.append("circle")
                .attr("cx", co.cx)
                .attr("cy", co.cy)
                .attr("r", 40)
                .style("opacity", 0.0)
                .attr("stroke", "none")
                .attr("fill", "#fff"); });
        if(slto) { clearTimeout(slto); }
        slto = setTimeout(moveSearchlights, 8000);
    }


    function appendBackgroundImage () {
        d3.select("#svgf").append("g")
            .append("image")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", tl.width2)
            .attr("height", tl.height)
            .attr("preserveAspectRatio", "none")
            .attr("href", "img/rhlogoFilled.png")
            .style("opacity", 0.2);
    }


    function appendCompletionText () {
        chart.tg = d3.select("#svgf").append("g");
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
            .transition().delay(3000).duration(3000)
            .style("opacity", 0.6);
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
            .style("opacity", 1.0);
    }


    function toggleHonorScrolling () {
        if(!hr.paused) {
            hr.paused = true;
            if(hrto) {
                clearTimeout(hrto); } }
        else {
            hr.paused = false;
            updateHonorRoll(); }  //update immediately
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
            .style("opacity", linedef.opa)
            .on("click", toggleHonorScrolling);
        return te;
    }


    function updateHonorRoll () {
        var i, te, txt, transdef;
        for(i = 0; i < hr.ldefs.length; i += 1) {
            txt = hr.names[(hr.nidx + i) % hr.names.length];
            if(i === 0) {
                transdef = hr.ldefs[hr.ldefs.length - 1]; }
            else {
                transdef = hr.ldefs[i - 1]; }
            te = d3.select("#hrnte" + i);
            te.remove();  //have to rebuild or transitions crap out
            te = createHonorRollText(hr.ldefs[i], i, txt);
            te.transition().duration(hr.trt)
                .style("opacity", transdef.opa)
                .attr("y", transdef.y); }
        hr.nidx = (hr.nidx + 1) % hr.names.length;  //update circular queue idx
        if(!hr.placeholderTextCleared && hr.nidx > hr.ldefs.length) {
            hr.names = hr.names.slice(3);
            hr.nidx -= 3;
            hr.placeholderTextCleared = true; }
        if(hrto) { clearTimeout(hrto); }
        hrto = setTimeout(updateHonorRoll, hr.trt);
    }


    function startHonorRoll (comps) {
        hr.names = ["", "", "* Honor Roll *", hr.username]
        comps.forEach(function (comp) {
            if(hr.names.indexOf(comp.username) < 0) {
                hr.names.push(comp.username); } });
        while(hr.names.length < 13) {
            hr.names.push(""); }
        chart.hrg = d3.select("#svgf").append("g");
        hr.ldefs.forEach(function (linedef, idx) {
            createHonorRollText(linedef, idx, hr.names[idx]); });
        if(hrto) { clearTimeout(hrto); }
        hrto = setTimeout(updateHonorRoll, 6000 + hr.trt);
    }


    function initHonorRoll () {
        var i, tlid = app.db.displayContext().tlid;
        hr = {x:chart.cx - 120, y:30, lh:30, nidx:0, trt:2400};
        hr.username = app.user.acc.name || "User " + app.user.instid + " (You)";
        hr.ldefs = [{y:hr.y + 0 * hr.lh, opa:0.0},
                    {y:hr.y + 1 * hr.lh, opa:0.1},
                    {y:hr.y + 2 * hr.lh, opa:1.0},
                    {y:hr.y + 3 * hr.lh, opa:0.7},
                    {y:hr.y + 4 * hr.lh, opa:0.4},
                    {y:hr.y + 5 * hr.lh, opa:0.1},
                    {y:hr.y + 6 * hr.lh, opa:0.0}];
        //PENDING: When a static daily stats page becomes available, fetch
        //the names from there rather than by general query.
        jt.call("GET", "findcomps?" + app.auth() + "&tlid=" + tlid, null,
                function (result) {
                    startHonorRoll(result); },
                function (code, errtxt) {
                    jt.log("findcomps failed " + code + ": " + errtxt); },
                jt.semaphore("finale.initHonorRoll"));
    }


    function openDonationPage () {
        window.open("docs/interimdonation.html");
    }


    function appendDonateButton () {
        chart.cg.append("ellipse")
            .attr("cx", chart.cx + 71)
            .attr("cy", 281)
            .attr("rx", 44)
            .attr("ry", 20)
            .attr("stroke", "none")
            .attr("fill", "5656b7")
            .style("opacity", 0.0)
            .transition().delay(4000).duration(1800)
            .style("opacity", 1.0);
        chart.cg.append("ellipse")
            .attr("cx", chart.cx + 70)
            .attr("cy", 280)
            .attr("rx", 40)
            .attr("ry", 16)
            .attr("stroke", "none")
            .attr("fill", "#ffff75")  //yellow
            .style("opacity", 0.0)
            .transition().delay(4000).duration(1800)
            .style("opacity", 1.0);
        chart.cg.append("text")
            .attr("id", "findontxt")
            .attr("text-anchor", "middle")
            .attr("x", chart.cx + 70)
            .attr("y", 285)
            .attr("font-size", 16)
            .attr("stroke", "none")
            .attr("fill", "#444")
            .text("Donate")
            .on("click", openDonationPage)
            .style("opacity", 0.0)
            .transition().delay(4000).duration(1800)
            .style("opacity", 1.0);
    }


    function appendClosureText () {
        chart.cg = d3.select("#svgf").append("g");
        chart.cg.append("text")
            .attr("class", "finexplore")
            .attr("text-anchor", "left")
            .attr("x", chart.cx - 120)
            .attr("y", 220)
            .attr("font-size", 18)
            .text("Use the menu to see timeline")
            .style("opacity", 0.0)
            .transition().delay(1000).duration(4000)
            .style("opacity", 1.0);
        chart.cg.append("text")
            .attr("class", "finexplore")
            .attr("text-anchor", "left")
            .attr("x", chart.cx - 120)
            .attr("y", 240)
            .attr("font-size", 18)
            .text("points or create your own.")
            .style("opacity", 0.0)
            .transition().delay(1000).duration(4000)
            .style("opacity", 1.0);
        chart.cg.append("text")
            .attr("class", "findonate")
            .attr("text-anchor", "left")
            .attr("x", chart.cx - 120)
            .attr("y", 270)
            .attr("font-size", 18)
            .attr("stroke", "none")
            .attr("fill", "#666")
            .text("Support this site!")
            .style("opacity", 0.0)
            .transition().delay(3000).duration(4000)
            .style("opacity", 1.0);
        appendDonateButton();
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
        initBackgroundLights();
        appendBackgroundImage();
        appendCompletionText();
        initHonorRoll();
        appendClosureText();
    }


    function display (record) {
        var ds, tinst, data;
        app.dlg.close();  //in case left open
        tl = app.linear.timeline();
        chart.colors = {bg:"#eefeff"};
        initDisplayElements();
        if(record) {
            d3.select("#finctitle").text = "Recording Completion...";
            ds = app.db.displayContext().ds;
            tinst = ds[ds.length - 1];
            data = "tlid=" + tinst.instid + "&tlname=" + jt.enc(tinst.name);
            jt.call("POST", "notecomp?" + app.auth(), data,
                    function (result) {
                        app.db.deserialize("AppUser", result[0]);
                        app.user.acc = result[0];
                        d3.select("#finctitle").text = "Timeline Completed!"; },
                    function (code, errtxt) {
                        jt.log("finale acc upd " + code + ": " + errtxt);
                        d3.select("#finctitle").text = errtxt; },
                    jt.semaphore("finale.display")); }
    }


    return {  //unlike regular suppviz, finale never returns to interactive
        display: function (record) { display(record); }
    };
}());
