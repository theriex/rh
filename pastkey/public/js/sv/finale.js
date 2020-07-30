/*jslint browser, white, fudge, for */
/*global app, window, jt, d3 */

app.finale = (function () {
    "use strict";

    var tl = null;       //grab useful geometry from linear timeline display
    var chart = {};      //container for svg references
    var hr = {};         //honor roll working variables
    var hrto = null;     //honor roll timeout reference
    var slto = null;     //searchlights timeout reference
    var tda = {};        //text area display attributes


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
        if(!hr.paused) {
            slto = setTimeout(moveSearchlights, dur); }
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
            //.attr("preserveAspectRatio", "none")
            //.attr("href", app.dr("img/rhlogoFilled.png"))
            .attr("preserveAspectRatio", "xMidyMid meet")
            .attr("href", app.dr("img/pastkey.png"))
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
            .text(app.db.displayContext().lastTL.title)
            .style("opacity", 0.0)
            .transition().delay(1500).duration(2000)
            .style("opacity", 1.0);
    }


    function toggleHonorScrolling (command) {
        if(!hr.paused || command === "stop") {
            jt.log("toggleHonorScrolling paused");
            hr.paused = true;
            if(hrto) {
                clearTimeout(hrto); } }
        else {
            jt.log("toggleHonorScrolling resuming");
            hr.paused = false;
            hr.updcount = 0;
            moveSearchlights();
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
            .style("cursor", "pointer")
            .on("click", toggleHonorScrolling);
        return te;
    }


    function updateHonorRoll () {
        var i; var te; var txt; var transdef;
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
        if(hr.updcount >= hr.updmax) {
            return toggleHonorScrolling("stop"); }
        hr.updcount += 1;
        if(hr.updcount > 1) {
            d3.select("#finctitle").text("Honor Roll"); }
        jt.log("updateHonorRoll updcount: " + hr.updcount);
        hrto = setTimeout(updateHonorRoll, hr.trt);
    }


    function startHonorRoll (comps) {
        var fillnames = ["Ryan", "Olivia", "Michael", "Sophia", "Emily", "Joe",
                         "Grace", "Alex", "Isabella", "Chris", "Mia", "Lucas"];
        hr.names = ["", "", "* Honor Roll *", hr.username];
        hr.updmax = 56;  //pause after this to avoid wasting batteries
        hr.updcount = 0;
        comps.forEach(function (comp) {
            if(app.user && app.user.acc && 
               app.user.acc.instid === comp.userid) {
                //use their most up-to-date name in case they changed it
                comp.username = app.user.acc.name; }
            if(hr.names.indexOf(comp.username) < 0) {
                hr.names.push(comp.username); } });
        fillnames.forEach(function (name) {
            if(hr.names.length < 13) {
                hr.names.push(name); } });
        chart.hrg = d3.select("#svgf").append("g");
        hr.ldefs.forEach(function (linedef, idx) {
            createHonorRollText(linedef, idx, hr.names[idx]); });
        if(hrto) { clearTimeout(hrto); }
        hrto = setTimeout(updateHonorRoll, 6000 + hr.trt);
    }


    function initHonorRoll () {
        var url; var tlid = app.db.displayContext().tlid;
        hr = {x:chart.cx - 120, y:30, lh:30, nidx:0, trt:2400};
        hr.username = "No Account (You)";
        if(app.user && app.user.acc) {
            hr.username = app.user.acc.name;
            if(!hr.username) {
                hr.username = "No Account Name (You)"; } }
        hr.ldefs = [{y:hr.y + 0 * hr.lh, opa:0.0},
                    {y:hr.y + 1 * hr.lh, opa:0.1},
                    {y:hr.y + 2 * hr.lh, opa:1.0},
                    {y:hr.y + 3 * hr.lh, opa:0.7},
                    {y:hr.y + 4 * hr.lh, opa:0.4},
                    {y:hr.y + 5 * hr.lh, opa:0.1},
                    {y:hr.y + 6 * hr.lh, opa:0.0}];
        //PENDING: When a static daily stats page becomes available, fetch
        //the names from there rather than by general query.
        if(!app.auth) {
            return startHonorRoll([{username:hr.username}]); }
        url = "findcomps?" + app.auth() + "&tlid=" + tlid +
            jt.ts("&cb=", "second");
        jt.call("GET", url, null,
                function (result) {
                    startHonorRoll(result); },
                function (code, errtxt) {
                    jt.log("findcomps failed " + code + ": " + errtxt); },
                jt.semaphore("finale.initHonorRoll"));
    }


    function tdaInit() {
        tda.x = chart.cx - 120;
        tda.y = 256;  //y offset for share text
        tda.cx = chart.cx;
        jt.log("tda x:" + tda.x + ", y:" + tda.y + ", cx:" + tda.cx);
    }


    function showCompletionCertificate () {
        var email = "unknown";
        if(app.user && app.user.acc) {
            email = app.user.acc.email; }
        d3.event.preventDefault();
        window.open(app.baseurl + 
                    "?compcert=" + app.db.displayContext().tlid + 
                    "&email=" + email);
    }


    function signInToSaveProgress () {
        d3.event.preventDefault();
        app.dlg.signin();
    }


    function appendLink (field, dim, hash, func, text) {
        chart.cg[field] = chart.cg.append("foreignObject")
            .attr("x", dim.x)
            .attr("y", dim.y)
            .attr("width", 240)
            .attr("height", dim.h)
            .style("opacity", 0.0);
        chart.cg[field].append("xhtml:a")
            .attr("href", hash)
            .on("click", func)
            .text(text);
        chart.cg[field].transition().delay(1000).duration(4000)
            .style("opacity", 1.0);
    }


    function appendDiv (foid, dim, divid) {
        chart.cg[foid] = chart.cg.append("foreignObject")
            .attr("x", dim.x)
            .attr("y", dim.y)
            .attr("width", 240)
            .attr("height", dim.h)
            .style("opacity", 0.0);
        chart.cg[foid].append("xhtml:div")
            .attr("id", divid);
        chart.cg[foid].transition().delay(1000).duration(4000)
            .style("opacity", 1.0);
    }


    function appendClosureText () {
        tdaInit();
        chart.cg = d3.select("#svgf").append("g");
        chart.cg.sharetxt = chart.cg.append("text")
            .attr("id", "sharetxt")
            .attr("class", "finhrn")
            .attr("text-anchor", "left")
            .attr("x", tda.x + 20)
            .attr("y", tda.y - 42)
            .text("Share this timeline")
            .attr("font-size", 20)
            .attr("stroke", "none")
            .attr("fill", "#000")
            .style("opacity", 0.0)
            .transition().delay(1000).duration(4000)
            .style("opacity", 1.0);
        appendDiv("foshare", {x:tda.x, y:tda.y - 42, h:60}, "socsharediv");
        app.support.socshareHTML("socsharediv");
        var linkdims = {x:tda.x, y:tda.y + 20, h:24};
        if(app.user && app.user.acc) {
            appendLink("lfo", linkdims, "#compcert", showCompletionCertificate, 
                       "Show Completion Certificate"); }
        else {
            appendLink("lfo", linkdims, "#saveprog", signInToSaveProgress,
                       "Save Timeline Completion"); }
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
        var ds; var tinst; var auth = ""; var data;
        app.dlg.close();  //in case left open
        tl = app.linear.timeline();
        //chart.colors = {bg:"#eefeff"};  /light blue
        chart.colors = {bg:"#fffee0"};  //light yellow
        initDisplayElements();
        if(record) {
            d3.select("#finctitle").text("Saving...");
            ds = app.db.displayContext().ds;
            tinst = ds[ds.length - 1];
            data = {tlid:tinst.instid, tlname:tinst.name,
                    tltitle:tinst.title || "",
                    tlsubtitle:tinst.subtitle || ""};
            data = jt.objdata(data);
            if(app.auth) {  //undefined if testing standalone
                auth = app.auth(); }
            jt.call("POST", "notecomp?" + auth, data,
                    function (result) {
                        app.db.deserialize("AppUser", result[0]);
                        app.user.acc = result[0];
                        d3.select("#finctitle").text("Timeline Completed!"); },
                    function (code, errtxt) {
                        //not much to do, will retry next time they load..
                        jt.log("finale acc upd " + code + ": " + errtxt);
                        d3.select("#finctitle").text("Timeline Completed!"); },
                    jt.semaphore("finale.display")); }
    }


    return {  //unlike regular suppviz, finale never returns to interactive
        display: function (record) { display(record); }
    };
}());
