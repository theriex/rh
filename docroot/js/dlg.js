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
        d3.select("#dlgdatediv").style("background", ct.datebg);
        d3.select("button").style("background", ct.buttonbg);
    }


    function adjustContentHeight (dim) {
        var cd = {x:dim.x, y:dim.y, w:dim.w, h:dim.h},
            elids = ["dlgdatediv", "dlgxdiv", "dlgbuttondiv"];
        elids.forEach(function (id) {
            var elem = jt.byId(id);
            if(elem) {
                cd.h -= elem.offsetHeight; } });
        d3.select("#dlgcontentdiv")
            .style("max-height", cd.h + "px");
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
        adjustContentHeight(dim);
        if(dim.tracked) {
            elem = jt.byId("dlgcontentdiv");
            if(elem && elem.scrollHeight > elem.offsetHeight) {  //overflowed
                dim.y = tl.margin.top + Math.round(0.04 * tl.height);
                dim.h = Math.round(0.8 * tl.height);
                adjustContentHeight(dim);
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
        html = [["div", {id: "dlgxdiv"},
                 ["a", {href: "#close", 
                        onclick: jt.fs("app.dlg.close('reference')")},
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


    function infoPicHTML (d) {
        var html = "", name = "", i, ch;
        if(d.pic) {
            for(i = 0; i < d.pic.length - 4; i += 1) {
                ch = d.pic.charAt(i);
                if(ch === "-") {
                    name += "-"; }
                else if(ch === ch.toUpperCase()) {
                    name += " " + ch.toUpperCase(); }
                else {
                    name += ch; } }
            name = name.replace(/De Bakey/g, "DeBakey");
            name = name.split(" ");
            name.forEach(function (na, idx) {
                if(na.length === 1) {
                    name[idx] = na + "."; } });
            name = name.join(" ");
            html = jt.tac2html(
                [["img", {cla:"infopic", src:"img/datapics/" + d.pic}],
                 ["div", {cla:"picnamediv"}, name]]); }
        return html;
    }


    function showInfoDialog (d, nextfstr) {
        var html;
        html = [["div", {id:"dlgdatediv"}, d.date],
                ["div", {id:"dlgxdiv"},
                 ["a", {href:"#close", 
                        onclick:jt.fs("app.dlg.close('reference')")},
                  "X"]],
                ["div", {id:"dlgcontentdiv"},
                 [["div", {cla:"dlgpicdiv"}, infoPicHTML(d)],
                  ["div", {cla:"dlgtextdiv"}, d.text]]],
                ["div", {id:"dlgbuttondiv"},
                 ["button", {type:"button", id:"nextbutton",
                             onclick:nextfstr},
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
        html = [["div", {id: "dlgxdiv"},
                 ["a", {href: "#close", 
                        onclick: jt.fs("app.dlg.close('reference')")},
                  "X"]],
                ["div", {cla: "dlgtextdiv"},
                 [["div", {id: "dlgsavetitlediv"}, "Progress saved."],
                  ["div", {id: "dlgsavelinkdiv"}, "building restore link..."]]],
                ["div", {id: "dlgbuttondiv"},
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


    function closeDialog (mode) {
        d3.select("#itemdispdiv")
            .style("visibility", "hidden");
        if(mode) {
            app.mode.chmode(mode); }
    }


    return {
        init: function (timeline) { tl = timeline; },
        start: function (clickfstr) { showStartDialog(clickfstr); },
        info: function (d, nextfstr) { showInfoDialog(d, nextfstr); },
        close: function (mode) { closeDialog(mode); },
        save: function (nextfstr) { showSaveConfirmationDialog(nextfstr); },
        nextColorTheme: function () { nextColorTheme(); }
    };
}());
