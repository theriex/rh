/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.tabular = (function () {
    "use strict";

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
                  "Sep", "Oct", "Nov", "Dec"],
        dnld = {srchst:"", opts:[{format:"html", name:"Document (HTML)"},
                                 {format:"pdf", name:"Document (PDF)"},
                                 {format:"tsv", name:"Spreadsheet (TSV)"},
                                 {format:"json", name:"JavaScript (JSON)"},
                                 {format:"none", name:"Nevermind"}]},
        tlflds = {},
        currtl = null,
        dbtl = null;


    function dateSpan (dobj, prefix) {
        var sc, pd;
        if(!dobj || !dobj.year) {
            return ""; }
        prefix = prefix || "";
        sc = prefix? "tdspan" : "tdspanyo";
        if(dobj.year > 0) {
            pd = prefix + dobj.year; }
        else {
            pd = prefix + (dobj.year * -1) + " " + jt.tac2html(
                ["span", {cla: "bcespan"}, "BCE"]); }
        if(dobj.month) {
            sc = "tdspan";
            pd += months[dobj.month - 1]; }
        if(dobj.day) {
            pd += dobj.day; }
        return jt.tac2html(["span", {cla: sc}, pd]);
    }


    function cleanTDValue (text) {
        text = text.replace(/\t/g, " ");
        text = text.replace(/\n/g, " ");
        return text;
    }


    function textIntroHTML () {
        var html = "";
        app.data.suppvis.forEach(function (sv) {
            var sm = sv.module;
            if(sv.menuselect) {
                if(app[sm]) {
                    sm = jt.tac2html(
                        ["a", {href:"#" + sm,
                               onclick:jt.fs("app." + sm + ".display()")},
                         sv.name]); }
                else {
                    sm = "<i>" + sv.name + "</i>"; }
                if(html) {
                    html += ", "; }
                html += sm; } });
        html = "Supplemental visualizations: " + html + ".";
        html = "<b><i>Reference mode</i></b>: To filter the display, enter text to match. You can also select a point grouping. " + html;
        return html;
    }


    function pointTAC (pt, idx) {
        var ddc = pt.remembered ? "trowdescdivrem" : "trowdescdiv",
            ddt = idx ? pt.text : textIntroHTML(),
            code, html;
        code = pt.code.replace(/U/g, "");
        code = code.replace(/D/g, "");
        html = ["div", {cla:"trowdiv"},
                [["div", {cla:"trowdatediv"},
                  [dateSpan(pt.start),
                   ["br"],
                   dateSpan(pt.end, "-"),
                   ["span", {cla:"tcspan"}, " (" + code + ") "]]],
                 ["div", {cla:ddc}, ddt]]];
        return html;
    }


    function getHTMLDataURI () {
        var txt = "<!doctype html>\n<html>\n<head>\n" +
            "<meta http-equiv=\"Content-Type\"" + 
            " content=\"text/html; charset=UTF-8\" />\n" +
            "<title>U.S. Race History Data</title>\n" +
            "<style>\n" +
            ".trowdiv { padding-bottom:10px; }\n" +
            ".trowdatediv { display:table-cell; min-width:80px;\n" +
            "  padding-right:10px; text-align:right; }\n" +
            ".trowdescdiv, .trowdescdivrem { display:table-cell;\n" + 
            "  font-size:medium; }\n" +
            ".trowdescdivrem { font-weight:bold; }\n" +
            ".tcspan { font-size:small; font-style:italic; }\n" +
            ".tdspan { font-size:small; }\n" +
            ".tdspanyo { font-size:large; }\n" +
            ".bcespan { font-size:x-small; font-style:italic;\n" + 
            "  font-weight:bold; }\n" +
            "</style>\n" +
            "</head><body>";
        app.data.pts.forEach(function (pt, idx) {
            if(idx && (!dnld.srchst || app.mode.ptmatch(pt))) {
                txt += "\n" + jt.tac2html(pointTAC(pt, idx)); } });
        txt += "</body></html>\n";
        return "data:text/html;charset=utf-8," + encodeURIComponent(txt);
    }


    function getTSVDataURI () {
        var txt = "Date\tText\n";
        app.data.pts.forEach(function (pt, idx) {
            if(idx && (!dnld.srchst || app.mode.ptmatch(pt))) {
                txt += pt.date + "\t" + cleanTDValue(pt.text) + "\n"; } });
        return "data:text/plain;charset=utf-8," + encodeURIComponent(txt);
    }


    function getJSONDataURI () {
        var txt, pts = [];
        app.data.pts.forEach(function (pt, idx) {
            if(idx && (!dnld.srchst || app.mode.ptmatch(pt))) {
                pts.push(pt); } });
        txt = JSON.stringify(pts);
        return "data:text/plain;charset=utf-8," + encodeURIComponent(txt);
    }


    function selectDownloadOption (idx) {
        var dlopt = dnld.opts[idx];
        switch(dlopt.format) {
        case "html":
            jt.out("downloadactiondiv", jt.tac2html(
                ["a", {id:"downloadactionlink", href:getHTMLDataURI(),
                       download:"rh.html",
                       onclick:jt.fsd("app.dlg.close()")},
                 [["img", {src: "img/download.png"}],
                  ["span", {id:"downloadactiontextspan"}, 
                   "Download HTML"]]]));
            break;
        case "pdf":
            jt.out("downloadactiondiv", jt.tac2html(
                ["a", {id:"downloadactionlink", href:"#printToPDF",
                       onclick:jt.fs("app.dlg.close();window.print();")},
                 [["img", {src: "img/download.png"}],
                  ["span", {id:"downloadactiontextspan"}, 
                   "Print to PDF"]]]));
            break;
        case "tsv":
            jt.out("downloadactiondiv", jt.tac2html(
                ["a", {id:"downloadactionlink", href:getTSVDataURI(),
                       download:"rh.tsv",
                       onclick:jt.fsd("app.dlg.close()")},
                 [["img", {src: "img/download.png"}],
                  ["span", {id:"downloadactiontextspan"}, 
                   "Download TSV"]]]));
            break;
        case "json":
            jt.out("downloadactiondiv", jt.tac2html(
                ["a", {id:"downloadactionlink", href:getJSONDataURI(),
                       download:"rh.json",
                       onclick:jt.fsd("app.dlg.close()")},
                 [["img", {src: "img/download.png"}],
                  ["span", {id:"downloadactiontextspan"}, 
                   "Download JSON"]]]));
            break;
        case "none":
            jt.out("downloadactiondiv", jt.tac2html(
                ["a", {id:"downloadactionlink", href:"#close",
                       onclick:jt.fs("app.dlg.close()")},
                 ["span", {id:"downloadactiontextspan"},
                  "Close Menu"]]));
            break;
        default:
            jt.out("downloadactiondiv", "Unknown Format"); }
    }


    function showDownloadDialog () {
        var html = [];
        html.push(["div", {id:"dloptseltitlediv"}, "Download File Format"]);
        dnld.opts.forEach(function (opt, idx) {
            html.push(
                ["div", {cla:"dloptseldiv"},
                 [["input", {type:"radio", name:"dloptr", value:opt.format,
                             id:"dldrad" + opt.format, checked:jt.toru(!idx),
                             onchange:jt.fs("app.tabular.dldrad(" + idx +")")}],
                  ["label", {fo:"dldrad" + opt.format, cla:"dlformatlabel"},
                   opt.name]]]); });
        html.push(["div", {id:"downloadactiondiv"}]);
        html = ["div", {id:"downloadoptsdiv"}, html];
        app.dlg.show(jt.tac2html(html));
        app.tabular.dldrad(0);
    }


    function verifyDisplayElements () {
        var html, tlopts;
        if(jt.byId("pointsdispdiv")) {  //already set up
            return; }
        tlopts = [["option", {value:""}, "All"]];
        app.data.ptcs.forEach(function (tl) {
            if(tl.type !== "marker") {
                tlopts.push(["option", {value:tl.code}, 
                             tl.ident + " (" + tl.name + ")"]); } });
        html = [["div", {id:"tlctxdiv"}, ""],  //timeline context
                ["div", {id:"ptfilterdiv"},  //point filtering
                 [["input", {type:"text", id:"srchin", size:25,
                             placeholder:"Filter text...",
                             value:app.mode.searchstate().qstr, 
                             oninput:jt.fs("app.mode.updatesrch()")}],
                  ["span", {cla:"srchinspan"}, "&nbsp;in&nbsp;"],
                  ["select", {id:"tlsel", style:"width:64px;",
                              onchange:jt.fs("app.mode.updatesrch()")}, 
                   tlopts]]],
                ["div", {id:"downloadlinkdiv"}, ""],
                ["div", {id:"pointsdispdiv"}, ""]];
        jt.out("tcontdiv", jt.tac2html(html));
    }


    function display (srchst) {
        var outdiv;
        verifyDisplayElements();
        outdiv = jt.byId("pointsdispdiv");
        jt.out("downloadlinkdiv", jt.tac2html(
            ["span", {cla:"procspan"}, "Processing..."]));
        outdiv.innerHTML = "";
        dnld.srchst = srchst;
        app.data.pts.forEach(function (pt, idx) {
            var linediv;
            if(!srchst || app.mode.ptmatch(pt)) {
                linediv = document.createElement("div");
                linediv.innerHTML = jt.tac2html(pointTAC(pt, idx));
                outdiv.appendChild(linediv); } });
        jt.out("downloadlinkdiv", jt.tac2html(
            ["a", {href:"#Download", id:"downloadlink",
                   title:"Download the displayed points",
                   onclick:jt.fs("app.tabular.showDownloadDialog")},
             [["img", {src:"img/download.png", cla:"downloadlinkimg"}],
              "Download"]]));
    }


    function timelineSelectHTML () {
        var html = [], btls = JSON.parse(app.user.acc.built || "[]");
        //PENDING: sort btls alphabetically, set selection index to current tl
        if(!btls.length) {
            btls = [{tlid:"none", name:""}]; }
        btls.push({tlid:"new", name:"New&nbsp;Timeline"});
        btls.forEach(function (btl) {
            html.push(["option", {value:btl.tlid}, btl.name]); });
        html = ["select", {name:"tlselname", id:"tlselname",
                           onchange:jt.fs("app.tabular.tledchg()")},
                html];
        return html;
    }


    function timelineSettingsHTML () {
        var html = [];
        currtl = currtl || {instid:"", name:"", slug:"", comment:""};
        if(currtl.id) {
            html.push(["div", {cla:"dlgformline"},
                       [["label", {fo:"idin", cla:"wlab", id:"labidin"}, 
                         "Id"],
                        ["input", {type:"text", cla:"wfin",
                                   name:"idin", id:"idin", 
                                   value:currtl.instid, disabled:true}]]]); }
        html.push(["div", {cla:"dlgformline"},
                   [["label", {fo:"namein", cla:"wlab", id:"labnamein"},
                     "Name"],
                    ["input", {type:"text", cla:"wfin",
                               name:"namein", id:"namein",
                               onchange:jt.fs("app.tabular.tledchg()"),
                               value:currtl.name}]]]);
        //if(app.user && app.user.acc.orgid && app.user.acc.lev >= 1) {
        if(true) {
            html.push(["div", {cla:"dlgformline"},
                       [["label", {fo:"slugin", cla:"wlab", id:"labslugin"},
                         "Slug"],
                        ["input", {type:"text", cla:"wfin",
                                   name:"slugin", id:"slugin",
                                   value:currtl.slug, disabled:true}]]]); }
        html.push(["div", {cla:"dlgformline"},
                   [["label", {fo:"commentin", cla:"wlab", id:"labcommentin"},
                     "Comment"],
                    ["input", {type:"text", cla:"wfin",
                               name:"commentin", id:"commentin",
                               value:currtl.comment}]]]);
        html.push(["div", {cla:"dlgformline", id:"tlrndmaxdiv"},
                   [["label", {fo:"tlrndmaxin", cla:"wlab", id:"labtlrndmaxin"},
                     "Max Display"],
                    ["input", {type:"number", cla:"wfin",
                               name:"tlrndmaxin", id:"tlrndmaxin", 
                               value:tlflds.maxpts || 18}]]]);
        html.push(["div", {cla:"dlgformline", id:"ppsindiv"},
                   [["label", {fo:"ppsin", cla:"wlab", id:"labppsin"},
                     "Points/Save"],
                    ["input", {type:"number", cla:"wfin",
                               name:"ppsin", id:"ppsin",
                               value:tlflds.pps || 6}]]]);
        html.push(["div", {id:"tlsavestatdiv"}]);
        html.push(["div", {cla:"buttonsdiv"},
                   ["button", {type:"button", id:"etlsetokbutton",
                               onclick:jt.fs("app.tabular.savetl()")},
                    "Save"]]);
        return html;
    }


    function editTimeline () {
        var html;
        app.mode.chmode("reference");  //verify correct display
        html = [["div", {id:"etlselpropdiv"},
                 [timelineSelectHTML(),
                  ["a", {href:"#settings",
                         onclick:jt.fs("app.tabular.tlset()")},
                   ["img", {src:"img/settings.png", cla:"formicoimg"}]],
                  ["div", {id:"tltypeseldiv", cla:"formseldiv"},
                   ["select", {name:"tlseltype", id:"tlseltype",
                               onchange:jt.fs("app.tabular.tledchg()")},
                    [["option", {value:"Points"}, "Points"],
                     ["option", {value:"Timelines"}, "Timelines"]]]],
                  ["div", {id:"tlseqseldiv", cla:"formseldiv"},
                   ["select", {name:"tlselseq", id:"tlselseq",
                               onchange:jt.fs("app.tabular.tledchg()")},
                    [["option", {value:"Sequential"}, "Sequential"],
                     ["option", {value:"Random"}, "Random"]]]]]],
                ["div", {id:"etlsetdiv", style:"display:none;"}, 
                 timelineSettingsHTML()],
                ["div", {id:"etlseldiv"}, "selection stuff goes here"]];
        jt.out("tlctxdiv", jt.tac2html(html));
        app.tabular.tledchg();
    }


    function timelineSettings () {
        var div = jt.byId("etlsetdiv");
        if(div.style.display === "none") {
            div.style.display = "block"; }
        else {
            div.style.display = "none"; }
    }


    function selectval (selid) {
        var sel = jt.byId(selid);
        if(!sel) {
            jt.log("selectval unable to find element " + selid); }
        return sel.options[sel.selectedIndex].value;
    }


    function slugify (str) {
        str = str.toLowerCase().replace(/\s/g, "");
        return str;
    }


    function setDisplayInputFieldsFromTimeline (tl) {
        var elems = tl.ctype.split(":");
        if(elems[0] === "Timelines") {
            jt.byId("tlseltype").value = "Timelines"; }
        else {
            jt.byId("tlseltype").value = "Points";
            jt.byId("ppsin").value = elems[1] || 6;
            if(elems[0] === "Random") {
                jt.byId("tlselseq").value = "Random";
                jt.byId("tlrndmaxin").value = elems[2] || 18; }
            else {
                jt.byId("tlselseq").value = "Sequential"; } }
        jt.byId("namein").value = tl.name;
        jt.byId("slugin").value = tl.slug;
        jt.byId("commentin").value = tl.comment;
    }
            
                
    function timelineEditFieldChange () {
        var currtl, tlid;
        tlflds = {selname: selectval("tlselname")};
        //hide all display inputs
        jt.byId("tltypeseldiv").style.display = "none";
        jt.byId("tlseqseldiv").style.display = "none";
        jt.byId("tlrndmaxdiv").style.display = "none";
        jt.byId("ppsindiv").style.display = "none";
        if(tlflds.selname === "none") {
            return; }
        if(tlflds.selname === "new") {  //open settings if not already done
            if(jt.byId("etlsetdiv").style.display === "none") {
                timelineSettings(); } }
        else { 
            tlid = tlflds.selname;
            app.user.tls = app.user.tls || {};
            currtl = app.user.tls[tlid];
            if(!currtl) {
                jt.call("GET", "fetchtl?tlid=" + tlid, null,
                        function (result) {
                            app.user.tls[result[0].instid] = result[0];
                            timelineEditFieldChange(); },
                        function (code, errtxt) {
                            jt.log("tlefc " + code + " " + errtxt);
                            jt.err("Timeline fetch " + code + " " + errtxt); },
                        jt.semaphore("tabular.timelineEditFieldChange"));
                return; }  //don't unhide until data available
            setDisplayInputFieldsFromTimeline(currtl); }
        //unhide appropriate display inputs
        jt.byId("tltypeseldiv").style.display = "inline-block";
        tlflds.type = selectval("tlseltype");
        if(tlflds.type === "Points") {
            jt.byId("ppsindiv").style.display = "block";
            jt.byId("tlseqseldiv").style.display = "inline-block";
            tlflds.seq = selectval("tlselseq");
            if(tlflds.seq === "Random") {
                jt.byId("tlrndmaxdiv").style.display = "block";
                tlflds.rndmax = jt.byId("tlrndmaxin").value; } }
        tlflds.name = jt.byId("namein").value || "";
        if(jt.byId("slugin")) {
            jt.byId("slugin").value = slugify(tlflds.name); }
    }


    function saveTimeline () {
        currtl.name = jt.byId("namein").value;
        if(jt.byId("slugin")) {
            currtl.slug = jt.byId("slugin").value; }
        currtl.comment = jt.byId("commentin").value;
        currtl.ctype = selectval("tlseltype");
        if(currtl.ctype === "Points") {
            if(selectval("tlselseq") === "Random") {
                currtl.ctype = "Random"; }
            currtl.ctype += ":" + jt.byId("ppsin").value;
            if(currtl.ctype.startsWith("Random")) {
                currtl.ctype += ":" + jt.byId("tlrndmaxin").value; } }
        //read selected cids here
        jt.log("saveTimeline parameters:");
        Object.keys(currtl).forEach(function (field) {
            jt.log("    " + field + ": " + currtl[field]); });
        jt.call("POST", "updtl?" + app.auth(), jt.objdata(currtl),
                function (result) {
                    dbtl = result[0];
                    currtl = Object.assign({}, dbtl);
                    app.user.acc = result[1]
                    editTimeline(); },  //redraw reflecting new/updated name
                function (code, errtxt) {
                    jt.log("saveTimeline " + code + " " + errtxt);
                    jt.out("tlsavestatdiv", errtxt); },
                jt.semaphore("tabular.saveTimeline"));
    }


    return {
        display: function () { display(); },
        search: function (srchst) { display(srchst); },
        showDownloadDialog: function () { showDownloadDialog(); },
        dldrad: function (idx) { selectDownloadOption(idx); },
        tledit: function () { editTimeline(); },
        tlset: function () { timelineSettings(); },
        tledchg: function () { timelineEditFieldChange(); },
        savetl: function () { saveTimeline(); }
    };
}());
