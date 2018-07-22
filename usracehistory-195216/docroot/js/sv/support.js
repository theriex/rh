/*jslint browser, multivar, white, fudge, long */
/*global app, window, jt, d3 */

app.support = (function () {
    "use strict";

    var dispdef = {
        support:{title:"Support", content:[
            ["p", "Help improve this site! Issues are tracked on <span id=\"supghsp\">github</span>, or just <span id=\"supiemsp\">send email</span> if you notice something."],
            ["p", "If you can, please <span id=\"supdonsp\">make a donation to support this site</span>."],
            ["p", "If your organization would like to manage its own data, or sponsor creating a new visualization, <span id=\"suporgesp\">get in touch</span>."]],
                 repls:[
                     {id:"supghsp", url:"https://github.com/theriex/rh/issues"},
                     {id:"supiemsp", em:"issues", delay:1000},
                     {id:"supdonsp", url:"docs/interimdonation.html"},
                     {id:"suporgesp", em:"contact", delay:1000},
                     {id:"supdocsp", url:"docs/documentation.html"}]},
        about:{title:"About", content:[
            ["p", "The goal of the U.S. Race History Project is to provide introductory information that promotes understanding and respect for the context of people whose histories are frequently ignored.  Points are presented interactively for perusal when visiting the site, or by reference with optional download."],
            ["p", "All timelines are incomplete.  You are encouraged to check all points for yourself.  Knowledge evolves over time and history has multiple perspectives."],
            ["p", "The project thanks its contributing organizations for their essential contributions and perspective.  Technical development can be followed on <span id=\"supghsp\">github</span>."]],
               repls:[
                   {id:"supghsp", url:"https://github.com/theriex/rh/issues"}]}
    };


    function replace (def) {
        var emd = "@usracehistory.org";
        def.repls.forEach(function (rep) {
            if(rep.url) {
                jt.out(rep.id, jt.tac2html(
                    ["a", {href:rep.url,
                           onclick:jt.fs("window.open('" + rep.url + "')")},
                     jt.byId(rep.id).innerHTML])); }
            else if(rep.em) {
                jt.out(rep.id, jt.tac2html(
                    ["a", {href:"mailto:" + rep.em + emd},
                     jt.byId(rep.id).innerHTML])); } });
    }


    function display (ms, dc) {
        var def, html, svd, contheight;
        dc = dc || "support";
        def = dispdef[dc];
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
        contheight = ms.tl.height - jt.byId("supptitlediv").offsetHeight;
        contheight -= 20;  //not too close to bottom
        jt.byId("suppcontentdiv").style.height = contheight + "px";
        jt.byId("suppcontentdiv").style.minHeight = contheight + "px";
        //give the content a few millis to render so it's not ignored
        setTimeout(function () {
            d3.select("#suppvisdiv")
                .style("left", "0px")
                .style("top", "20px")  //leave room for menu access
                .style("width", ms.tl.width + "px")
                .style("height","50px")
                .style("background", "#fff5ce")
                .style("visibility", "visible")
                .transition().duration(2000)
                .style("height", (ms.tl.height) + "px");
            setTimeout(function () {
                replace(def); }, 2000); }, 200);
    }


    return {
        display: function (ms, dc) { display(ms, dc); },
        close: function () {
            d3.select("#suppvisdiv")
                .style("visibility", "hidden");
            app.mode.chmode("same"); }
    };
}());
