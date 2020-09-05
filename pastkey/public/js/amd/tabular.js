/*jslint browser, white, fudge, for, long */
/*global app, window, jt, d3, alert */

app.tabular = (function () {
    "use strict";

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
                  "Sep", "Oct", "Nov", "Dec"];
    var dnld = {srchst:"", opts:[{format:"html", name:"Document (HTML)"},
                                 {format:"pdf", name:"Document (PDF)"},
                                 {format:"tsv", name:"Spreadsheet (TSV)"},
                                 {format:"txt", name:"Slides Outline (TXT)"},
                                 {format:"json", name:"JavaScript (JSON)"},
                                 {format:"none", name:"Nevermind"}]};
    var tlflds = {};
    var currtl = null;
    var dbtl = null;
    var ptflds = {};
    var pf = null;
    var tlsetflds = null;
    var tlsetfldopts = [];
    var mode = "refdisp";  //tledit
    var currpts = null;
    var edcmds = ["new", "copy", "cpsrc"];
    var wsv = {};  //working set values (keywords and year range from points)
    var mcr = {};  //match criteria for points to display


    function dateSpan (dobj, prefix) {
        var sc; var pd;
        if(!dobj || !dobj.year) {
            return ""; }
        prefix = prefix || "";
        sc = (prefix? "tdspan" : "tdspanyo");
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


    function mayEditPoint (pt) {  //if pt is null, returns may create
        if(!app.user.acc || !app.user.acc.lev) {
            return false; }
        if(pt && app.user && app.user.acc && 
           app.user.acc.orgid !== pt.orgid && 
           app.user.acc.orgid !== "1") {
            return false; } 
        if(app.user.acc.lev > 1 || !pt) {
            return true; }
        //pt.created should be defined if edited post 18jul05. just in case..
        if(pt.created && pt.created.split(";")[1] === app.user.acc.instid) {
            return true; }
        return false;
    }


    function pointPicTAC (pt, deco) {
        var ph = "";
        if(pt.pic && deco !== "solohtml") {
            ph = ["div", {cla:"txtpicdiv"},
                  ["img", {src:app.ptimgsrc(pt), cla:"txtpicimg"}]]; }
        return ph;
    }


    function pointButtonsTAC (pt, deco) {
        var buttons = []; var divs = [];
        //refs
        if(pt.refs && pt.refs.length) {
            buttons.push([" &nbsp;",
                          ["a", {href:"#refs" + pt.instid, cla:"editlink",
                                 onclick:jt.fs("app.toggledivdisp('ptrdiv" +
                                               pt.instid + "')")},
                           "[refs]"]]);
            divs.push(["div", {id:"ptrdiv" + pt.instid, cla:"ptxdiv",
                               style:"display:none"},
                       app.dlg.refsListHTML(pt.refs)]); }
        //edit
        if(mode === "tledit" && mayEditPoint(pt) && deco !== "solohtml") {
            buttons.push([" &nbsp;",
                          ["a", {href:"#edit", cla:"editlink", 
                                 id:"editlink" + pt.instid,
                                 onclick:jt.fs("app.dlg.ptedit('" + 
                                               ((pt && pt.instid) || "") + 
                                               "')")},
                           "[edit]"]]); }
        return buttons.concat(divs);
    }


    function titleForModule (name) {
        if(!app.moduleDefsByName) {
            app.moduleDefsByName = {};
            app.modules.forEach(function (md) {
                app.moduleDefsByName[md.name] = md; }); }
        return app.moduleDefsByName[name].title;
    }


    function pointCheckboxTAC(pt, deco) {
        var html = ""; var si;
        if(mode === "tledit" && deco !== "solohtml") {
            if(pt.sv) {
                html = ["div", {cla:"ptseldiv"}, 
                        "sv: " + titleForModule(pt.sv)]; }
            else {
                si = {type:"checkbox", id:"cb" + pt.instid,
                      onchange:jt.fs("app.tabular.togptsel('" + 
                                     pt.instid + "')")};
                if(currtl && currtl.cids && 
                   currtl.cids.csvcontains(pt.instid)) {
                    si.checked = "checked"; }
                html = ["div", {cla:"ptseldiv"},
                        [["label", {fo:"cb" + pt.instid}, "Include"],
                         ["input", si]]]; } }
        return html;
    }


    function spdAttrVal (attr, val) {
        var html = ["div", {cla:"spdavdiv"},
                    [["span", {cla:"spdattrspan"}, attr + ": "],
                     ["span", {cla:"spdvalspan"}, val]]];
        return html;
    }


    function showPointDetails (event, ptid) {
        var pt = app.db.pt4id(ptid, currpts);
        var html = []; var qt; var pdiv; var pos;
        if(!pt) {
            jt.log("showPointDetails pt " + ptid + " not found");
            return; }
        pdiv = jt.byId("popupdiv");
        if(pdiv.style.visibility === "visible") {
            pdiv.style.visibility = "hidden";  //already displayed, toggle off
            return; }
        qt = pt.qtype || "C";
        html.push(["div", {id:"dlgxdiv", 
                           onclick:jt.fs("app.dlg.closepop()")}, "X"]);
        html.push(spdAttrVal(qt, app.qts[qt]));
        if(pt.tagCodes && pt.tagCodes.indexOf("r") >= 0) {
            html.push(["div", {cla:"ptremdiv"}, "&#x2605; Remembered"]); }
        app.keyflds.forEach(function (field) {
            if(pt[field]) {
                html.push(["div", {cla:"spdsecdiv"}, field.capitalize()]);
                pt[field].csvarray().forEach(function (key) {
                    html.push(["div", {cla:"spdkeydiv"}, key]); }); } });
        html.push(spdAttrVal("id", pt.instid));
        if(pt.source) {
            html.push(spdAttrVal("source", pt.source)); }
        html.push(spdAttrVal("orgid", pt.orgid));
        html.push(spdAttrVal("timecode", pt.tc));
        jt.out("popupdiv", jt.tac2html(html));
        pos = jt.geoXY(event);
        pdiv.style.left = pos.x + "px";
        pdiv.style.top = pos.y + "px";
        pdiv.style.visibility = "visible";
    }


    function pointCodesTAC (pt) {
        var html = []; var qt = pt.qtype || "C";
        if(pt.tagCodes && pt.tagCodes.indexOf("r") >= 0) {
            html.push(" ");
            html.push(["a", {href:"#Remember", title:"Remembered",
                             onclick:jt.fs("app.tabular.ptdet(event,'" + 
                                           pt.instid + "')")},
                       "&#x2605;"]); }
        html.push(" ");
        html.push(["a", {href:"#Details", title:app.qts[qt],
                         onclick:jt.fs("app.tabular.ptdet(event,'" + 
                                       pt.instid + "')")},
                   qt]);
        html.push(" ");
        return html;
    }


    function pointTAC (pt, deco) {
        var html = "";
        html = ["div", {cla:"trowdiv", id:"trowdiv" + pt.instid},
                [["a", {id:"pt" + pt.instid}],  //static anchor for refs
                 ["div", {cla:"trowdatediv"}, 
                  [dateSpan(pt.start),
                   ["br"],
                   dateSpan(pt.end, "-"),
                   ["span", {cla:"tcspan"}, pointCodesTAC(pt)],
                   pointCheckboxTAC(pt, deco)]],
                 ["div", {cla:"trowdescdiv"}, 
                  [pointPicTAC(pt, deco),
                   //onclick function won't work if standalone html, but 
                   //href anchors  should still work if anchor available.
                   app.db.ptlinktxt(pt, currpts, "app.tabular.scr2pt"),
                   " &nbsp;",
                   pointButtonsTAC(pt, deco)]]]];
        return html;
    }


    function scrollToPointId (id) {
        var trowdiv = jt.byId("trowdiv" + id);
        if(trowdiv) {
            trowdiv.scrollIntoView(); }
    }



    ////////////////////////////////////////
    // Data Download 
    ////////////////////////////////////////

    function getHTMLDataURI () {
        var txt = "<!doctype html>\n<html>\n<head>\n" +
            "<meta http-equiv=\"Content-Type\"" + 
            " content=\"text/html; charset=UTF-8\" />\n" +
            "<title>PastKey Data</title>\n" +
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
        currpts.forEach(function (pt) {
            txt += "\n" + jt.tac2html(pointTAC(pt, "solohtml")); });
        txt += "\n</body>\n";
        txt += "<script>" +
            "var app = {};" +
            "app.toggledivdisp = function (divid) {" +
            "    var div = document.getElementById(divid);" +
            "    if(div) {" +
            "        if(div.style.display === \"block\") {" +
            "            div.style.display = \"none\"; }" +
            "        else {" +
            "            div.style.display = \"block\"; } }" +
            "};</script>\n";
        txt += "</html>\n";
        return "data:text/html;charset=utf-8," + encodeURIComponent(txt);
    }


    function getTSVDataURI () {
        var txt = "Date\tText\n";
        currpts.forEach(function (pt) {
            txt += pt.date + "\t" + cleanTDValue(pt.text) + "\n"; });
        return "data:text/plain;charset=utf-8," + encodeURIComponent(txt);
    }


    function getTXTDataURI () {
        var txt = "";
        currpts.forEach(function (pt) {
            var paras = pt.text.split("\n");
            txt += pt.date + "\n";
            paras.forEach(function (para) {
                txt += "    " + para + "\n"; });
            txt += "\n"; });
        return "data:text/plain;charset=utf-8," + encodeURIComponent(txt);
    }


    function getJSONDataURI () {
        //provide the full url for each pic to allow for easier retrieval
        currpts.forEach(function (pt) {
            var base = window.location.protocol + "//" + window.location.host;
            pt.picurl = "";
            if(pt.pic) {
                pt.picurl = base + app.ptimgsrc(pt, "exporturl"); } });
        var txt = JSON.stringify(currpts);
        return "data:text/plain;charset=utf-8," + encodeURIComponent(txt);
    }


    function selectDownloadOption (idx) {
        var dlopt = dnld.opts[idx]; var filebase = "pastkey";
        if(currtl && currtl.slug) {
            filebase = currtl.slug; }
        switch(dlopt.format) {
        case "html":
            jt.out("downloadactiondiv", jt.tac2html(
                ["a", {id:"downloadactionlink", href:getHTMLDataURI(),
                       download:filebase + ".html",
                       onclick:jt.fsd("app.dlg.close()")},
                 [["img", {src:app.dr("img/download.png")}],
                  ["span", {id:"downloadactiontextspan"}, 
                   "Download HTML"]]]));
            break;
        case "pdf":
            jt.out("downloadactiondiv", jt.tac2html(
                ["a", {id:"downloadactionlink", href:"#printToPDF",
                       onclick:jt.fs("app.dlg.close();window.print();")},
                 [["img", {src:app.dr("img/download.png")}],
                  ["span", {id:"downloadactiontextspan"}, 
                   "Print to PDF"]]]));
            break;
        case "tsv":
            jt.out("downloadactiondiv", jt.tac2html(
                ["a", {id:"downloadactionlink", href:getTSVDataURI(),
                       download:filebase + ".tsv",
                       onclick:jt.fsd("app.dlg.close()")},
                 [["img", {src:app.dr("img/download.png")}],
                  ["span", {id:"downloadactiontextspan"}, 
                   "Download TSV"]]]));
            break;
        case "txt":
            jt.out("downloadactiondiv", jt.tac2html(
                ["a", {id:"downloadactionlink", href:getTXTDataURI(),
                       download:filebase + ".txt",
                       onclick:jt.fsd("app.dlg.close()")},
                 [["img", {src:app.dr("img/download.png")}],
                  ["span", {id:"downloadactiontextspan"}, 
                   "Download TXT"]]]));
            break;
        case "json":
            jt.out("downloadactiondiv", jt.tac2html(
                ["a", {id:"downloadactionlink", href:getJSONDataURI(),
                       download:filebase + ".json",
                       onclick:jt.fsd("app.dlg.close()")},
                 [["img", {src:app.dr("img/download.png")}],
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


    ////////////////////////////////////////
    // Publishing and Featuring 
    ////////////////////////////////////////

    function initPubFeatDef () {
        var pubopts = ["Unlisted", "Listed", "Obs M/D", "Obs M/W", "Promoted"];
        var mpre = {Jan:"-01", Feb:"-02", Mar:"-03", Apr:"-04",
                    May:"-05", Jun:"-06", Jul:"-07", Aug:"-08",
                    Sep:"-09", Oct:"-10", Nov:"-11", Dec:"-12"};
        var wpre = {"1st":"-W1", "2nd":"-W2", "3rd":"-W3", "4th":"-W4"};
        var dpre = {Sun:"-D0", Mon:"-D1", Tue:"-D2", Wed:"-D3",
                    Thu:"-D4", Fri:"-D5", Sat:"-D6"};
        pf = {
            keys: ["featype", "obmonth", "obdate", "obon", "obweek", "obday"],
            vizval:function (key) {
                var sel = jt.byId(key + "sel");
                if(sel.style.display !== "none") {
                    return sel.options[sel.selectedIndex].value; }
                return ""; },
            featype:{
                opts:pubopts,
                selmf:function (opt, tl) {
                    var ft = tl.featured || "";
                    switch(opt) {
                        case "Obs M/D": return ft.match(/-\d\d-\d\d?/);
                        case "Obs M/W": return ft.indexOf("-D") >= 0;
                        default: return ft === opt; } },
                vizf:function () {
                    return true; }},
            obmonth:{
                opts:Object.keys(mpre),
                selmf:function (opt, tl) {
                    var cv = tl.featured;
                    if(cv && cv.indexOf(mpre[opt]) >= 0) {
                        return true; } },
                vizf:function () {
                    return pf.vizval("featype").indexOf("M/") >= 0; }},
            obdate:{
                type:"daynuminput",
                vizf:function () {
                    return pf.vizval("featype") === "Obs M/D"; }},
            obon:{
                type:"texton",
                vizf:function () {
                    return pf.vizval("featype") === "Obs M/W"; }},
            obweek:{
                opts:Object.keys(wpre),
                selmf:function (opt, tl) {
                    var cv = tl.featured;
                    if(cv && cv.indexOf(wpre[opt]) >= 0) {
                        return true; } },
                vizf:function () {
                    return pf.vizval("featype") === "Obs M/W"; }},
            obday:{
                opts:Object.keys(dpre),
                selmf:function (opt, tl) {
                    var cv = tl.featured;
                    if(cv && cv.indexOf(dpre[opt]) >= 0) {
                        return true; } },
                vizf:function () {
                    return pf.vizval("featype") === "Obs M/W"; }}};
        pf.mpre = mpre;
        pf.wpre = wpre; 
        pf.dpre = dpre;
        return pf;
    }
    

    function makeFeaturedSel (key) {
        var html = [];
        pf[key].opts.forEach(function (opt, idx) {
            var optattrs = {id:key + "opt" + idx, value:opt};
            if(pf[key].selmf(opt, currtl)) {
                optattrs.selected = "selected"; }
            html.push(["option", optattrs, opt]); });
        var selattrs = {id:key + "sel", cla:"pubobsel", style:"display:none",
                        onchange:jt.fs("app.tabular.featchg()")};
        return jt.tac2html(["select", selattrs, html]);
    }


    function featuredSettingsHTML () {
        pf = pf || initPubFeatDef();
        var html = [];
        pf.keys.forEach(function (key) {
            if(pf[key].type === "daynuminput") {
                html.push(["input", {id:key + "in", cla:"daynumin", value:1, 
                                     min:1, max:31, style:"display:none"}]); }
            else if(pf[key].type === "texton") {
                html.push(["em", {id:key + "em", style:"display:none"}, 
                           "on"]); }
            else if(pf[key].opts) {
                html.push(makeFeaturedSel(key)); } });
        return jt.tac2html(html);
    }


    function setFeaturedInputsFromTimeline (tl) {
        pf = pf || initPubFeatDef();
        var fv = tl.featured || "";
        pf.keys.forEach(function (key) {
            if(pf[key].type === "daynuminput") {
                var val = fv.match(/-\d\d-(\d\d?)/);
                if(val) {
                    val = Number(val[1]); }
                else {
                    val = 1; }
                jt.byId(key + "in").value = val; }
            else if(pf[key].opts) {
                pf[key].opts.forEach(function (opt, idx) {
                    var optelem = jt.byId(key + "opt" + idx);
                    var selval = false;
                    if(pf[key].selmf(opt, tl)) {
                        selval = true; }
                    //jt.log("setFeatured... " + opt + " " + selval);
                    optelem.selected = selval; }); } });
        var promopt = jt.byId("featypeopt4");  //Promoted
        if(tl.svs) {
            promopt.disabled = false; }
        else {
            promopt.disabled = true; }
        app.tabular.featchg();
    }


    function featuredSelChange () {
        pf.keys.forEach(function (key) {
            var sel = jt.byId(key + "sel");
            if(!sel) {
                sel = jt.byId(key + "in"); }
            if(!sel) {
                sel = jt.byId(key + "em"); }
            if(sel) {
                if(pf[key].vizf()) {
                    sel.style.display = "initial"; }
                else {
                    sel.style.display = "none"; } } });
    }


    function getFeaturedValueFromInputs (tl) {
        var ft = pf.vizval("featype");
        switch(ft) {
        case "Obs M/D": 
            ft = pf.mpre[pf.vizval("obmonth")] + "-" + 
                jt.byId("obdatein").value;
            break;
        case "Obs M/W": 
            ft = pf.mpre[pf.vizval("obmonth")] +
                pf.wpre[pf.vizval("obweek")] + pf.dpre[pf.vizval("obday")];
            break; }
        if(tl.featured && tl.featured !== ft && !app.featuredTLManualUpdate) {
            alert("It can take up to 48 hours for the change to " + ft +
                  " to take effect.");
            app.featuredTLManualUpdate = true; }  //note we told them
        return ft;
    }


    ////////////////////////////////////////
    // Timeline Editing
    ////////////////////////////////////////

    //options is a [] {value, text, selected, group}.  If group changes
    function makeSelect (domid, onchangestr, options) {
        var spec = {id:domid, chgstr:onchangestr, opts:options};
        return {
            ctrlHTML: function () {
                var st = {html:[], group:"", gopts:null};
                spec.opts.forEach(function (opt) {
                    var attributes = {value:opt.value, id:"opt" + opt.value};
                    if(opt.selected) {
                        attributes.selected = "selected"; }
                    if(opt.group) {  //push option into optgroup
                        if(opt.group !== st.group) {  //create new optgroup
                            st.group = opt.group;
                            st.gopts = [];
                            st.html.push(["optgroup", {label:opt.group},
                                          st.gopts]); }
                        st.gopts.push(["option", attributes, 
                                       opt.text || opt.value]); }
                    else {  //not grouped option
                        st.html.push(["option", attributes,
                                      opt.text || opt.value]); } });
                return jt.tac2html(["select", {name:spec.id, id:spec.id,
                                               onchange:spec.chgstr},
                                    st.html]); },
            setValue: function (val) {
                jt.byId(spec.id).value = val; },
            getValue: function () {
                var val = ""; var sel = jt.byId(spec.id);
                if(sel) {  //display might not be ready yet
                    val = sel.options[sel.selectedIndex].value; }
                return val; },
            domid: function () { return spec.id; } };
    }


    function pointTotals (tl) {
        var sum = {pts:0, words:0, minutes:0}; var ids;
        if(tl.cids && tl.cids.length) {
            //as points are added or removed, only cids field is updated
            ids = tl.cids.split(",");
            sum.pts = ids.length;
            ids.forEach(function (ptid) {
                var pt = app.db.pt4id(ptid, tl.points);
                if(pt) {
                    sum.words += pt.text.split(" ").length; } }); }
        //People read english out loud at around ~200 wpm.  Point text is
        //fairly dense.  Figure about 4 seconds for button press.
        sum.minutes = Math.round(sum.words / 180) + 
            Math.round(sum.pts * 4 / 60);
        return sum;
    }


    function pointsTotalSummary (tl) {
        var ts = {pts:0, words:0, minutes:0}; var tls = [];
        if(tl.ctype === "Timelines" && tl.cids) {
            tl.cids.split(",").forEach(function (tlid) {
                tls.push(app.user.tls[tlid]); }); }
        else {
            tls.push(tl); }
        tls.forEach(function (ct) {
            var sum = pointTotals(ct);
            ts.pts += sum.pts;
            ts.words += sum.words;
            ts.minutes += sum.minutes; });
        return "pts: " + ts.pts + ", words: " + ts.words + ", ~" + 
            ts.minutes + " mins";
    }


    function initTimelineSettingsFields () {
        tlsetfldopts = ["oninput", "min", "max"];
        tlsetflds = [
            {field:"instid", type:"info", 
             getf:function (tl) { return "id# " + tl.instid; }},
            {field:"name", type:"text", place:"main page timeline name",
             oninput:jt.fs("app.tabular.dfltslug()")},
            {field:"slug", type:"text", place:"shortandunique"},
            {field:"title", type:"text", place:"start dialog large text"},
            {field:"subtitle", type:"text", place:"start dialog other text"},
            {field:"featured", type:"ui"},
            {field:"lang", type:"text", place:"en-US"},
            {field:"comment", type:"text", place:"optional overlay start text"},
            {field:"about", type:"text", place:"closing acknowledge text"},
            {field:"ctype", type:"ui"},
            {field:"cids", type:"ui"},
            {field:"svs", type:"ui"},
            {field:"tlrndmax", dispname:"Select", type:"number",
             min:3, max:900, getf:function () { return tlflds.maxpts || 18; }},
            {field:"pps", dispname:"Pts/Save", type:"number",
             min:3, max:50, getf:function () { return tlflds.pps || 6; }},
            {field:"url", type:"info",
             getf:function (tl) { 
                 var url = app.db.timelineURL(tl);
                 return jt.tac2html(
                     ["a", {href:url,
                            onclick:jt.fs("window.open('" + url + "')")},
                      url.slice(8)]); }},
            {field:"ptcounts", type:"info", getf:pointsTotalSummary}];
        tlsetflds.forEach(function (sf) {
            if(!sf.getf) {
                sf.getf = function (tl) { return tl[sf.field]; }; } });
    }


    function updatePointWorkingSetValues (pt) {
        if(pt.start.year < wsv.yr.min) {
            wsv.yr.min = pt.start.year; }
        if(pt.start.year > wsv.yr.max) {
            wsv.yr.max = pt.start.year; }
        app.keyflds.forEach(function (field) {
            if(pt[field]) {
                pt[field].csvarray().forEach(function (keyval) {
                    wsv[field] = wsv[field] || {};
                    wsv[field][keyval] = wsv[field][keyval] || 0;
                    wsv[field][keyval] += 1; }); } });
    }


    function updatePointWorkingSetDisplay () {
        var yrin; var keyiconsrc = "keyicon.png";
        yrin = jt.byId("yearstartin");
        if(yrin) {
            yrin.setAttribute("min", wsv.yr.min);
            yrin.setAttribute("max", wsv.yr.max);
            if(wsv.yr.matching === "off") {
                yrin.value = wsv.yr.min; } }
        yrin = jt.byId("yearendin");
        if(yrin) {
            yrin.setAttribute("min", wsv.yr.min);
            yrin.setAttribute("max", wsv.yr.max);
            if(wsv.yr.matching === "off") {
                yrin.value = wsv.yr.max; } }
        app.keyflds.forEach(function (field) {
            if(mcr[field]) {
                keyiconsrc = "keyicongold.png"; } });
        jt.byId("keyiconimg").src = app.dr("img/" + keyiconsrc);
    }


    function resetPointWorkingSetValues (datematching) {
        datematching = datematching || "on";
        currpts = [];
        wsv.yr = {min:5000, max:-25000, matching:datematching};
        app.keyflds.forEach(function (field) {
            wsv[field] = null; });
    }


    function initPointWorkingSetValues () {
        resetPointWorkingSetValues("off");
        app.allpts.forEach(function (pt) {
            updatePointWorkingSetValues(pt); });
    }


    function timelineSelectHTML () {
        var btls = []; var selopts = []; var dcon;
        app.user.acc.built.forEach(function (tl) {
            btls.push(tl); });
        btls.sort(function (a, b) {
            if(a.name < b.name) { return -1; }
            if(a.name > b.name) { return 1; }
            return 0; });
        if(!btls.length) {  //use placeholder so they can select what to do
            btls = [{tlid:"none", name:""}]; }
        //new, copy, cpsrc options
        btls.push({tlid:"new", name:"New&nbsp;Timeline"});
        if(app.user.acc.built.length) {  //setStateToDatabaseTimeline mods name
            btls.push({tlid:"copy", name:"Copy&nbsp;Timeline"}); }
        dcon = app.db.displayContext();
        if(dcon.ds.length === 1 && //source TL not a compound
           app.user.acc.built.every(function (tl) {  //not personally built
               return tl.tlid !== dcon.ds[0].instid; })) {
            btls.push({tlid:"cpsrc", name:"Copy&nbsp;" + dcon.ds[0].name}); }
        //create select from timeline options
        btls.forEach(function (btl) {
            var selopt = {value:btl.tlid, text:btl.name};
            //set selection default to most recently built
            if(app.user.acc.built.length &&
               selopt.value === app.user.acc.built[0].tlid) {
                selopt.selected = "selected"; }
            selopts.push(selopt); });
        tlflds.selname = makeSelect("tlselname",
                                    jt.fs("app.tabular.tledchg('namechg')"),
                                    selopts);
        return tlflds.selname.tac();
    }


    function emptyTimeline () {
        var etl = {};
        tlsetflds.forEach(function (sf) {
            etl[sf.field] = ""; });
        return etl;
    }


    function timelineChanged () {
        if(!dbtl) {  //no existing timeline fetched from db, currtl is unsaved
            return true; }
        return !tlsetflds.every(function (sf) {
            return currtl[sf.field] === dbtl[sf.field]; });
    }


    function tlsetButtonsHTML () {
        return ["div", {cla:"buttonsdiv", id:"etlsetbuttonsdiv"},
                [["button", {type:"button", id:"etlsetcancelbutton",
                             onclick:jt.fs("app.tabular.canctl()")},
                  "Cancel"],
                 ["button", {type:"button", id:"etlsetokbutton",
                             onclick:jt.fs("app.tabular.savetl()")},
                  "Save"]]];
    }


    function slugify (str) {
        str = str.toLowerCase().replace(/\s/g, "");
        return str;
    }


    function provideDefaultSlugValue () {
        var slugin = jt.byId("slugin");
        if(slugin && !currtl.slug) {
            slugin.value = slugify(jt.byId("namein").value); }
    }


    function isEditSettingsField (sf) {
        if(sf.type === "text" || sf.type === "number") {
            if(sf.field !== "slug" || 
               (app.user && app.user.acc.orgid && app.user.acc.lev >= 1)) {
                return true; } }
        return false;
    }


    function timelineSettingsFieldsHTML () {
        var html = [];
        tlsetflds.forEach(function (sf) {
            var inobj;
            if(sf.field === "featured") {
                html.push(["tr", {id:"tlsetfeaturedtr"},
                           ["td", {colspan:2},
                            featuredSettingsHTML()]]); }
            else if(isEditSettingsField(sf)) {
                inobj = {type:sf.type, value:sf.getf(currtl),
                         id:sf.field + "in", name:sf.field + "in",
                         cla:"av" + sf.type + "in"};
                if(sf.place) {
                    inobj.placeholder = sf.place; }
                tlsetfldopts.forEach(function (opt) {
                    if(sf[opt]) {
                        inobj[opt] = sf[opt]; } });
                html.push(["tr", {id:"tlset" + sf.field + "tr"},
                           [["td", {cla:"labtd"},
                             ["label", {fo:sf.field + "in"},
                              sf.dispname || sf.field.capitalize()]],
                            ["td",
                             ["input", inobj]]]]); } });
        html = ["table", {cla:"attrvaltable"}, html];
        return html;
    }


    function timelineInfoFieldsHTML () {
        var html = [];
        tlsetflds.forEach(function (sf) {
            if(sf.type === "info") {
                html.push(["div", {id:"info" + sf.field + "div",
                                   cla:"dlgformline"}, 
                           sf.getf(currtl)]); } });
        html = ["div", {id:"etlinfocontdiv"}, html];
        return html;
    }


    function toggleInfoSettings () {
        var setdiv = jt.byId("tlsettingsdispdiv");
        var infodiv = jt.byId("tlinfodispdiv");
        var img = jt.byId("setinfoimg");
        if(setdiv.style.display === "block") {
            infodiv.style.height = setdiv.offsetHeight + "px";
            img.src = app.dr("img/infolit.png");
            setdiv.style.display = "none";
            infodiv.style.display = "block"; }
        else {
            img.src = app.dr("img/info.png");
            setdiv.style.display = "block";
            infodiv.style.display = "none"; }
    }


    function timelineSettingsHTML () {
        var html;
        currtl = currtl || emptyTimeline();
        html = ["div", {id:"etlsetcontdiv"},
                [["div", {id:"etlsetidiv"},
                  ["a", {href:"#info", onclick:jt.fs("app.tabular.togseti()")},
                   ["img", {id:"setinfoimg", src:app.dr("img/info.png")}]]],
                 ["div", {id:"tlsettingsdispdiv", style:"display:block;"},
                  timelineSettingsFieldsHTML()],
                 ["div", {id:"tlinfodispdiv", style:"display:none;"},
                  timelineInfoFieldsHTML()],
                 ["div", {id:"tlsavestatdiv"}],
                 tlsetButtonsHTML()]];
        return html;
    }


    function editTimeline () {
        mode = "tledit"; 
        jt.byId("tlctxdiv").style.display = "block";
        tlflds.seltype = makeSelect("tlseltype", jt.fs("app.tabular.tledchg()"),
                                    [{value:"Points"}, {value:"Timelines"}]);
        tlflds.selseq = makeSelect("tlselseq", jt.fs("app.tabular.tledchg()"),
                                   [{value:"Sequential"}, {value:"Random"}]);
        var html = [["div", {id:"etlselpropdiv"},
                 [timelineSelectHTML(),
                  ["a", {href:"#settings",
                         onclick:jt.fs("app.tabular.tlset()")},
                   ["img", {src:app.dr("img/settings.png"), cla:"formicoimg"}]],
                  ["div", {id:"tltypeseldiv", cla:"formseldiv"},
                   tlflds.seltype.tac()],
                  ["div", {id:"tlseqseldiv", cla:"formseldiv"},
                   tlflds.selseq.tac()]]],
                ["div", {id:"etlsetdiv", style:"display:none;"}, 
                 timelineSettingsHTML()]];
        jt.out("tlctxdiv", jt.tac2html(html));
        app.tabular.tledchg("namechg");  //init dependent fields for name sel
        app.tabular.featchg();  //hide irrelevant publishing and obs fields
        app.tabular.ptdisp();
    }


    function timelineSettings (spec) {
        var div; var st = {};
        div = jt.byId("etlsetdiv");
        if(!div) {  //not editing timeline, probably editing point directly
            return; }
        st.prev = div.style.display;
        if(spec === "required") {
            div.style.display = "block"; }
        else if(spec === "ifchanged") {
            if(timelineChanged()) {
                div.style.display = "block"; }
            else {
                div.style.display = "none"; } }
        else {  //toggle
            if(div.style.display === "none") {
                div.style.display = "block"; }
            else {
                div.style.display = "none"; } }
        st.now = div.style.display;
        //jt.log("st.prev: " + st.prev + ", st.now: " + st.now);
        if(st.prev !== st.now) {
            //jt.log("timelineSettings changing pointsdispdiv height");
            dispmgr.adjustPointsAreaDisplayHeight(); }
    }


    function setDisplayInputFieldsFromTimeline (tl) {
        var ctype = tl.ctype || "Points:6";
        var elems = ctype.split(":");
        if(elems[0] === "Timelines") {
            tlflds.seltype.setValue("Timelines"); }
        else {
            tlflds.seltype.setValue("Points");
            tlflds.pps = Number(elems[1]) || 6;
            jt.byId("ppsin").value = tlflds.pps;
            if(elems[0] === "Random") {
                tlflds.selseq.setValue("Random");
                jt.byId("tlrndmaxin").value = elems[2] || 18; }
            else {
                tlflds.selseq.setValue("Sequential"); } }
        setFeaturedInputsFromTimeline(tl);
        tlsetflds.forEach(function (sf) {
            if(isEditSettingsField(sf)) {
                jt.byId(sf.field + "in").value = sf.getf(currtl); }
            else if(sf.type === "info") {
                jt.out("info" + sf.field + "div", sf.getf(currtl)); } });
    }
            
                
    function setStateToDatabaseTimeline (tl) {
        dbtl = tl;
        currtl = Object.assign({}, dbtl);
        app.user.tls = app.user.tls || {};
        app.user.tls[dbtl.instid] = dbtl;
        jt.out("optcopy", "Copy&nbsp;" + tl.name);
    }


    function cancelTimelineEdit() {
        jt.out("etlsetbuttonsdiv", "Canceling...");
        setTimeout(function () {  //force display update to hide buttons
            if(dbtl) {
                setStateToDatabaseTimeline (dbtl); }
            timelineSettings();  //toggle closed
            app.tabular.ptdisp();
            jt.out("etlsetbuttonsdiv", jt.tac2html(tlsetButtonsHTML())); },
                   50);
    }


    function fetchTimeline (tlid) {
        jt.call("GET", "/api/fetchtl?tlid=" + tlid, null,
                function (result) {
                    result.forEach(function (tl) {
                        app.db.deserialize("Timeline", tl);
                        app.db.prepData(tl);  //caches tl.points
                        app.user.tls[tl.instid] = tl; });
                    setStateToDatabaseTimeline(result[0]);
                    app.tabular.ptdisp("reset");
                    app.tabular.tledchg("namechg"); },
                function (code, errtxt) {
                    jt.log("tlefc " + code + " " + errtxt);
                    jt.err("Timeline fetch " + code + " " + errtxt); },
                jt.semaphore("tabular.fetchTimeline"));
    }


    function notePointScrollPosition () {
        var outdiv = jt.byId("pointsdispdiv");
        if(!outdiv) {
            return; }
        ptflds.scrollpcnt = outdiv.scrollTop / outdiv.scrollHeight;
        //jt.log("notePointScrollPosition " + ptflds.scrollpcnt);
    }


    function restorePointScrollPosition () {
        var outdiv = jt.byId("pointsdispdiv");
        if(!outdiv) {
            return; }
        outdiv.scrollTop = Math.round(ptflds.scrollpcnt * outdiv.scrollHeight);
        //jt.log("restorePointScrollPosition " + outdiv.scrollTop);
    }


    function hideTLTypeFields () {
        jt.byId("tltypeseldiv").style.display = "none";
        jt.byId("tlseqseldiv").style.display = "none";
        jt.byId("tlsettlrndmaxtr").style.display = "none";
        jt.byId("tlsetppstr").style.display = "none";
    }


    function unhideTLTypeFields () {
        timelineSettings("ifchanged");  //show detail fields and save button
        jt.byId("tltypeseldiv").style.display = "inline-block";
        tlflds.type = tlflds.seltype.getValue();
        if(tlflds.type === "Points") {
            jt.byId("tlsetppstr").style.display = "table-row";
            jt.byId("tlseqseldiv").style.display = "inline-block";
            if(tlflds.selseq.getValue() === "Random") {
                jt.byId("tlsettlrndmaxtr").style.display = "table-row";
                tlflds.rndmax = jt.byId("tlrndmaxin").value; } }
        tlflds.name = jt.byId("namein").value || "";
        if(jt.byId("slugin")) {
            tlflds.slug = jt.byId("slugin").value || slugify(tlflds.name); }
        tlflds.title = jt.byId("titlein").value || "";
        tlflds.subtitle = jt.byId("subtitlein").value || "";
    }


    function timelineNameChangeReady () {
        var tlid; var newtl; var dcon;
        tlflds.name = tlflds.selname.getValue();
        if(tlflds.name === "none") {
            currtl = null;
            return false; } 
        if(edcmds.indexOf(tlflds.name) >= 0) {
            newtl = emptyTimeline();  //"new"
            if(tlflds.name === "copy") {
                newtl.lang = currtl.lang;
                newtl.ctype = currtl.ctype;
                newtl.cids = currtl.cids;
                newtl.svs = currtl.svs; }
            if(tlflds.name === "cpsrc") {
                dcon = app.db.displayContext();
                newtl.lang = dcon.ds[0].lang;
                newtl.ctype = dcon.ds[0].ctype;
                newtl.cids = dcon.ds[0].cids;
                newtl.svs = dcon.ds[0].svs; }
            currtl = newtl;
            if(tlflds.seltype.getValue() === "Timelines") {
                currtl.ctype = "Timelines"; }
            setDisplayInputFieldsFromTimeline(currtl);
            timelineSettings("required"); }
        else {
            tlid = tlflds.name;
            app.user.tls = app.user.tls || {};
            if((!currtl || currtl.instid !== tlid) && app.user.tls[tlid]) {
                setStateToDatabaseTimeline(app.user.tls[tlid]); }
            if(!currtl || currtl.instid !== tlid) {
                fetchTimeline(tlid);
                return false; }  //nothing to display until TL retrieved
            if(currtl) {
                setDisplayInputFieldsFromTimeline(currtl); } }
        return true;
    }


    function timelineEditFieldChange (context) {
        notePointScrollPosition();
        hideTLTypeFields();  //hide all data dependent fields
        if(context === "namechg") {
            mcr = {};
            app.dlg.closepop();
            if(!timelineNameChangeReady()) {
                return; } }  //fetching timeline, or "none", or otherwise done
        unhideTLTypeFields();  //unhide appropriate data dependent fields
        restorePointScrollPosition();
        if(context !== "showsave") {  //redraw the points display
            app.tabular.ptdisp("reset"); }  //shows timelines or suppviz also
    }


    function saveTimeline () {
        jt.out("etlsetbuttonsdiv", "Saving...");
        currtl.name = jt.byId("namein").value;
        if(jt.byId("slugin")) {
            currtl.slug = jt.byId("slugin").value; }
        currtl.title = jt.byId("titlein").value;
        currtl.subtitle = jt.byId("subtitlein").value;
        currtl.featured = getFeaturedValueFromInputs(currtl);
        currtl.comment = jt.byId("commentin").value;
        currtl.about = jt.byId("aboutin").value;
        currtl.ctype = tlflds.seltype.getValue();
        if(currtl.ctype === "Points") {
            if(tlflds.selseq.getValue() === "Random") {
                currtl.ctype = "Random"; }
            currtl.ctype += ":" + jt.byId("ppsin").value;
            if(currtl.ctype.startsWith("Random")) {
                currtl.ctype += ":" + jt.byId("tlrndmaxin").value; } }
        //cids already updated
        currtl.preb = "";  //rebuilt by server
        // jt.log("saveTimeline parameters:");
        // Object.keys(currtl).forEach(function (field) {
        //     jt.log("    " + field + ": " + currtl[field]); });
        jt.call("POST", "/api/updtl?" + app.auth(), app.refmgr.postdata(currtl),
                function (result) {
                    app.db.deserialize("Timeline", result[0]);
                    setStateToDatabaseTimeline(result[0]);
                    app.db.deserialize("AppUser", result[1]);
                    app.user.acc = result[1];
                    editTimeline();  //redraw reflecting new/updated name
                    jt.out("etlsetbuttonsdiv", jt.tac2html(tlsetButtonsHTML()));
                    dispmgr.adjustPointsAreaDisplayHeight(); },
                function (code, errtxt) {
                    jt.log("saveTimeline " + code + " " + errtxt);
                    jt.out("etlsetbuttonsdiv", jt.tac2html(tlsetButtonsHTML()));
                    jt.out("tlsavestatdiv", errtxt); },
                jt.semaphore("tabular.saveTimeline"));
    }


    function makeMatchFromSearch(str) {
        var patsubs = ["i.?i"];
        var charsubs = ["[e,é]", "[a,á]", "[n,ñ]"];
        var idx; var jdx;
        if(!str) {
            return null; }
        str = str.toLowerCase();
        patsubs.forEach(function (sub) {
            var regx = new RegExp(sub, "g");
            str = str.replace(regx, sub); });
        str = str.split("");
        for(idx = 0; idx < str.length; idx += 1) {
            for(jdx = 0; jdx < charsubs.length; jdx += 1) {
                if(charsubs[jdx].indexOf(str[idx]) >= 0) {
                    str[idx] = charsubs[jdx]; } } }
        str = str.join("");
        return new RegExp(str, "igu");
    }


    function verifyPointMatchCriteria () {
        var dcon;
        mcr.start = Number(jt.byId("yearstartin").value);
        mcr.end = Number(jt.byId("yearendin").value);
        mcr.srch = jt.byId("srchin").value;
        mcr.regx = makeMatchFromSearch(mcr.srch);
        if(ptflds.selpool.getValue() === "Org") {
            mcr.orgid = app.user.acc.orgid; }
        if(ptflds.selpool.getValue() === "Timeline") {
            if(currtl) {  //editing a timeline
                mcr.editingtimeline = true;
                mcr.ids = currtl.cids; }
            else {
                dcon = app.db.displayContext();
                if(!dcon.cids) {
                    dcon.cids = "";
                    dcon.points.forEach(function (pt) {
                        dcon.cids = dcon.cids.csvappend(pt.instid); }); }
                mcr.ids = dcon.cids; } }
        else {  //not viewing timeline points
            mcr.editingtimeline = false;
            mcr.ids = ""; }
        // jt.log("verifyPointMatchCriteria:");
        // Object.keys(mcr).forEach(function (key) {
        //     jt.log("    " + key + ": " + mcr[key]); });
    }


    function isMatchingPoint (pt) {
        var haveReqKeys = true;
        if(mcr.orgid && pt.orgid !== mcr.orgid) {
            return false; }
        if((mcr.ids || mcr.editingtimeline) && 
           !mcr.ids.csvcontains(pt.instid)) {
            return false; }
        updatePointWorkingSetValues(pt);
        if(wsv.yr.matching === "on" &&
           (pt.start.year < mcr.start || pt.start.year > mcr.end)) {
            return false; }
        if(mcr.regx && !pt.text.match(mcr.regx)) {
            return false; }
        app.keyflds.forEach(function (field) {
            if(mcr[field]) {
                haveReqKeys = false;  //one or more checked keywords needed
                mcr[field].csvarray().forEach(function (keyval) {
                    var fcsv = pt[field];
                    keyval = keyval.toLowerCase();
                    if(fcsv && fcsv.toLowerCase().csvcontains(keyval)) {
                        haveReqKeys = true; } }); } });
        return haveReqKeys;
    }


    function displayPointFilters (val, all) {
        if(all && val === "none") {
            jt.byId("ptdpsel").style.display = val; }
        else if(val !== "none") {
            jt.byId("ptdpsel").style.display = val; }
        jt.byId("ptfilterdiv").style.display = val;
        jt.byId("yearstartin").style.display = val;
        jt.byId("srchinspan").style.display = val;
        jt.byId("yearendin").style.display = val;
    }


    function updateTimelinesDisplay () {
        var tls = []; var accflds = ["remtls", "built", "completed"]; 
        var html = [];
        accflds.forEach(function (fld) {
            app.user.acc[fld].forEach(function (tl) {
                if(tl.tlid !== currtl.instid) {
                    tls.push({tlid:tl.tlid, name:tl.name}); } }); });
        tls.sort(function (a, b) {
            var aidx = currtl.cids.indexOf(a.tlid);
            var bidx = currtl.cids.indexOf(b.tlid);
            if(aidx >= 0 && bidx < 0) { return -1; }
            if(aidx < 0 && bidx >= 0) { return 1; }
            if(aidx < bidx) { return -1; }
            if(aidx > bidx) { return 1; }
            if(a.name < b.name) { return -1; }
            if(a.name > b.name) { return 1; }
            return 0; });
        //use the suppviz display classes and ids for consistent presentation
        tls.forEach(function (tl) {
            var si = "";
            if(mode === "tledit") {
                si = {type:"checkbox", id:"cb" + tl.tlid,
                      onchange:jt.fs("app.tabular.togtlsel('" + 
                                     tl.tlid + "')")};
                if(currtl && currtl.cids && currtl.cids.csvcontains(tl.tlid)) {
                    si.checked = "checked"; }
                si = ["span", {cla:"ptseldiv"},
                      [["label", {fo:"cb" + tl.tlid}, "Include"],
                       ["input", si]]]; }
            html.push(["div", {cla:"svlistdiv"},
                       [["div", {cla:"svlistnamediv"}, 
                         [si, 
                          ["span", {cla:"svlistnamespan"}, tl.name]]]]]); });
        html = ["div", {id:"svsdispdiv"}, html]; 
        jt.out("pointsdispdiv", jt.tac2html(html));
    }


    function updateSuppvizDisplay () {
        var html = [];
        app.modules.forEach(function (sv) {
            var si = "";
            if(sv.type === "sv") {
                if(mode === "tledit") {
                    si = {type:"checkbox", id:"cb" + sv.name,
                          onchange:jt.fs("app.tabular.togsvsel('" + 
                                         sv.name + "')")};
                    if(currtl && currtl.svs && 
                       currtl.svs.csvcontains(sv.name)) {
                        si.checked = "checked"; }
                    si = ["span", {cla:"ptseldiv"},
                          [["label", {fo:"cb" + sv.name}, "Include"],
                           ["input", si]]]; }
                html.push(["div", {cla:"svlistdiv"},
                           [["div", {cla:"svlistnamediv"},
                             [si,
                              ["a", {href:"#run" + sv.name,
                                     onclick:jt.fs("app.tabular.runsv('" + 
                                                   sv.name + "')")},
                               ["span", {cla:"svlistnamespan"}, sv.title]]]],
                            //PENDING: "more..." link to sv about text.
                            ["div", {cla:"svlistdescdiv"}, sv.desc]]]); } });
        html = ["div", {id:"svsdispdiv"}, html]; 
        jt.out("pointsdispdiv", jt.tac2html(html));
    }


    function cacheSuppVizPoints () {
        app.modules.forEach(function (md) {
            var sv; var pts;
            if(md.type === "sv") {
                sv = app[md.name];
                if(sv.datapoints) {
                    pts = sv.datapoints();
                    app.db.prepPointsArray(pts);
                    app.db.cachePoints(pts); } } });
    }


    function fetchPubPoints () {
        var ptsfile = "docs/pubpts.json";
        if(app.localdev()) {
            ptsfile = "docs/locpts.json"; }
        jt.call("GET", ptsfile, null,
                function (result) {
                    //PENDING: fetch recent updates and integrate
                    app.pubpts = result;  //note fetched
                    app.db.prepPointsArray(result);
                    app.db.cachePoints(result);
                    cacheSuppVizPoints();
                    app.tabular.ptdisp("reset"); },
                function (code, errtxt) {
                    jt.err("Fetch pubpts failed " + code + " " + errtxt); },
                jt.semaphore("tabular.fetchPubPoints"));
        //no value to return and nothing to do until points are available.
    }


    function pointsDispHeaderHTML (currpts) {
        var html = [];
        var name = (currtl && currtl.name) || "";
        var counts = {pts:0, pics:0, dates:0, unusual:0};
        var txt = "No points, ";
        var create = "";
        if(name) {
            txt = name + " has no points, "; }
        if(!currpts.length) {
            html.push(["div", {cla:"pointsdispline"},
                       [txt,
                        ["a", {href:"#allpts", id:"allptslink",
                               onclick:jt.fs("app.tabular.shall()")},
                         "show all available datapoints"]]]); }
        currpts.forEach(function (pt) {
            counts.pts += 1;
            if(pt.qtype === "D") {
                counts.dates += 1; }
            if(pt.qtype === "U") {
                counts.unusual += 1; }
            if(pt.pic) {
                counts.pics += 1; } });
        if(mcr.editingtimeline) {
            if(app.user.acc.orgid && app.user.acc.orgid !== "0") {
                create = ["a", {href:"#newpoint", id:"createpointlink",
                                onclick:jt.fs("app.dlg.ptedit('create')")},
                          "Create New DataPoint"]; }
            html.push(["div", {cla:"pointsdispline"},
                       [create,
                        ["span", {id:"ptscountspan"},
                         counts.pts + " points" +
                         ", " + counts.pics + " pics" +
                         ", " + counts.dates + " date required" +
                         ", " + counts.unusual + " lesser known"]]]); }
        return jt.tac2html(html);
    }


    function fetchorg (cbf) {
        var url = "getorg?" + app.auth() + "&orgid=" + app.user.acc.orgid +
            jt.ts("&cb=", "second");
        jt.call("GET", url, null,
                function (orgs) {
                    if(orgs.length && orgs[0]) {
                        app.db.deserialize("Organization", orgs[0]);
                        app.db.prepPointsArray(orgs[0].recpre);
                        app.db.cachePoints(orgs[0].recpre);
                        app.user.org = orgs[0];
                        cbf(); } },
                function (code, errtxt) {
                    jt.log("fetchorg failed " + code + ": " + errtxt); },
                jt.semaphore("tabular.fetchorg"));
    }


    function updatePointsDisplay (command) {
        var outdiv = jt.byId("pointsdispdiv");
        jt.out("downloadlinkdiv", jt.tac2html(
            ["img", {src:app.dr("img/wait.png"), cla:"downloadlinkimg"}]));
        outdiv.innerHTML = "";
        if(tlflds && tlflds.seltype && 
           tlflds.seltype.getValue() === "Timelines") {
            displayPointFilters("none", true);
            return updateTimelinesDisplay(); }
        if(ptflds.selpool.getValue() === "Suppviz") {
            displayPointFilters("none");
            return updateSuppvizDisplay(); }
        displayPointFilters("initial");
        resetPointWorkingSetValues((command === "reset")? "off" : "on");
        if(!app.pubpts) {
            outdiv.innerHTML = jt.tac2html(["div", {cla:"pointsdispline"},
                                            "Fetching default points..."]);
            return fetchPubPoints(); }  //calls back when downloaded
        if(ptflds.selpool.getValue() === "Org" && !app.user.org) {
            outdiv.innerHTML = jt.tac2html(["div", {cla:"pointsdispline"},
                                            "Fetching organization points..."]);
            return fetchorg(updatePointsDisplay); }
        verifyPointMatchCriteria();
        app.allpts.forEach(function (pt) {
            if(isMatchingPoint(pt)) {
                currpts.push(pt); } });
        updatePointWorkingSetDisplay();
        outdiv.innerHTML = pointsDispHeaderHTML(currpts);
        currpts.forEach(function (pt) {
            var linediv;
            if(!pt.stats || pt.stats.status !== "deleted") {
                linediv = document.createElement("div");
                linediv.innerHTML = jt.tac2html(pointTAC(pt));
                outdiv.appendChild(linediv); } });
        jt.out("downloadlinkdiv", jt.tac2html(
            ["a", {href:"#Download", id:"downloadlink",
                   title:"Download the displayed points",
                   onclick:jt.fs("app.tabular.showDownloadDialog")},
             ["img", {src:app.dr("img/download.png"),
                      cla:"downloadlinkimg"}]]));
    }


    function togglePointInclude (ptid) {
        var seln = tlflds.selname.getValue();
        if(edcmds.indexOf(seln) >= 0) {  //new, copy, cpsrc
            jt.err("Name and save your new timeline"); }
        if(currtl.cids.csvcontains(ptid)) {
            currtl.cids = currtl.cids.csvremove(ptid); }
        else {
            currtl.cids = currtl.cids.csvappend(ptid); }
        tlsetflds.forEach(function (sf) {
            if(sf.type === "info") {
                jt.out("info" + sf.field + "div", sf.getf(currtl)); } });
        app.tabular.tledchg("showsave");
    }


    function redisplayPoint (pt, datechg) {
        var ptdiv;
        ptdiv = jt.byId("trowdiv" + pt.instid);
        if(!datechg && ptdiv) {  //point already displayed, redisplay content
            ptdiv = ptdiv.parentElement;  //enclosing div
            if(pt.stats && pt.stats.status === "deleted") {
                ptdiv.style.display = "none"; }
            ptdiv.innerHTML = jt.tac2html(pointTAC(pt)); }
        else { //point not currently displayed, or sorting needed
            //If currently displaying the timeline points, and this point
            //was not included, then it was added, so update the timeline
            //points before rebuilding the display.
            if(currtl && ptflds.selpool.getValue() === "Timeline") {
                currtl.cids = currtl.cids || "";
                if(!currtl.cids.csvcontains(pt.instid)) {
                    currtl.cids = currtl.cids.csvappend(pt.instid); } }
            //rebuild the display 
            app.tabular.ptdisp(); }
        timelineSettings("required");  //prompt to save timeline changes
    }


    function toggleSuppvizInclude (svmn) {
        currtl.svs = currtl.svs || "";
        if(currtl.svs.csvcontains(svmn)) {
            currtl.svs = currtl.svs.csvremove(svmn); }
        else {
            currtl.svs = currtl.svs.csvappend(svmn); }
        app.tabular.tledchg("showsave");
    }


    function changeToAllPointsDisplay () {
        jt.out("pointsdispdiv", jt.tac2html(
            ["div", {cla:"pointsdispline"},
             "Collecting available datapoints..."]));
        //force display update before recalculating all points (FF60.0)
        setTimeout(function () {
            jt.byId("ptdpsel").selectedIndex = 0;
            //setting selectedIndex does not trigger onchange (FF60.0)
            app.tabular.ptdisp("reset"); }, 50);
    }


    function toggleKeySelDisp (event) {
        var html = []; var pdiv; var pos;
        pdiv = jt.byId("popupdiv");
        if(pdiv.style.visibility === "visible") {
            pdiv.style.visibility = "hidden";
            return; }
        html.push(["div", {id:"dlgxdiv", 
                           onclick:jt.fs("app.dlg.closepop()")}, "X"]);
        app.keyflds.forEach(function (field) {
            var tac = [];
            if(wsv[field]) {
                Object.keys(wsv[field]).forEach(function (key, idx) {
                    var inid = "cb" + field + idx;
                    var chk = mcr[field] && mcr[field].csvcontains(key);
                    var cnt = wsv[field][key];
                    tac.push(["div", {cla:"keycbdiv"},
                              [["input", {type:"checkbox", id:inid,
                                          value:key, checked:jt.toru(chk),
                                          onchange:jt.fs(
                                              "app.tabular.keychk('" +
                                                  field + "'," + idx + ")")}],
                               ["label", {fo:inid}, 
                                key + "&nbsp;(" + cnt + ")"]]]); });
                html.push(["div", {cla:"keyselcatdiv"}, field.capitalize()]);
                html.push(tac); } });
        if(html.length < 2) {
            html.push(["span", {cla:"keycbspan"},
                       "No keywords available &nbsp;"]); }
        jt.out("popupdiv", jt.tac2html(html));
        pos = jt.geoXY(event);
        pdiv.style.left = pos.x + "px";
        pdiv.style.top = pos.y + "px";
        pdiv.style.visibility = "visible";
    }


    function toggleKeyword (field, idx) {
        var key = Object.keys(wsv[field])[idx];
        mcr[field] = mcr[field] || "";
        if(mcr[field].csvcontains(key)) {
            mcr[field] = mcr[field].csvremove(key); }
        else {
            mcr[field] = mcr[field].csvappend(key); }
        updatePointsDisplay();
    }


    function mdfs (mgrfname, ...args) {
        mgrfname = mgrfname.split(".");
        return jt.fs("app.tabular.managerDispatch('" + mgrfname[0] + "','" +
                     mgrfname[1] + "'" + app.paramstr(args) + ")");
    }


    //Aggregation Manager handles which points are available for display.
    var aggmgr = {
        state: {tombstones:{}},
        init: function (mode) {
            aggmgr.state.mode = mode;
            if(mode === "tledit") {
                jt.out("reftitlediv", jt.tac2html(
                    [["div", {cla:"tletldiv"}, "Edit Timeline"],
                     ["div", {cla:"tletrdiv"}, "Mix-In"]])); }
            else { //"refdisp"
                jt.out("reftitlediv", "Reference Mode"); } },
        urlTimeline: function () {
            return app.db.displayContext().lastTL; },
        getTLName: function (tlid) {
            var tl = app.refmgr.cached("Timeline", tlid);
            if(tl) { return tl.name; }
            if(aggmgr.state.tombstones[tlid]) {
                return tlid + " not retrievable"; }
            app.refmgr.getFull("Timeline", tlid, function (tl) {
                if(!tl) {
                    aggmgr.state.tombstones[tlid] = "getTLName"; }
                aggmgr.updateControls();
                aggmgr.tlchg(); });
            return tlid; },  //use the id as the name until retrieved
        getGrouping: function (tl) {
            switch(tl.featured) {
            case "Unlisted": return "Unlisted";
            case "Archived": return "Archived";
            case "Deleted": return "Deleted";
            default: return "Listed"; } },
        isEditableTL: function (tl) {
            return tl.editors && app.user.acc && 
                tl.editors.csvcontains(app.user.acc.dsId); },
        mergeKnownTLs: function (tls, ovrs) {
            ovrs = ovrs || {};
            aggmgr.state.knownTLs = aggmgr.state.knownTLs || {};
            if(!Array.isArray(tls)) {
                if(tls && Object.keys(tls).length) { tls = [tls]; }
                else { tls = []; } }
            tls.forEach(function (tl) {
                tl.dsType = "Timeline";
                tl.dsId = tl.dsId || tl.tlid;
                aggmgr.state.knownTLs[tl.dsId] = {
                    tlid:tl.dsId,
                    name:tl.name || aggmgr.getTLName(tl.dsId),
                    group:ovrs.group || aggmgr.getGrouping(tl),
                    edit:ovrs.editable || aggmgr.isEditableTL(tl)};
                if(aggmgr.state.knownTLs[tl.dsId].group === "Deleted") {
                    delete aggmgr.state.knownTLs[tl.dsId]; } }); },
        collectKnownTimelines: function () {
            if(app.user.acc) {
                //same timeline may be in more than one place, do editable last
                var accflds = ["started", "completed", "remtls", "built"];
                accflds.forEach(function (fld) {
                    if(!Array.isArray(app.user.acc[fld])) {
                        app.user.acc[fld] = []; }
                    aggmgr.mergeKnownTLs(app.user.acc[fld],
                                         {editable:(fld === "built")}); }); }
            if(!aggmgr.state.ftls) {  //featured timelines not available yet
                aggmgr.state.ftls = [];  //continue with none for now
                app.mode.featuredTimelines(function (tls) {
                    aggmgr.state.ftls = tls;
                    aggmgr.updateControls();
                    aggmgr.tlchg(); }); }
            aggmgr.mergeKnownTLs(aggmgr.state.ftls, {group:"Featured"});
            aggmgr.mergeKnownTLs(aggmgr.urlTimeline(), {group:"Current"});
            aggmgr.state.sktls = Object.values(aggmgr.state.knownTLs);
            var so = ["Current", "Featured", "Listed", "Unlisted", "Archived"];
            aggmgr.state.sktls.sort(function (a, b) {
                return so.indexOf(a.group) - so.indexOf(b.group); }); },
        makeTimelineSelector: function (sid, editable) {
            var opts = [];
            if(editable) {
                opts.push({value:"new", text:"New Timeline"}); }
            else {  //mix-in
                opts.push({value:"none", text:"None"}); }
            aggmgr.state.sktls.forEach(function (ktl) {
                if((editable && ktl.edit) || (!editable && !ktl.edit)) {
                    opts.push({value:ktl.tlid, text:ktl.name,
                               group:ktl.group}); } });
            aggmgr.state[sid] = makeSelect(sid, mdfs("aggmgr.tlchg", sid),
                                           opts); },
        //The controls are updated on initial display, then potentially
        //again after the current timeline is loaded, and again after the
        //featured timelines are loaded.  Also after a timeline is saved.
        updateControls: function () {
            if(aggmgr.state.mode === "tledit") {
                aggmgr.collectKnownTimelines();
                aggmgr.makeTimelineSelector("edsel", "edit");
                aggmgr.makeTimelineSelector("mixsel");
                if(!jt.byId("tletldiv")) {
                    jt.out("aggctrlsdiv", jt.tac2html(
                        [["div", {cla:"tletldiv", id:"tletldiv"}],
                         ["div", {cla:"tletrdiv", id:"tletrdiv"}],
                         ["div", {id:"tlsettingsdiv"}]])); }
                jt.out("tletldiv", jt.tac2html(
                    [aggmgr.state.edsel.ctrlHTML(),
                     stgmgr.ctrlHTML()]));
                jt.out("tletrdiv", jt.tac2html(
                    aggmgr.state.mixsel.ctrlHTML()));
                aggmgr.setControlValues(); }
            filtmgr.updateControls(); },
        rememberControlValues: function () {
            Object.keys(aggmgr.state.ctrvs).forEach(function (key) {
                if(aggmgr.state[key]) {  //have select control
                    aggmgr.state.ctrvs[key] = aggmgr.state[key].getValue(); }
            }); },
        setControlValues: function () {
            aggmgr.state.ctrvs = aggmgr.state.ctrvs || {edsel:"", mixsel:""};
            Object.keys(aggmgr.state.ctrvs).forEach(function (key) {
                if(aggmgr.state.ctrvs[key]) {
                    aggmgr.state[key].setValue(aggmgr.state.ctrvs[key]); } });
            if(!aggmgr.state.ctrvs.edsel) {  //no previous choice, pick default
                var tl = aggmgr.urlTimeline();
                if(aggmgr.isEditableTL(tl)) {
                    return aggmgr.state.edsel.setValue(tl.dsId); }
                tl = null;
                app.user.acc.built.forEach(function (btl) {
                    if(!tl || tl.modified < btl.modified) {
                        tl = btl; } });
                if(tl) {
                    aggmgr.state.edsel.setValue(tl.tlid); } } },
        tlchg: function (src) {
            if(src === "edsel") {  //new timeline selected for editing
                //PENDING: rebuild mixsel to include all editable timelines
                //not currently selected so you can remix your own stuff.
                stgmgr.toggleSettings("open"); }  //rebuild settings
            aggmgr.rebuildPoints();
            filtmgr.updateControls();
            filtmgr.filterPoints();
            stgmgr.setFocus(); },
        getPoints: function () {
            if(!aggmgr.state.points) {
                aggmgr.rebuildPoints(); }
            return aggmgr.state.points; },
        mergePoints: function (sel) {
            var tlid = sel.getValue();
            if(tlid.match(/\d+/)) {
                var tl = app.refmgr.cached("Timeline", tlid);
                if(tl) {
                    var pts = tl.preb;
                    pts.forEach(function (pt) {
                        pt.srctl = pt.srctl || tl.dsId;  //fill in if legacy
                        if(pt.srctl !== tl.dsId) {
                            pt.mixin = true; } });
                    aggmgr.state.points = aggmgr.state.points.concat(pts);
                    return; }
                if(aggmgr.state.tombstones[tlid]) { return; }
                app.refmgr.getFull("Timeline", tlid, function (tl) {
                    if(!tl) {
                        aggmgr.state.tombstones[tlid] = "mergePoints"; }
                    aggmgr.tlchg(sel.domid()); }); } },
        rebuildPoints: function () {
            if(aggmgr.state.mode !== "tledit") {
                aggmgr.state.points = aggmgr.urlTimeline().preb; }
            else {
                aggmgr.state.points = [];
                aggmgr.mergePoints(aggmgr.state.edsel);
                aggmgr.mergePoints(aggmgr.state.mixsel);
                aggmgr.sortPoints(); } },
        sortPoints: function () {
            aggmgr.state.points.forEach(function (pt) {
                if(!pt.start) { app.db.parseDate(pt); } });
            aggmgr.state.points.sort(function (a, b) {
                return ((a.start.year - b.start.year) ||
                        (a.start.month - b.start.month) ||
                        (a.start.day - b.start.day)); }); },
        currTL: function (tsel) {
            switch(tsel) {
            case "edit": tsel = aggmgr.state.edsel.getValue; break;
            case "mix": tsel = aggmgr.state.mixsel.getValue; break;
            default: tsel = aggmgr.urlTimeline; }
            var tlid = tsel();
            if(tlid.match(/\d+/)) {
                return app.refmgr.cached("Timeline", tlid); }
            return {dsType:"Timeline", dsId:tlid, editors:"", name:tlid,
                    slug:"", title:"", subtitle:"", featured:"", lang:"en-US",
                    comment:"", about:"", kwds:"", ctype:"Points", cids:"",
                    rempts:"", svs:"", preb:[]}; },
        resolvePoint: function (pt, defltpt) {
            if(!pt) { return defltpt || null; }
            if(typeof pt === "string") {
                pt = aggmgr.state.points.find((tp) => pt.dsId === tp.dsId); }
            return pt; },
        addOrUpdatePoint: function (upd) {
            var pts = aggmgr.state.points.filter((pt) => pt.dsId !== upd.dsId);
            pts.push(upd);
            aggmgr.state.points = pts;
            aggmgr.sortPoints(); }
    };


    //Featured field entry manager
    var featmgr = {
        fos: [
            {t:"Unlisted", h:"Not featured in any general timeline listing."},
            {t:"Listed", h:"Ok to recommend to all users."},
            {t:"Obs M/D", h:"Promote annually around the date."},
            {t:"Obs M/W", h: "Promote annually by day of week in month."},
            {t:"Promoted", h:"Promote before Listed but after annuals."},
            {t:"Archived", h:"Unlisted, and sorted below general Unlisted."},
            {t:"Deleted", h:"Not shown, server data eventually cleared."}],
        sels: {
            feat: {sel:null},
            month: {vals:{"-01":"Jan", "-02":"Feb", "-03":"Mar", "-04":"Apr",
                          "-05":"May", "-06":"Jun", "-07":"Jul", "-08":"Aug",
                          "-09":"Sep", "-10":"Oct", "-11":"Nov", "-12":"Dec"}},
            week: {vals:{"-W1":"1st", "-W2":"2nd", "-W3":"3rd",
                         "-W4":"4th"}},
            day: {vals: {"-D0":"Sun", "-D1":"Mon", "-D2":"Tue", "-D3":"Wed",
                         "-D4":"Thu", "-D5":"Fri", "-D6":"Sat"}}},
        value: "Unlisted",
        initSelectors: function () {
            Object.keys(featmgr.sels).forEach(function (selkey) {
                var opts;
                if(selkey === "feat") {
                    opts = featmgr.fos.map(function (fo, idx) {
                        return {value:fo.t, text:fo.t}; }); }
                else {
                    opts = Object.entries(featmgr.sels[selkey].vals)
                        .map(function ([code, disp]) {
                            return {value:code, text:disp}; }); }
                featmgr.sels[selkey].sel = makeSelect(
                    selkey, mdfs("featmgr.featselChange"), opts); }); },
        getHTML: function (tl) {
            if(tl && !tl.featured) { tl.featured = "Unlisted"; }
            if(!featmgr.sels.feat.sel) {
                featmgr.initSelectors(); }
            return jt.tac2html(
                [["span", {id:"featselspan"}, featmgr.sels.feat.sel.ctrlHTML()],
                 " ",  //break here if line too long
                 ["span", {id:"f2selspan"}]]); },
        verifyMonthDateVisible: function () {
            if(!jt.byId("datein")) {  //need to rebuild controls
                jt.out("f2selspan", jt.tac2html(
                    [featmgr.sels.month.sel.ctrlHTML(),
                     ["input", {type:"number", id:"datein", value:1,
                                min:1, max:31}]])); } },
        verifyMonthWeekVisible: function () {
            if(!jt.byId("week")) {  //need to rebuild controls
                jt.out("f2selspan", jt.tac2html(
                    [featmgr.sels.week.sel.ctrlHTML(),
                     featmgr.sels.day.sel.ctrlHTML(),
                     featmgr.sels.month.sel.ctrlHTML()])); } },
        setMonthDate: function (val) {
            var result = "";
            var match = val.match(/(-\d\d)-(\d\d)/);
            if(match) {
                featmgr.verifyMonthDateVisible();
                featmgr.sels.month.sel.setValue(
                    featmgr.sels.month.vals[match[1]]);
                jt.byId("datein").value = Number(match[2]);
                result = "Obs M/D"; }
            return result; },
        setMonthWeek: function (val) {
            var result = "";
            var match = val.match(/(-\d\d)(-W\d)(-D\d)/);
            if(match) {
                featmgr.verifyMonthWeekVisible();
                var selnames = ["month", "week", "day"];
                selnames.forEach(function (selname, idx) {
                    featmgr.sels[selname].setValue(
                        featmgr.sels[selname].vals[match[idx + 1]]); });
                result = "Obs M/W"; }
            return result; },
        setValue: function (val) {
            val = val || "Unlisted";
            featmgr.value = (featmgr.setMonthDate(val) || 
                             featmgr.setMonthWeek(val) || val);
            featmgr.updateHelp(); },
        getValue: function () {
            return featmgr.value; },  //updated by featselChange
        featselChange: function () {
            featmgr.value = featmgr.sels.feat.sel.getValue();
            if(featmgr.value === "Obs M/D") {
                featmgr.verifyMonthDateVisible();
                var din = String(jt.byId("datein").value);
                if(din.length < 2) {
                    din = "0" + din; }
                featmgr.value = featmgr.sels.month.sel.getValue() + "-" + din; }
            else if(featmgr.value === "Obs M/W") {
                featmgr.verifyMonthWeekVisible();
                var selnames = ["month", "week", "day"];
                featmgr.value = selnames.reduce(function (acc, sn) {
                    return acc + featmgr.sels[sn].sel.getValue(); }, ""); }
            else {
                jt.out("f2selspan", ""); }
            featmgr.updateHelp();
            stgmgr.checkForDataChanges(); },
        updateHelp: function () {
            var type = featmgr.sels.feat.sel.getValue() || "Unlisted";
            var fd = featmgr.fos.find((fd) => fd.t === type);
            jt.out("tlsfhdivfeatured", fd.h); }
    };


    //Text field entry manager
    var tfmgr = {
        getHTML: function (tl, fld) {
            var val = "";
            if(tl) {  //may not be available if still fetching data
                val = tl[fld];
                if(fld === "name" && tl.name === "new") {
                    val = ""; } }
            var hfl = mdfs("tfmgr.helpFocusListener", "event");
            var attrs = {cla:"tlsetfldvaldiv", id:"tlsfvd" + fld,
                         contentEditable:"true", "data-fld":fld,
                         onfocus:hfl, onblur:hfl};
            return jt.tac2html(["div", attrs, val]); },
        helpFocusListener: function (event) {
            var fld = event.target.dataset.fld;
            if(event.type === "blur") {
                jt.out("tlsfhdiv" + fld, "");
                if(stgmgr.fdefs[fld].si) {
                    var fvold = aggmgr.currTL("edit")[fld] || "";
                    if(fld === "name" && fvold === "new") {
                        fvold = ""; }
                    var fvin = jt.byId("tlsfvd" + fld);
                    if(!fvin) { return; }
                    var fvnew = fvin.innerText.trim();
                    if(fvold !== fvnew) {
                        stgmgr.save("interim"); } } }
            else if(event.type === "focus") {
                jt.out("tlsfhdiv" + fld, stgmgr.fdefs[fld].h); }
            stgmgr.checkForDataChanges(); },
        getValue: function (fld) {
            return jt.byId("tlsfvd" + fld).innerText.trim(); }
    };


    //Settings Manager handles timeline fields and update.
    var stgmgr = {
        fdefs: {
            name: {si:true, h:"Unique timeline name for reference."},
            slug: {si:true, h:"Unique URL identifier (no spaces, short.)"},
            title: {h:"Timeline name to display in start dialog."},
            subtitle: {h:"Optional second line text for start dialog."},
            comment: {h:"Optional popup text to display when the timeline starts. The name of the continue button can be specified in brackets at the end.  e.g. This timeline is about 10 minutes long [Start]"},
            about: {h:"Optional additional html to include in the timeline full description, as shown on the finish page and elsewhere."},
            featured: {mgr:featmgr, h:"How this timeline may be recommended to others."}},
            //kwds: {custom:"kwdsHTML", h:"Optional types and keywords for use in timeline points.\nCommunities: e.g. African American, Native, Latinx, Asian American\nRegions: e.g. Boston, Puerto Rico, Hawai'i, Southwest\nCategories: e.g. Stats, Awards, Stereotypes\nTags: other timeline specific grouping keywords."}},
        ctrlHTML: function () {
            return jt.tac2html(
                ["a", {href:"#settings", title:"Toggle Timeline field settings",
                       onclick:mdfs("stgmgr.toggleSettings")},
                 ["img", {src:app.dr("img/settings.png"),
                          cla:"formicoimg"}]]); },
        setFocus: function () {
            var sd = jt.byId("tlsettingsdiv");
            if(sd && sd.style.display === "block") {  //settings are visible
                setTimeout(function () {
                    var namediv = jt.byId("tlsfvdname");
                    if(namediv) {
                        if(!namediv.innerText) {
                            jt.log("stgmgr.setFocus name");
                            namediv.focus(); }
                        else {
                            jt.log("stgmgr.setFocus title");
                            jt.byId("tlsfvdtitle").focus(); }}}, 200); } },
        toggleSettings: function (cmd) {
            var sd = jt.byId("tlsettingsdiv");
            if(cmd === "open" || sd.style.display === "none" || !sd.innerHTML) {
                sd.style.display = "block";
                sd.innerHTML = stgmgr.fieldHTML();
                setTimeout(function () {
                    var tl = aggmgr.currTL("edit");
                    if(tl) {  //might not have finished loading yet
                        featmgr.setValue(tl.featured); }
                    stgmgr.setFocus(); }, 50); }
            else {  //was visible, toggle off
                sd.style.display = "none"; } },
        fieldHTML: function () {
            var tl = aggmgr.currTL("edit");
            var html = [];
            Object.entries(stgmgr.fdefs).forEach(function ([fld, def]) {
                var mgr = def.mgr || tfmgr;
                html.push(
                    ["div", {cla:"tlsetfielddiv"},
                     [["div", {cla:"tlsfhdiv", id:"tlsfhdiv" + fld}],
                      ["div", {cla:"tlsetfldentrydiv"},
                       [["div", {cla:"tlsetfldnamediv"}, fld.capitalize()],
                        ["div", {cla:"tlsetfldvalcontdiv"},
                         mgr.getHTML(tl, fld)]]]]]); });
            html.push(["div", {id:"stgsavediv"},
                       [["div", {id:"stgsavemsgdiv"}],
                        ["div", {id:"stgsavebdiv", style:"display:none"},
                         ["button", {type:"button", id:"tlsetsavebutton",
                                     title:"Save Timeline Settings",
                                     onclick:mdfs("stgmgr.save")},
                          "Save"]]]]);
            return jt.tac2html(html); },
        save: function (how) {
            var ui = {bdiv:jt.byId("stgsavebdiv")};
            if(ui.bdiv) {
                jt.out("stgsavemsgdiv", "");  //clear any previous message
                ui.bh = ui.bdiv.innerHTML;    //save button html
                ui.bdiv.innerHTML = "Saving..."; }
            var tldat = stgmgr.settingsData();
            tldat = app.refmgr.postdata(tldat);
            jt.call("POST", "/api/updtl?" + app.auth(), tldat,
                    function (obs) {
                        var tl = app.refmgr.put(app.refmgr.deserialize(obs[0]));
                        stgmgr.verifyUserBuilt(tl);  //update user if needed
                        aggmgr.rememberControlValues();  //mix-in selection
                        aggmgr.updateControls();     //rebuild the display name
                        aggmgr.state.edsel.setValue(tl.dsId);  //if created
                        if(how === "interim") {
                            ui.bdiv.innerHTML = ui.bh;
                            stgmgr.toggleSettings("open"); }
                        else {
                            stgmgr.toggleSettings("closed"); } },
                    function (code, errtxt) {
                        jt.log("stgmgr.save " + code + ": " + errtxt);
                        if(ui.bdiv) {
                            jt.out("stgsavemsgdiv", errtxt);
                            ui.bdiv.innerHTML = ui.bh; } },
                    jt.semaphore("stgmr.save")); },
        settingsData: function () {
            var tl = aggmgr.currTL("edit");
            var dat = {dsId:tl.dsId || "", dsType:"Timeline"};
            if(dat.dsId === "new") {
                dat.dsId = ""; }
            if(tl.dsId) {
                dat.modified = tl.modified; }
            Object.entries(stgmgr.fdefs).forEach(function ([fld, def]) {
                var mgr = def.mgr || tfmgr;
                dat[fld] = mgr.getValue(fld, def); });
            return dat; },
        verifyUserBuilt: function (tl) {
            app.user.acc.built = app.user.acc.built || [];
            if(!Array.isArray(app.user.acc.built)) {  //json fields init to {}
                app.user.acc.built = []; }
            var ub = app.user.acc.built.find((b) => b.tlid === tl.dsId);
            if(!ub) {
                ub = {tlid:tl.dsId};
                app.user.acc.built.push(ub); }
            if(ub.modified !== tl.modified) {
                ub.name = tl.name;
                ub.featured = tl.featured;
                ub.modified = tl.modified;
                stgmgr.updateUser(); } },
        updateUser: function () {
            var data = app.refmgr.postdata(app.user.acc);
            jt.call("POST", "/api/updacc?" + app.auth(), data,
                    function (obs) {
                        app.user.acc = app.refmgr.put(
                            app.refmgr.deserialize(obs[0]));
                        jt.log("stgmgr.updateUser success"); },
                    function (code, errtxt) {
                        jt.log("stgmgr.updateUser " + code + ": " + errtxt); },
                    jt.semaphore("stgmgr.updateUser")); },
        checkForDataChanges: function () {
            var tl = aggmgr.currTL("edit");
            var changed = "";
            Object.entries(stgmgr.fdefs).forEach(function ([fld, def]) {
                var mgr = def.mgr || tfmgr;
                var val = mgr.getValue(fld);
                if(val != tl[fld]) {
                    changed = changed.csvappend(fld); } });
            if(changed) {
                jt.log("Timeline fields changed: " + changed);
                jt.byId("stgsavebdiv").style.display = "block"; }
            else {
                jt.byId("stgsavebdiv").style.display = "none"; } }
    };


    //Year Range Manager provides start/end year bounding if relevent.
    var yrmgr = {
        state: {},
        reset: function () {
            yrmgr.state = {active:false, yrmin:0, yrmax:0};
            var pts = aggmgr.getPoints();
            if(pts.length > 1) {
                yrmgr.state.active = true;
                yrmgr.state.yrmin = pts[0].start.year;
                yrmgr.state.yrmax = pts[pts.length - 1].start.year; } },
        valchanged: function () {
            yrmgr.state.yrmin = jt.byId("yearstartin").value;
            yrmgr.state.yrmax = jt.byId("yearendin").value;
            if(yrmgr.state.yrmin > yrmgr.state.yrmax) {
                yrmgr.state.yrmin = yrmgr.state.yrmax;
                jt.byId("yearstartin").value = yrmgr.state.yrmin; }
            if(yrmgr.state.yrmax < yrmgr.state.yrmin) {
                yrmgr.state.yrmax = yrmgr.state.yrmin;
                jt.byId("yearendin").value = yrmgr.state.yrmaz; }
            filtmgr.filterPoints(); },
        makeYearInput: function (domid, val) {
            return jt.tac2html(
                ["input", {type:"number", cla:"yearin", value:val,
                           onchange:mdfs("yrmgr.valchanged"),
                           id:domid, name:domid,
                           min:yrmgr.state.yrmin, max:yrmgr.state.yrmax}]); },
        ctrlHTML: function () {
            if(!yrmgr.state.active) { return ""; }
            return jt.tac2html(
                ["div", {id:"yrmgrctrlsdiv"},
                 [yrmgr.makeYearInput("yearstartin", yrmgr.state.yrmin),
                  ["span", {id:"srchinspan"}, "&nbsp;to&nbsp;"],
                  yrmgr.makeYearInput("yearendin", yrmgr.state.yrmax)]]); },
        isMatchingPoint: function (pt) {
            if(!yrmgr.state.active) { return true; }
            return ((pt.start.year >= yrmgr.state.yrmin) &&
                    (pt.start.year <= yrmgr.state.yrmax)); }
    };


    //Search Manager provides keyword and general text search
    var srchmgr = {
        state: {},
        ptkfs: ["communities", "regions", "categories", "tags"],
        reset: function () {
            srchmgr.state = {all:{}, selkeys:[], qstr:"", pqs:{}};
            aggmgr.getPoints().forEach(function (pt) {
                srchmgr.ptkfs.forEach(function (fld) {
                    var fldkcsv = pt[fld] || "";
                    fldkcsv.csvarray().forEach(function (val) {
                        srchmgr.state.all[val.toLowerCase()] = val; }); }); });
            Object.keys(srchmgr.state.all).forEach(function (ak) {
                srchmgr.state.selkeys.push(srchmgr.state.all[ak]); });
            srchmgr.state.selkeys.sort(); },
        ctrlHTML: function () {
            var srchinattrs = {type:"search", id:"srchin", size:26,
                               placeholder:"Search text",
                               onchange:mdfs("srchmgr.valchanged"),
                               value:""};  //value set by UI interaction only
            var dlos = [];  //datalist options from keywords, if available
            srchmgr.state.selkeys.forEach(function (sk) {
                sk = sk.trim();  //verify no surrounding whitespace
                if(sk) {
                    if(/\S+\s\S+/.test(sk)) {  //keyword has a space in it
                        sk = "&quot;" + sk + "&quot;"; }
                    dlos.push(["option", {value:sk}]); } });
            if(dlos.length) {
                srchinattrs.list = "srchinoptsdl"; }
            var divcontents = [["input", srchinattrs]];
            if(dlos.length) {
                divcontents.push(["datalist", {id:"srchinoptsdl"}, dlos]); }
            divcontents.push(
                ["a", {href:"#search", id:"srchlink", title:"Search items",
                       onclick:mdfs("srchmgr.valchanged")},
                 ["img", {src:app.dr("img/search.png")}]]);
            return jt.tac2html(["div", {id:"srchmgrdiv"}, divcontents]); },
        valchanged: function () {
            srchmgr.state.qstr = jt.byId("srchin").value || "";
            srchmgr.state.qstr = srchmgr.state.qstr.trim();
            if(!srchmgr.state.pqs[srchmgr.state.qstr]) {
                srchmgr.parseSearch(srchmgr.state.qstr); }
            filtmgr.filterPoints(); },
        //A search can consist of simple strings and/or quoted strings,
        //possibly preceded by a "+" indicating that the string should be
        //treated as an additional filter.
        parseSearch: function (qstr) {
            var pq = {toks:[], pfts:[]};  //tokens and post-match filter tokens
            pq.toks = qstr.toLowerCase().match(/\+?"[^"]*"*|\S+/g);
            pq.pfts = pq.toks.filter((tok) => tok.indexOf("+") === 0);
            pq.toks = pq.toks.filter((tok) => tok && tok.indexOf("+") !== 0);
            pq.pfts = pq.pfts.map((tok) => srchmgr.opstrip(tok));
            pq.toks = pq.toks.map((tok) => srchmgr.opstrip(tok));
            srchmgr.state.pqs[qstr] = pq; },
        opstrip: function (tok) {
            if(tok.indexOf("+") === 0) {
                tok = tok.slice(1); }
            if(tok.indexOf("\"") === 0) {
                tok = tok.slice(1, -1); }
            return tok; },
        verifySearchFilterText: function (pt) {
            if(pt.srchFiltTxt) { return; }
            var flds = ["source", "text", "refs", "communities", "regions",
                        "categories", "tags"];
            pt.srchFiltTxt = flds.reduce((a, c) => a + " " + pt[c], "");
            pt.srchFiltTxt = pt.srchFiltTxt.toLowerCase(); },
        isMatchingPoint: function (pt) {
            if(!srchmgr.state.qstr) { return true; }
            srchmgr.verifySearchFilterText(pt);
            var pq = srchmgr.state.pqs[srchmgr.state.qstr];
            if(pq.toks.some((tok) => pt.srchFiltTxt.indexOf(tok) >= 0) &&
               pq.pfts.every((pft) => pt.srchFiltTxt.indexOf(pft) >= 0)) {
                return true; }
            return false; }
    };


    //Download Manager provides for downloading selected points
    var dlmgr = {
        ctrlHTML: function () {
            return jt.tac2html(
                ["div", {id:"downloadlinkdiv"},
                 ["a", {href:"#Download", id:"downloadlink",
                        title:"Download displayed points",
                        onclick:mdfs("dlmgr.showDialog")},
                  ["img", {src:app.dr("img/download.png"),
                           cla:"downloadlinkimg"}]]]); }
        //showDialog: function () showDownloadDialog
    };


    //Filter Manager handled which available points are currently displayed.
    var filtmgr = {
        state: {},
        updateControls: function () {
            filtmgr.state.dispsel = makeSelect(
                "dispsel", mdfs("filtmgr.updateDisplay"), [
                    {value:"Timeline", text:"Timeline Points"},
                    {value:"Suppviz", text:"Visualizations"}]);
            yrmgr.reset();
            srchmgr.reset();
            jt.out("filtctrlsdiv", jt.tac2html(
                [["div", {id:"ftrdiv"},  //filter timeline and range
                  [filtmgr.state.dispsel.ctrlHTML(),
                   yrmgr.ctrlHTML()]],
                 ["div", {id:"fsddiv"},  //filter search and download
                  [srchmgr.ctrlHTML(),
                   dlmgr.ctrlHTML()]]])); },
        filterPoints: function () {
            var pts = [];
            aggmgr.getPoints().forEach(function (pt) {
                if(yrmgr.isMatchingPoint(pt) &&
                   srchmgr.isMatchingPoint(pt)) {
                    pts.push(pt); } });
            dispmgr.displayPoints(pts); }
    };


    var picmgr = {
        getHTML: function (pt, sp) {
            var attrs = {cla:"ptdpic", id:"ptdpic" + pt.dsId,
                         title:"Point " + pt.dsId,
                         src:app.dr("img/ptplaceholder.png")};
            if(pt.pic) {
                attrs.src = app.dr("/api/obimg") + "?dt=Point&di=" + pt.dsId; }
            if(sp.mode === "edit") {
                attrs.style = "cursor:pointer;";
                attrs.onclick = mdfs("picmgr.uploadPic", pt.dsId); }
            return jt.tac2html(["img", attrs]); },
        uploadPic: function (ptid) {
            jt.log("Not implemented yet"); },
        appendChangedValue: function () {
            return "Pic upload is handled separately from save processing"; }
    };


    var helpmgr = {
        updateHelp: function (event) {
            if(!event.target.dataset.helpsrc) { return; }
            var ptid = event.target.dataset.ptid;
            var help = {mgrname:event.target.dataset.helpsrc};
            help.hdat = app.tabular.managerDispatch(help.mgrname, "help");
            help.divid = help.mgrname + "help" + ptid;
            if(!jt.byId(help.divid)) { //create help div if not existing
                help.tdiv = jt.byId("ecbdiv" + ptid);
                help.tdiv.innerHTML = jt.tac2html(
                    ["div", {cla:"placehelpdiv", id:help.divid}]) +
                    help.tdiv.innerHTML; }
            if(event.type === "blur") {
                jt.out(help.divid, ""); }
            else if(event.type === "focus") {
                jt.out(help.divid, jt.tac2html(
                    [["div", {cla:"helpfieldnamediv"}, help.hdat.fpn],
                     ["div", {cla:"helptextdiv"}, help.hdat.txt]])); }
            editmgr.updateSave(ptid); }
    };


    var placemgr = {
        makeEditable: function (attrs, ptid, placetext, helpsrcname) {
            attrs.contentEditable = "true";
            attrs["data-ptid"] = ptid;
            attrs["data-placetext"] = placetext;
            if(helpsrcname) {
                attrs["data-helpsrc"] = helpsrcname; }
            var listener = mdfs("placemgr.placeholdercheck", "event");
            attrs.onfocus = listener;
            attrs.onblur = listener; },
        placeholdercheck: function (event) {
            var ptid = event.target.dataset.ptid;
            var ptxt = event.target.dataset.placetext;
            if(event.type === "blur" && !event.target.innerText.trim()) {
                event.target.innerText = ptxt; }
            else if(event.type === "focus") {
                if(event.target.innerText === ptxt) {
                    event.target.innerHTML = ""; } }
            helpmgr.updateHelp(event); },
        togtext: function (divid, text) {
            var div = jt.byId(divid);
            if(div) {
                if(div.innerText.trim() === text) {
                    div.innerHTML = ""; }
                else {
                    div.innerHTML = text; } } }
    };


    var datemgr = {
        placeholder:"",
        getHTML: function (pt, sp) {
            var attrs = {cla:"ptddatediv", id:"ptddatediv" + pt.dsId};
            if(sp.mode === "edit") {
                datemgr.placeholder = sp.def.place;
                placemgr.makeEditable(attrs, pt.dsId, sp.def.place, 
                                      "datemgr"); }
            return jt.tac2html(["div", attrs, pt.date || sp.def.place]); },
        help: function () {
            return {fpn:"Date", txt:"A date in general YYYY-MM-DD format.  Month and day can be omitted.  For years before the common era, use a preceding minus sign or a trailing ' BCE'. To make a timespan, specify start ' to ' end.  Years can be decorated with a trailing 's' or '+' to indicate decades or beginnings e.g. 1920s or 1855+."}; },
        getValue: function (ptid) {
            var val = jt.byId("ptddatediv" + ptid).innerText || "";
            val = val.trim();
            if(val === datemgr.placeholder) {
                val = ""; }
            return val; },
        appendChangedValue: function (ptd, pt) {
            var val = datemgr.getValue(pt.dsId);
            if(val !== pt.date) {
                ptd.date = val; } },
        validate: function (ptid) {
            return datemgr.validateValue(datemgr.getValue(ptid)); },
        validateValue: function (val) {
            var res = {valid:false, msg:"A Date value is required."};
            if(!val) { return res; }
            var start; var end;
            [start, end] = val.split(" to ").map((d) => datemgr.parseDate(d));
            if(!start) {
                res.msg = "Date value not recognized.";
                return res; }
            res.valid = datemgr.canonicalDate(start);
            if(end) {
                res.valid += " to " + datemgr.canonicalDate(end); }
            res.msg = "";
            if(res.valid !== val) {
                res.msg = "Date value adjusted for validity."; }
            return res; },
        parseDate: function (dv) {
            var res = null;
            var match = dv.match(/(-?)(\d+)([s+])?(-\d\d)?(-\d\d)?(\sBCE)?/);
            if(match && match[2]) {  //have at least year
                res = {negation:match[1], year:Number(match[2]),
                       decoration:match[3] || "", month:match[4], day:match[5],
                       bce:match[6]};
                if(res.negation || res.bce) { res.year *= -1; }
                if(res.month) { res.month = Number(res.month.slice(1)); }
                if(res.day) { res.day = Number(res.day.slice(1)); } }
            return res; },
        canonicalDate: function (pd) {
            var val = String(Math.abs(pd.year)) + pd.decoration + 
                datemgr.mdpart(pd.month) + datemgr.mdpart(pd.day);
            if(pd.year < 0) { val += " BCE"; }
            return val; },
        mdpart: function (mdval) {
            var val = "";
            if(mdval) {
                val += "-";
                if(mdval < 10) {
                    val += "0"; }
                val += String(mdval); }
            return val; },
        test: function () {
            var testdates = [
                "16000 BCE", "7000 BCE", "-600", "4 BCE", "1970-1", "foo",
                "1970-01", "1970-01-01", "1980s", "1980's", "1970+",
                "1983 to 1987", "1980s to 1990s", "1970-01-01 to 1980-01-01"];
            testdates.forEach(function (td) {
                jt.log(td + " -> " +
                       JSON.stringify(datemgr.validateValue(td))); }); }
    };


    var txtmgr = {
        placeholder:"",
        getHTML: function (pt, sp) {
            var attrs = {cla:"pttextdiv", id:"pttextdiv" + pt.dsId};
            if(sp.mode === "edit") {
                txtmgr.placeholder = sp.def.place;
                placemgr.makeEditable(attrs, pt.dsId, sp.def.place,
                                      "txtmgr"); }
            return jt.tac2html(["div", attrs, pt.text || sp.def.place]); },
        help: function () {
            return {fpn:"Text", txt:"The text for the timeline point should describe the key event facts and impact. Be as clear and concise as possible. Max of 1200 characters."}; },
        getValue: function (ptid) {
            //Server cleans up any embedded HTML if any sneaks through
            var val = jt.byId("pttextdiv" + ptid).innerText || "";
            val = val.trim();
            if(val === txtmgr.placeholder) {
                val = ""; }
            return val; },
        appendChangedValue: function (ptd, pt) {
            var val = txtmgr.getValue(pt.dsId);
            if(val !== pt.text) {
                ptd.text = val; } },
        validate: function (ptid) {
            var val = txtmgr.getValue(ptid);
            var res = {valid:false, msg:"Text description is required."};
            if(!val) { return res; }
            if(val.length > 1200) {
                res.msg = "Text too long.";
                return res; }
            return {valid:true}; }
    };


    //Point Reference Manager.  To add a reference, fill in the blank
    //reference field, then hit return or blur to trigger the creation of
    //another blank reference field.  To delete a reference, delete all the
    //text in it.  An actual input control would allow a proper onchange
    //listener, but looks clunkier and doesn't allow for line wrapping.
    var prmgr = {
        verifyPointRefs: function (pt) {
            if(!pt.refs) { pt.refs = []; }
            if(typeof pt.refs === "string") {
                pt.dsType = "Point";  //verify dsType was set
                app.refmgr.deserialize(pt); }
            if(!Array.isArray(pt.refs)) {  //might have defaulted to {}
                pt.refs = []; } },
        getHTML: function (pt, sp) {
            prmgr.verifyPointRefs(pt);
            var html = pt.refs.map(function (refstr, idx) {
                if(sp.mode !== "edit") {
                    html.push(["div", prmgr.rdas(pt.dsId, idx),
                               jt.linkify(refstr)]); }
                else { //editing
                    html.push(["div", prmgr.rdas(pt.dsId, idx, sp.def.place),
                               refstr]); } });
            if(sp.mode === "edit") { //append blank reference field for adding
                html.push(
                    ["div", prmgr.rdas(pt.dsId, pt.refs.length, sp.def.place),
                     sp.def.place]); }
            return jt.tac2html(
                ["div", {cla:"ptrefsdiv", id:"ptrefsdiv" + pt.dsId}, html]); },
        rdas: function (ptid, idx, place) {
            var divattrs = {cla:"ptrefstrdiv", id:"ptrefstrdiv" + ptid + idx};
            if(place) {  //editing
                placemgr.makeEditable(divattrs, ptid, place, "prmgr");
                divattrs["data-idx"] = idx;  //data-ptid already set
                divattrs.onkeyup = mdfs("prmgr.refinput", "event"); }
            return divattrs; },
        refinput: function (event) {
            var ptid = event.target.dataset.ptid;
            var idx = event.target.dataset.idx;
            if(event.key === "Enter") {
                jt.log("refinput enter pressed " + ptid + ", idx: " + idx); } },
        help: function () {
            return {fpn:"References", txt:"Each reference is a single line citation or full URL. References are strongly encouraged for both validation and further learning."}; },
        appendChangedValue: function () {
            //return serialized json
            jt.log("Reference values not accumulated yet."); }
    };


    var qtmgr = {
        qts:{C:{txt:"Continue", hlp:"Standard 'click to continue' response"},
             U:{txt:"Did You Know?", hlp:"New information Yes/No response"},
             D:{txt:"What Year?", hlp:"Click correct year to continue"},
             F:{txt:"Firsts", hlp:"'click to continue' response"}},
        getHTML: function (pt, sp) {
            pt.qtype = pt.qtype || "C";
            var valhtml = qtmgr.qts[pt.qtype].txt || qtmgr.qts.C.txt;
            if(sp.mode === "edit") {
                var huf = mdfs("helpmgr.updateHelp", "event");
                valhtml = jt.tac2html(
                    ["select", {id:"qtsel" + pt.dsId, "data-helpsrc":"qtmgr",
                                "data-ptid":pt.dsId, onfocus:huf, onblur:huf},
                     Object.entries(qtmgr.qts).map(function ([key, def]) {
                         var attrs = {value:key};
                         if(key === pt.qtype) {
                             attrs.selected = "selected"; }
                         return ["option", attrs, def.txt]; })]); }
            return jt.tac2html(
                ["div", {cla:"ptqtdiv"},
                 [["span", {cla:"ptdetlabelspan"}, "Question Type: "],
                  ["span", {cla:"ptdetvaluespan"}, valhtml]]]); },
        help: function () {
            var dt = Object.values(qtmgr.qts).map(function (qt) {
                return ["tr", [["td", qt.txt], ["td", qt.hlp]]]; });
            return {fpn:"Question Type", txt:"The style of user interaction for this point." + jt.tac2html(["table", dt])}; },
        appendChangedValue: function (ptd, pt) {
            var sel = jt.byId("qtsel" + pt.dsId);
            return sel.options[sel.selectedIndex].value; }
    };


    var srcmgr = {
        getHTML: function (pt, sp) {
            if(!pt.source && sp.mode !== "edit") { return ""; }
            var valattrs = {cla:"ptdetvaluespan", id:"srcdivspan" + pt.dsId};
            if(sp.mode === "edit") {
                placemgr.makeEditable(valattrs, pt.dsId, sp.def.place,
                                      "srcmgr"); }
            return jt.tac2html(
                ["div", {cla:"ptsourcediv"},
                 [["span", {cla:"ptdetlabelspan"}, "Source: "],
                  ["span", valattrs, (pt.source || sp.def.place)]]]); },
        help: function () {
            return {fpn:"Source Id", 
                    txt:"Optional external source identifier text"}; },
        appendChangedValue: function (ptd, pt) {
            return jt.byId("srcdivspan" + pt.dsId).innerText.trim(); }
    };


    //While it would seemingly be convenient to create new values for
    //Communities/Regions/Categories/Tags while editing a point, in reality
    //showing these fields makes creating a new point feel like
    //substantially more work than it already is.  These fields should not
    //be displayed while editing if they are not being used.
    var tagmgr = {
        getHTML: function (pt, sp) {
            if(sp.fld === "communities" && !pt.communities && pt.groups) {
                pt.communities = pt.groups; }  //legacy data name conversion
            if(!pt[sp.fld] && sp.mode !== "edit") { return ""; }
            if(sp.mode !== "edit") {  //display existing value(s)
                return jt.tac2html(
                    ["div", {cla:"pttagdiv"},
                     [["span", {cla:"ptdetlabelspan"},
                       sp.fld.capitalize() + ": "],
                      ["span", {cla:"ptdetvaluespan"}, pt[sp.fld]]]]); }
            var tl = aggmgr.currTL("edit");
            if(!tl || !tl[sp.fld]) { return ""; }
            //PENDING: create a multi-select with the options
            return ""; },
        appendChangedValue: function () {
            return "tagmgr value input needed before appending changes"; }
    };


    var ptdmgr = {
        ptfd: {
            pic:{dv:"", mgr:picmgr},
            date:{dv:"", mgr:datemgr, place:"YYYY-MM-DD"},
            text:{dv:"", mgr:txtmgr, place:"Concise event description"},
            refs:{dv:[], mgr:prmgr, place:"Document reference and/or URL"},
            qtype:{dv:"C", mgr:qtmgr},
            source:{dv:"", mgr:srcmgr, place:"Id"},
            communities:{dv:"", mgr:tagmgr},
            regions:{dv:"", mgr:tagmgr},
            categories:{dv:"", mgr:tagmgr},
            tags:{dv:"", mgr:tagmgr},
            editors:{dv:""},  //server initializes on first save
            srclang:{dv:"en-US"},
            translations:{dv:""}},
        verifyFields: function (pt) {
            Object.entries(ptdmgr.ptfd).forEach(function ([fld, def]) {
                pt[fld] = pt[fld] || def.dv; }); },
        pointHTML: function (pt, m) {
            var html = [];
            Object.entries(ptdmgr.ptfd).forEach(function ([f, d]) {
                if(d.mgr) {
                    html.push(d.mgr.getHTML(pt, {fld:f, def:d,
                                                 mode:(m || "read")})); } });
            return jt.tac2html(html); },
        redisplay: function (pt, mode) {
            ptdmgr.verifyFields(pt);
            jt.out("pddiv" + pt.dsId, ptdmgr.pointHTML(pt, mode)); },
        pointChangeData: function (pt) {
            var ptd = {dsType:"Point",
                       dsId:pt.dsId || "",
                       modified:pt.modified || "",
                       editors:pt.editors || app.user.acc.dsId,
                       srctl:pt.srctl || aggmgr.currTL("edit").dsId};
            Object.entries(ptdmgr.ptfd).forEach(function ([f, d]) {
                if(d.mgr) {
                    d.mgr.appendChangedValue(ptd, pt, {fld:f, def:d}); } });
            if(ptd.dsId === "Placeholder") { ptd.dsId = ""; }
            return ptd; },
        fieldsChanged: function (pt) {
            var ptd = ptdmgr.pointChangeData(pt);
            return Object.entries(ptdmgr.ptfd)
                .some((k, d) => d.mgr && ptd[k]); },
        rebuildTimelinePoints: function (pt) {  //pt used if error saving
            var tl = aggmgr.currTL("edit");
            var pts = aggmgr.getPoints()
                .filter((pt) => pt.srctl === tl.dsId || pt.mixin);
            var tldat = {dsType:"Timeline", dsId:tl.dsId, modified:tl.modified,
                         name:tl.name, slug:tl.slug,  //verified on each save
                         cids:pts.map((pt) => pt.dsId).join(",")};
            tldat = app.refmgr.postdata(tldat);
            jt.call("POST", "/api/updtl?" + app.auth(), tldat,
                    function (obs) {
                        app.refmgr.put(app.refmgr.deserialize(obs[0]));
                        dispmgr.displayPoints(aggmgr.getPoints()); },
                    function (code, errtxt) {
                        //PENDING: Admin mail explaining that the timeline
                        //cids will need to be rebuilt from from the Points
                        //referencing by srctl. Then the preb will need to
                        //be rebuilt.  If this was a network hiccup, there
                        //is a chance they could retry and have it work. Put
                        //this in a recovery dialog.
                        jt.err("Timeline points rebuild failed " + code +
                               ": " + errtxt);
                        editmgr.displaySaveButton(pt); },
                    jt.semaphore("ptdmgr.rebuildTimelinePoints")); }
    };


    var editmgr = {
        state: {},
        editable: function (pt) {
            if(!app.user || !app.user.acc) { return ""; }  //not signed in
            pt.editors = pt.editors || "";  //legacy compiled points
            if((!pt.dsId || pt.dsId === "Placeholder") ||
               (pt.editors.csvcontains(app.user.acc.dsId) &&
                (aggmgr.currTL("edit").dsId === pt.srctl))) {
                return app.user.acc.dsId; }
            return ""; },
        pt4id: function (ptid, cbf) {
            if(ptid === "Placeholder") {
                return cbf({dsType:"Point", dsId:"Placeholder"}); }
            app.refmgr.getFull("Point", ptid, function (pt) {
                if(!pt) {
                    return jt.err("Point data retrieval failed."); }
                cbf(pt); }); },
        editCtrlsSideHTML: function (pt) {
            if(aggmgr.state.mode !== "tledit") { return ""; }
            return jt.tac2html(
                [["div", {cla:"ecscbdiv"}, editmgr.cbIncHTML(pt)],
                 ["div", {cla:"ecskmdiv"}, editmgr.kebabHTML(pt)],
                 ["div", {cla:"ecspldiv"}, editmgr.plusHTML(pt)]]); },
        editCtrlsBottomHTML: function (pt) {
            return jt.tac2html(
                ["div", {cla:"ecbcdiv", id:"ecbcdiv" + pt.dsId}]); },
        updateSave: function (ptid) {
            editmgr.pt4id(ptid, function (pt) {
                if(pt.dsId === "Placeholder" || ptdmgr.fieldsChanged(pt)) {
                    editmgr.displaySaveButton(pt); } }); },
        displaySaveButton: function (pt) {
            jt.out("ecbcdiv" + pt.dsId, jt.tac2html(
                [["div", {id:"saveprocmsgdiv" + pt.dsId}],
                 ["div", {cla:"saveptbdiv", id:"saveptbdiv" + pt.dsId},
                  ["button", {type:"button", id:"saveptb" + pt.dsId,
                              onclick:mdfs("editmgr.save", pt.dsId)},
                   "Save"]]])); },
        validate: function (ptid) {
            var tl = aggmgr.currTL("edit");
            if(!tl.dsId || tl.dsId === "new") {
                jt.out("saveprocmsgdiv" + ptid,
                       "Save timeline to write points to it.");
                return false; }
            var vds = [datemgr, txtmgr]; var vm = {valid:true};
            vds.forEach(function (vd) {
                if(vm.valid) {
                    vm = vd.validate(ptid); } });
            if(!vm.valid) {
                jt.out("saveprocmsgdiv" + ptid, vm.msg);
                return false; }
            return true; },
        save: function (ptid) {
            if(!editmgr.validate(ptid)) { return; }
            jt.out("saveprocmsgdiv" + ptid, "");
            jt.out("saveptbdiv" + ptid, "Saving...");
            editmgr.pt4id(ptid, function (pt) {
                var ptdat = ptdmgr.pointChangeData(pt);
                ptdat = app.refmgr.postdata(ptdat);
                jt.call("POST", "/api/updpt?" + app.auth(), ptdat,
                        function (obs) {
                            jt.log("Point " + obs[0].dsId + " saved.");
                            jt.out("saveptbdiv" + ptid,
                                   "Saved. Updating Timeline...");
                            app.refmgr.put(app.refmgr.deserialize(obs[0]));
                            aggmgr.addOrUpdatePoint(obs[0]);
                            ptdmgr.rebuildTimelinePoints(pt); },
                        function (code, errtxt) {
                            editmgr.displaySaveButton(pt);
                            jt.out("saveprocmsgdiv" + pt.dsId, "Error " + code +
                                   ": " + errtxt); },
                        jt.semaphore("editmgr.save")); }); },
        cbIncHTML: function (pt) {
            //pt may be from previous mix-in from another url
            if(editmgr.editable(pt)) { return ""; }
            var etl = aggmgr.currTL("edit");
            return jt.tac2html(
                ["input", {type:"checkbox", id:"cbinc" + pt.dsId,
                           value:pt.dsId, title:"Include Point in Timeline",
                           checked:jt.toru(pt.mixin),
                           onchange:mdfs("editmgr.toginc", pt.dsId)}]); },
        toginc: function (ptid) {
            var pt = aggmgr.getPoints().find((pt) => pt.dsId === ptid);
            pt.mixin = jt.byId("cbinc" + pt.dsId).checked; },
        kebabHTML: function (pt) {
            return jt.tac2html(
                ["a", {href:"#more", title:"More actions...",
                       id:"kebaba" + pt.dsId,
                       onclick:mdfs("editmgr.toggleKebabMenu", pt.dsId)},
                 "&#x22EE;"]); },  //vertical ellipsis
        toggleKebabMenu: function (ptid, cmd) {
            var kmd = jt.byId("kebabmenudiv" + ptid);
            if(cmd === "open" || kmd.style.display === "none") {
                kmd.style.display = "block";
                jt.byId("kebaba" + ptid).style.fontWeight = "bold";
                editmgr.pt4id(ptid, editmgr.rebuildKebabActions); }
            else {
                kmd.style.display = "none";
                jt.byId("kebaba" + ptid).style.fontWeight = "normal"; } },
        rebuildKebabActions: function (pt) {
            var html = [];
            if(!editmgr.editable(pt)) {
                html.push(["div", {cla:"kebabchoicediv"},
                           ["a", {href:"#copy",
                                  title:"Copy information to a new point",
                                  onclick:mdfs("editmgr.copyPoint", pt.dsId)},
                            "Copy"]]); }
            if(editmgr.editable(pt)) {
                html.push(["div", {cla:"kebabchoicediv"},
                           ["a", {href:"#save", title:"Save point",
                                  onclick:mdfs("editmgr.savePoint")},
                            "Save"]]); }
            if(pt.dsId && pt.dsId !== "Placeholder" && editmgr.editable(pt)) {
                html.push(["div", {cla:"kebabchoicediv"},
                           ["a", {href:"#delete", title:"Delete point",
                                  onclick:mdfs("editmgr.deletePoint", pt.dsId)},
                            "Delete"]]); }
            jt.out("kebabmenudiv" + pt.dsId, jt.tac2html(html)); },
        plusHTML: function (pt) {
            if(pt.dsId === "Placeholder") { return ""; }
            return jt.tac2html(
                ["a", {href:"#add", title:"Add new point",
                       onclick:mdfs("editmgr.addNewPoint", pt.dsId)},
                 "+"]); },
        addNewPoint: function (pt) {
            pt = aggmgr.resolvePoint(pt, {dsType:"Point", dsId:"Placeholder"});
            var parentdiv = jt.byId("pointsdispdiv");
            var ptdiv = jt.byId("trowdiv" + pt.dsId);
            var placediv = jt.byId("trowdivPlaceholder");
            if(placediv) {  //already created
                parentdiv.removeChild(placediv); }
            else {  //make a placeholder div
                placediv = dispmgr.makePointDiv(pt); }
            if(ptdiv) {  //put placeholder after current point
                ptdiv.after(placediv); }
            else { //put placeholder first
                var pts = aggmgr.getPoints();
                if(pts.length) {
                    ptdiv = jt.byId("trowdiv" + pts[0].dsId);
                    ptdiv.before(placediv); }
                else {
                    parentdiv.appendChild(placediv); } }
            editmgr.togedit("Placeholder", "edit"); },
        togedit: function (ptid, mode) {
            if(!mode) {  //toggle
                var datediv = jt.byId("tpddiv" + ptid);
                if(datediv && datediv.isContentEditable) {
                    mode = "read"; }
                else {
                    mode = "edit"; } }
            editmgr.pt4id(ptid, function (pt) {
                ptdmgr.redisplay(pt, mode); }); }
    };


    var dispmgr = {
        display: function (mode) {
            //datemgr.test();
            app.mode.chmode("reference");  //verify screen elements visible
            aggmgr.init(mode || "refdisp");
            jt.out("tcontdiv", jt.tac2html(
                [["div", {id:"tcontheaddiv"},
                  [["div", {id:"aggctrlsdiv"}],
                   ["div", {id:"filtctrlsdiv"}],
                   ["div", {id:"editctrlsdiv"}]]],
                 ["div", {id:"pointsdispdiv"}]]));
            aggmgr.updateControls();  //calls filtmgr.updateControls
            dispmgr.adjustPointsAreaDisplayHeight();
            aggmgr.tlchg((mode === "tledit")? "edsel" : ""); }, //update display
        adjustPointsAreaDisplayHeight: function () {
            var ptsh = window.innerHeight - 
                (jt.byId("tcontheaddiv").offsetHeight + 30);
            jt.byId("pointsdispdiv").style.height = String(ptsh) + "px"; },
        displayPoints: function (pts) {
            jt.out("pointsdispdiv", "");  //reset content
            if(!pts || !pts.length) {
                if(aggmgr.state.mode === "tledit") {
                    return editmgr.addNewPoint(); }
                return jt.out("pointsdispdiv", "No timeline points."); }
            var outdiv = jt.byId("pointsdispdiv");
            pts.forEach(function (pt) {
                if(!pt.stats || pt.stats.status !== "deleted") {
                    var ptdiv = dispmgr.makePointDiv(pt);
                    outdiv.appendChild(ptdiv); } }); },
        makePointDiv: function (pt) {
            var ptdiv = document.createElement("div");
            ptdiv.className = "trowdiv";
            ptdiv.id = "trowdiv" + pt.dsId;
            ptdiv.innerHTML = dispmgr.pointHTML(pt);
            return ptdiv; },
        pointHTML: function (pt) {
            return jt.tac2html(
                [["div", {cla:"pddiv", id:"pddiv" + pt.dsId},
                  ptdmgr.pointHTML(pt)],
                 ["div", {cla:"ecbdiv", id:"ecbdiv" + pt.dsId},
                  editmgr.editCtrlsBottomHTML(pt)],
                 ["div", {cla:"ecsidediv", id:"ecsidediv" + pt.dsId},
                  editmgr.editCtrlsSideHTML(pt)],
                 ["div", {cla:"kebabmenudiv", id:"kebabmenudiv" + pt.dsId,
                          style:"display:none"}]]); }
    };


    return {
        display: function (mode) { dispmgr.display(mode); },
        showDownloadDialog: function () { showDownloadDialog(); },
        dldrad: function (idx) { selectDownloadOption(idx); },
        tledit: function () { dispmgr.display("tledit"); },
        tlset: function () { timelineSettings(); },
        tledchg: function (s) { timelineEditFieldChange(s); },
        savetl: function () { saveTimeline(); },
        ptdisp: function (c) { updatePointsDisplay(c); },
        togptsel: function (ptid) { togglePointInclude(ptid); },
        togsvsel: function (svmn) { toggleSuppvizInclude(svmn); },
        togtlsel: function (tlid) { togglePointInclude(tlid); },
        canctl: function () { cancelTimelineEdit(); },
        runsv: function (svmodule) { app[svmodule].display(); },
        scr2pt: function (id) { scrollToPointId(id); },
        dfltslug: function () { provideDefaultSlugValue(); },
        redispt: function (pt, datechg) { redisplayPoint(pt, datechg); },
        togseti: function () { toggleInfoSettings(); },
        shall: function () { changeToAllPointsDisplay(); },
        fetchorg: function (cbf) { fetchorg(cbf); },
        ptdet: function (event, ptid) { showPointDetails(event, ptid); },
        keysel: function (event) { toggleKeySelDisp(event); },
        keychk: function (field, idx) { toggleKeyword(field, idx); },
        featchg: function () { featuredSelChange(); },
        managerDispatch: function (mgrname, fname, ...args) {
            switch(mgrname) {
            case "aggmgr": return aggmgr[fname].apply(app.tabular, args);
            case "featmgr": return featmgr[fname].apply(app.tabular, args);
            case "tfmgr": return tfmgr[fname].apply(app.tabular, args);
            case "stgmgr": return stgmgr[fname].apply(app.tabular, args);
            case "yrmgr": return yrmgr[fname].apply(app.tabular, args);
            case "srchmgr": return srchmgr[fname].apply(app.tabular, args);
            case "dlmgr": return dlmgr[fname].apply(app.tabular, args);
            case "filtmgr": return filtmgr[fname].apply(app.tabular, args);
            case "picmgr": return picmgr[fname].apply(app.tabular, args);
            case "helpmgr": return helpmgr[fname].apply(app.tabular, args);
            case "placemgr": return placemgr[fname].apply(app.tabular, args);
            case "datemgr": return datemgr[fname].apply(app.tabular, args);
            case "txtmgr": return txtmgr[fname].apply(app.tabular, args);
            case "prmgr": return prmgr[fname].apply(app.tabular, args);
            case "qtmgr": return qtmgr[fname].apply(app.tabular, args);
            case "srcmgr": return srcmgr[fname].apply(app.tabular, args);
            case "tagmgr": return tagmgr[fname].apply(app.tabular, args);
            case "ptdmgr": return ptdmgr[fname].apply(app.tabular, args);
            case "editmgr": return editmgr[fname].apply(app.tabular, args);
            case "dispmgr": return dispmgr[fname].apply(app.tabular, args);
            default: jt.log("tabular.managerDispatch unknown manager: " +
                            mgrname); } }
    };
}());
