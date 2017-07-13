/*jslint browser, multivar, white, fudge, for */
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
        buttonText = {yes:"Yes", no:"No"},
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
        d3.select(".dlgsavediv").style("background", ct.textbg);
        d3.select("#dlgdatespan").style("background", ct.datebg);
        d3.select("#choicebuttonsdiv").style("background", ct.textbg);
        d3.selectAll("button").style("background", ct.buttonbg);
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
        var dim, elem, txtdiv, picdiv;
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
            elem = jt.byId("itemdispdiv");
            txtdiv = jt.byId("dlgtextdiv");
            picdiv = jt.byId("dlgpicdiv");
            if(elem && ((elem.scrollHeight > elem.clientHeight) ||
                        (txtdiv && txtdiv.clientHeight > elem.clientHeight) ||
                        (picdiv && picdiv.clientHeight > elem.clientHeight))) {
                //readjust to full screen to accommodate overflow
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
        //removed dlgxdiv since dismissing the dialog does not leave you
        //with an interactive application. Close interactivity instead.
        html = [["div", {cla: "introdlgdiv"},
                 [["div", {cla: "titlediv"},
                   "American<br/>" + 
                   "Race<br/>" + 
                   "History<br/>" + 
                   "Navigable</br>" + 
                   "Timeline<br/>"],
                  ["div", {cla: "startdiv", onclick: clickfstr},
                   ["div", {cla: "startcontdiv"},
                    "Start"]]]]];
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
            name = name.replace(/De\sBakey/g, "DeBakey");
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


    function rememberCheckboxTAC (checked) {
        var html;
        html = ["div", {cla:"checkboxdiv"},
                [["input", {type:"checkbox", id:"cbremember",
                            value:"remembered", checked:jt.toru(checked)}],
                 ["label", {fo:"cbremember", id:"remcblabel"},
                  "Browse later"]]];
        return html;
    }


    function getYearGuessOptions (pt, flank) {
        var idx, dp, off, years = [pt.start.year];
        idx = pt.currdataindex - 1;
        while(idx >= 0 && years.length < flank) {
            dp = app.data.pts[idx];
            if(dp.start.year !== years[0]) {
                years.unshift(dp.start.year); }
            idx -= 1; }
        idx = pt.currdataindex + 1;
        while(idx < app.data.pts.length && years.length <= 2 * flank) {
            dp = app.data.pts[idx];
            if(dp.start.year !== years[years.length - 1]) {
                years.push(dp.start.year); }
            idx += 1; }
        //find the original year again, array may not be balanced
        idx = 0;
        while(idx < years.length && years[idx] !== pt.start.year) {
            idx += 1; }
        off = Math.floor(Math.random() * (flank + 1));
        idx = Math.max(idx - off, 0);
        years = years.slice(idx, idx + flank + 1);
        return years;
    }


    function yearButtonId (year) {
        var yid = "yearbutton" + Math.abs(year);
        if(year < 0) {
            yid += "bce"; }
        return yid;
    }


    function timelineNamesCSV (codes) {
        var cidx, code, tidx, timeline, csv = "";
        for(cidx = 0; cidx < codes.length; cidx += 1) {
            code = codes.charAt(cidx);
            for(tidx = 0; tidx < app.data.timelines.length; tidx += 1) {
                timeline = app.data.timelines[tidx];
                if(timeline.code === code) {
                    if(csv) {
                        csv += ", "; }
                    csv += timeline.name;
                    break; } } }
        return csv;
    }


    function infoButtons (d) {
        var ret = {tac:[], focid:"", date:""};
        if(d.code.indexOf("U") >= 0) {
            ret.tac = [["span", {cla:"buttonintrospan"}, "Did you know?"],
                       ["div", {id:"choicebuttonsdiv"},
                        [["button", {type:"button", id:"yesbutton",
                                     onclick:jt.fs("app.dlg.button('yes')")},
                          buttonText.yes],
                         ["span", {cla:"dlgbuttonsep"}, "|"],
                         ["button", {type:"button", id:"nobutton",
                                     onclick:jt.fs("app.dlg.button('no')")},
                          buttonText.no],
                         rememberCheckboxTAC(true)]]];
            ret.focid = "nobutton";
            ret.date = ["span", {id:"dlgdatespan"}, d.dispdate]; }
        else if(d.code.indexOf("D") >= 0) {
            ret.tac = [];
            d.yearguesses = getYearGuessOptions(d, 3);
            d.yearguesses.forEach(function (year) {
                ret.tac.push(["button", {type:"button", id:yearButtonId(year),
                                         onclick:jt.fs("app.dlg.guessyear(" +
                                                       year + ")")},
                              year]); });
            ret.date = ["span", {id:"dlgdatespan"}, 
                        ["span", {id:"dlgdatequestion"}, "When?"]]; }
        else {
            ret.tac = [["div", {cla:"buttontimelinesdiv"},
                        [["span", {cla:"buttontimelineslabelspan"}, 
                          "Timelines: "],
                         timelineNamesCSV(d.code)]],
                       ["button", {type:"button", id:"nextbutton",
                                   onclick:jt.fs("app.dlg.button()")},
                        "Continue"]];
            ret.focid = "nextbutton";
            ret.date = ["span", {id:"dlgdatespan"}, d.dispdate]; }
        return ret;
    }


    function showInfoDialog (d) {
        var buttons, html;
        tl.dlgdat = d;
        buttons = infoButtons(d);
        html = [["div", {id:"dlgdatediv"}, buttons.date],
                ["div", {id:"dlgcontentdiv"},
                 ["div", {cla:"dlgtextdiv", id:"dlgtextdiv"},
                  [["div", {cla:"dlgpicdiv", id:"dlgpicdiv"}, infoPicHTML(d)],
                   d.text]]],
                ["div", {id:"dlgbuttondiv"}, buttons.tac]];
        displayDialog(d, jt.tac2html(html));
        d.interact = {start:new Date()};
        //setting focus the first time does not work for whatever
        //reason, but it helps for subsequent dialog displays.
        if(buttons.focid) {
            setTimeout(function () { jt.byId(buttons.focid).focus(); }, 500); }
    }


    function closeInteractionTimeTracking () {
        var inter = tl.dlgdat.interact;
        inter.end = new Date();
        tl.dlgdat.duration = app.db.getElapsedTime(inter.start, inter.end);
        inter.elapsed = tl.dlgdat.duration / 10;  //seconds
    }


    function buttonPress (answer) {
        var inter = tl.dlgdat.interact;
        if(answer) {
            inter.answer = answer; }
        if(answer && answer !== buttonText.yes) {
            tl.dlgdat.remembered = jt.byId("cbremember").checked; }
        closeInteractionTimeTracking();
        app.mode.next();
    }


    function yearGuessButtonPress (year) {
        var pt = tl.dlgdat;
        if(pt.start.year === year) {
            closeInteractionTimeTracking();
            jt.out("dlgdatediv", jt.tac2html(
                ["span", {id:"dlgdatespan"}, pt.dispdate]));
            pt.yearguesses.forEach(function (year) {
                jt.byId(yearButtonId(year)).disabled = true; });
            setTimeout(app.mode.next, 1000); }
        else {
            jt.byId(yearButtonId(year)).disabled = true;
            jt.out("dlgdatequestion", 
                   jt.byId("dlgdatequestion").innerHTML + "?");
            pt.yearguesscount = pt.yearguesscount || 1;
            pt.yearguesscount += 1; }
    }


    function showSaveConfirmationDialog (nextfstr) {
        var html, subj, body, levinf = app.lev.progInfo();
        levinf.savenum = Math.floor(levinf.levPtsVis / levinf.savelen);
        subj = "Race History restore link";
        body = "Click this link to restore your browser state:\n" +
            "http://localhost:8080?" + app.db.getStateURLParams();
        html = [["div", {cla: "dlgsavediv"},
                 [["div", {id: "dlgsavelevinfdiv"}, 
                   "Level " + levinf.level + " Save " + levinf.savenum],
                  ["div", {id: "dlgsavetitlediv"}, "Progress saved."],
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
        if(mode) {  //e.g. "reference"
            app.mode.chmode(mode); }
    }


    return {
        init: function (timeline) { tl = timeline; },
        start: function (clickfstr) { showStartDialog(clickfstr); },
        info: function (d, nextfstr) { showInfoDialog(d, nextfstr); },
        close: function (mode) { closeDialog(mode); },
        button: function (answer) { buttonPress(answer); },
        guessyear: function (year) { yearGuessButtonPress(year); },
        save: function (nextfstr) { showSaveConfirmationDialog(nextfstr); },
        nextColorTheme: function () { nextColorTheme(); }
    };
}());
