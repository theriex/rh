/*jslint browser, multivar, white, fudge, long */
/*global app, window, jt, d3 */

app.support = (function () {
    "use strict";

    var dispdef = {
        support:{title:"Support", content:[
            ["p", "Help improve this site! Issues are tracked on <span id=\"supghsp\">github</span>, or just <span id=\"supiemsp\">send email</span> if you notice something."],
// Not worth mentioning until the donation page has been set up
//            ["p", "If you can, please <span id=\"supdonsp\">make a donation to support this site</span>."],
            ["p", "If your organization would like to manage its own data, or sponsor creating a new visualization, <span id=\"suporgesp\">get in touch</span>."]],
                 repls:[
                     {id:"supghsp", url:"https://github.com/theriex/rh/issues"},
                     {id:"supiemsp", em:"support", delay:1000},
                     {id:"supdonsp", url:"docs/interimdonation.html"},
                     {id:"suporgesp", em:"contact", delay:1000}]},
        about:{title:"About", content:[
            ["p", "The goal of the U.S. Race History Project is to provide introductory information that promotes understanding and respect for the context of people whose histories are frequently ignored.  Points are presented interactively for perusal when visiting the site, or by reference with optional download."],
            ["p", "All timelines are incomplete.  You are encouraged to check all points for yourself.  Knowledge evolves over time and history has multiple perspectives."],
            ["p", "The project thanks its member organizations for their essential contributions and perspective.  Technical development can be followed on <span id=\"supghsp\">github</span>."]],
               repls:[
                   {id:"supghsp", url:"https://github.com/theriex/rh/issues"}]},
        chapter:{title:"End of Chapter <span id=\"chnsp\">N</span>", content:[
            ["p", "You covered <span id=\"chptcsp\"></span> points from <span id=\"chyfsp\"></span> to <span id=\"chytsp\"></span>."],
            ["p", "To revisit any of these points, use the menu to switch to reference mode."],
            ["div", {id:"sv0textdiv"}, ""], //bookmark site instructions
            ["div", {id:"sv0linkdiv"}, ""], //instruction details as needed
            ["div", {id:"suppclosediv"},
             ["button", {type:"button", cla:"ghostbutton", id:"contbutton"},
              "Continue"]]]}},
        chdet = {};


    function replace (def) {
        var emd = "@usracehistory.org";
        def.repls.forEach(function (rep) {
            if(rep.url && jt.byId(rep.id)) {
                jt.out(rep.id, jt.tac2html(
                    ["a", {href:rep.url,
                           onclick:jt.fs("window.open('" + rep.url + "')")},
                     jt.byId(rep.id).innerHTML])); }
            else if(rep.em) {
                jt.out(rep.id, jt.tac2html(
                    ["a", {href:"mailto:" + rep.em + emd},
                     jt.byId(rep.id).innerHTML])); }
            else if(rep.txt) {
                jt.out(rep.id, rep.txt); }
            else if(rep.click) {
                jt.on(rep.id, "click", rep.click); }
            else if(rep.ff) {  //fill function handles change and output
                rep.ff(); }
        });
    }


    function display (tl, dc) {
        var def, currpt, html, svd, contheight;
        dc = dc || "support";
        def = dispdef[dc];
        currpt = app.mode.currpt();
        if(currpt) {  //return to the same point after this display is done.
            app.db.unvisitPoint(currpt);
            app.mode.requeue(currpt); }
        html = [["div", {id:"suppxdiv"},
                 ["a", {href:"#close",
                        onclick:jt.fs("app.support.close()")}, "x"]],
                ["div", {id:"supptitlediv"}, def.title],
                ["div", {id:"suppcontentdiv"}, def.content]];
        //Verify the dialog is hidden so there is no blink when the content
        //gets updated.  Set the content height so it's not truncated.
        svd = jt.byId("suppvisdiv");
        svd.style.visibility = "hidden";
        svd.innerHTML = jt.tac2html(html);
        contheight = tl.height - jt.byId("supptitlediv").offsetHeight;
        contheight -= 20;  //not too close to bottom
        jt.byId("suppcontentdiv").style.height = contheight + "px";
        jt.byId("suppcontentdiv").style.minHeight = contheight + "px";
        //give the content a few millis to render so it's not ignored
        setTimeout(function () {
            var dims = {w: Math.max(280, Math.round(0.5 * tl.width)),
                        h: Math.max(400, Math.round(0.7 * tl.height))};
            dims.l = Math.max(0, Math.round(0.5 * (tl.width - dims.w)));
            d3.select("#suppvisdiv")
                .style("left", dims.l + "px")
                .style("top", "20px")  //leave room for menu access
                .style("width", dims.w + "px")
                .style("height","50px")  //ensure title visible
                .style("background", "#fff5ce")
                .style("visibility", "visible")
                .transition().duration(2000)
                .style("height", dims.h + "px");
            setTimeout(function () {
                replace(def); }, 2000); }, 200);
    }


    function updateChapterDetails () {
        var dcon = app.db.displayContext(),
            ttl = dcon.points.length,  //total number of all points in timeline
            ppc = Math.round(ttl / 10),  //points per chapter
            cpl = dcon.prog.pts.csvarray().length,  //completed points length
            cch = chdet.chn || Math.floor(cpl / ppc), //set or calc chapter num
            pfc = cpl - (cch * ppc),  //points completed this chapter
            rem = ppc - pfc;  //how many remaining points in chapter
        chdet.dcon = dcon;
        chdet.ttl = ttl;
        chdet.ppc = ppc;
        chdet.cpl = cpl;
        chdet.pfc = pfc;
        chdet.rem = rem;
        if(!chdet.chn) {
            jt.log("updateChapterDetails initializing chapter num to " + cch);
            chdet.chn = cch; }
        jt.log("points remaining in chapter: " + chdet.rem);
    }


    function chapterSummary (contf) {
        var progpts = [], yi = {};
        updateChapterDetails();
        progpts = chdet.dcon.prog.pts.csvarray();
        if(!contf) {
            return chdet; }
        chdet.chn += 1;  //starts at zero, incremented to current chapter
        yi.p = chdet.chn - 1;  //previous chapter number
        yi.s = yi.p * chdet.ppc;  //index of starting point
        yi.e = (chdet.chn * chdet.ppc) - 1;  //index of ending point
        yi.s = progpts[yi.s].split(";")[0];  //get id of point
        yi.s = app.db.pt4id(yi.s).start.year;  //get point for id
        yi.e = progpts[yi.e].split(";")[0];
        yi.e = app.db.pt4id(yi.e).start.year;
        dispdef.chapter.repls = [
            {id:"chnsp", txt:chdet.chn},
            {id:"chptcsp", txt:chdet.ppc},
            {id:"chyfsp", txt:yi.s},
            {id:"chytsp", txt:yi.e},
            {id:"sv0textdiv", ff:app.intro.initLinkText},
            {id:"contbutton", click:contf}];
        display(app.linear.timeline(), "chapter");
        setTimeout(function () {
            jt.byId("contbutton").focus(); }, 2000);
    }


    return {
        display: function (tl, dc) { display(tl, dc); },
        close: function () {
            d3.select("#suppvisdiv")
                .style("visibility", "hidden");
            app.mode.chmode("same"); },
        chapter: function (contf) { return chapterSummary(contf); }
    };
}());
