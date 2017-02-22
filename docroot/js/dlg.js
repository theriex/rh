/*jslint browser, multivar, white, fudge */
/*global app, jt, d3 */

app.dlg = (function () {
    "use strict";

    var lnfs = [
        {name: "parchment", dlgbg: "#f8e6a0", textbg: "#fff5ce", 
         datebg: "#fff0b7", buttonbg: "#ffe278"},
        {name: "slate", dlgbg: "#beddb9", textbg: "#d8f2d3", 
         datebg: "#ddfad8", buttonbg: "#aec8aa"},
        {name: "sky", dlgbg: "#d6edf2", textbg: "#e8f6f9", 
         datebg: "#e9f5f8", buttonbg: "#c0e3eb"}],
        lnfidx = 0,
        tl = null;


    function nextColorTheme () {
        lnfidx += 1;
        lnfidx = lnfidx % lnfs.length;
    }


    function setDialogColors () {
        var ct = lnfs[lnfidx];
        d3.select("#itemdispdiv").style("background", ct.dlgbg);
        d3.select(".dlgtextdiv").style("background", ct.textbg);
        d3.select(".dlgdatediv").style("background", ct.datebg);
        d3.select("button").style("background", ct.buttonbg);
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
        setDialogColors();
        d3.select("#itemdispdiv")
            .style("visibility", "visible")
            .style("max-height", "4px")
            .transition().duration(250)
            .style("max-height", dim.h + "px");
    }


    function showStartDialog (clickfstr) {
        var html;
        html = [["div", {cla: "dlgxdiv"},
                 ["a", {href: "#close", 
                        onclick: jt.fs("app.dlg.close()")},
                  "X"]],
                ["div", {cla: "dlgtextdiv"},
                 ["div", {cla: "introdlgdiv"},
                  [["div", {cla: "titlediv"},
                    "American<br/>" + 
                    "Race<br/>" + 
                    "History<br/>" + 
                    "Navigable</br>" + 
                    "Timeline<br/>"],
                   ["div", {cla: "startdiv", onclick: clickfstr},
                    ["div", {cla: "startcontdiv"},
                     "Start"]]]]]];
        displayDialog(null, jt.tac2html(html));
    }


    function showInfoDialog (d, nextfstr) {
        var html;
        html = [["div", {cla: "dlgdatediv"}, d.date],
                ["div", {cla: "dlgxdiv"},
                 ["a", {href: "#close", 
                        onclick: jt.fs("app.dlg.close()")},
                  "X"]],
                ["div", {cla: "dlgtextdiv"}, d.text],
                ["div", {cla: "buttondiv"},
                 ["button", {type: "button", id: "nextbutton",
                             onclick: nextfstr},
                  "Next"]]];
        displayDialog(d, jt.tac2html(html));
        //setting focus the first time does not work for whatever
        //reason, but it helps for subsequent dialog displays.
        setTimeout(function () { jt.byId("nextbutton").focus(); }, 100);
    }


    function showSaveConfirmationDialog (nextfstr) {
        var html, subj, body, vps = "";
        subj = "Race History restore link";
        body = "Click this link to restore your browser state:\n" +
            "http://localhost:8080";
        tl.pts.forEach(function (pt) {
            if(pt.visited) {
                vps += "&" + pt.cid + "=" + jt.enc(pt.visited); } });
        body += "?" + vps.slice(1);
        html = [["div", {cla: "dlgxdiv"},
                 ["a", {href: "#close", 
                        onclick: jt.fs("app.dlg.close()")},
                  "X"]],
                ["div", {cla: "dlgtextdiv"},
                 [["div", {id: "dlgsavetitlediv"}, "Progress saved."],
                  ["div", {id: "dlgsavelinkdiv"}, "building restore link..."]]],
                ["div", {cla: "buttondiv"},
                 ["button", {type: "button", id: "nextbutton",
                             onclick: nextfstr},
                  "Continue"]]];
        displayDialog(null, jt.tac2html(html));
        //The mail href can sometimes take a long time to render leading
        //to the dialog looking like it has crashed.  So dump out the 
        //contents in a separate step.
        setTimeout(function () {
            jt.out("dlgsavelinkdiv", jt.tac2html(
                ["a", {href: "mailto:?subject=" + jt.dquotenc(subj) + 
                                    "&body=" + jt.dquotenc(body)},
                 "Mail a Restore Link"])); }, 100);
    }


    function closeDialog () {
        d3.select("#itemdispdiv")
            .style("visibility", "hidden");
        app.mode.chmode("reference");
    }


    return {
        init: function (timeline) { tl = timeline; },
        start: function (clickfstr) { showStartDialog(clickfstr); },
        info: function (d, nextfstr) { showInfoDialog(d, nextfstr); },
        close: function () { closeDialog(); },
        save: function (nextfstr) { showSaveConfirmationDialog(nextfstr); },
        nextColorTheme: function () { nextColorTheme(); }
    };
}());
