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
        dbtl = null,
        ptflds = {},
        mode = "refdisp";  //tledit


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


    function mayEditPoint (pt) {  //if pt is null, returns may create
        if(!app.user.acc || !app.user.acc.lev) {
            return false; }
        if(pt && app.user.acc.orgid !== pt.orgid && app.user.acc.orgid !== 1) {
            return false; } 
        if(app.user.acc.lev > 1 || !pt) {
            return true; }
        if(pt.created.split(";")[1] === app.user.acc.instid) {
            return true; }
        return false;
    }


    function pointTAC (pt) {
        var ph = "", eh = "", html = "", si;
        if(pt.pic) {
            ph = ["div", {cla:"txtpicdiv"},
                  ["img", {src:"/ptpic?pointid=" + pt.instid, 
                           cla:"txtpicimg"}]]; }
        if(mayEditPoint(pt)) {
            eh = [" &nbsp;",
                  ["a", {href:"#edit", cla:"editlink",
                         onclick:jt.fs("app.dlg.ptedit('" + 
                                       ((pt && pt.instid) || "") + "')")},
                   "[edit]"]]; }
        if(mode === "tledit") {
            si = {type:"checkbox", id:"cb" + pt.instid,
                  onchange:jt.fs("app.tabular.togptsel('" + 
                                 pt.instid + "')")};
            if(currtl && currtl.cids && currtl.cids.csvcontains(pt.instid)) {
                si.checked = "checked"; }
            html = ["div", {cla:"ptseldiv"},
                    [["label", {fo:"cb" + pt.instid}, "Include"],
                     ["input", si]]]; }
        html = ["div", {cla:"trowdiv"},
                [["div", {cla:"trowdatediv"}, 
                  [dateSpan(pt.start),
                   ["br"],
                   dateSpan(pt.end, "-"),
                   ["span", {cla:"tcspan"}, " (" + pt.codes + ") "],
                   html]],
                 ["div", {cla:"trowdescdiv"}, [ph, pt.text, eh]]]];
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
        app.allpts.forEach(function (pt, idx) {
            if(idx && (!dnld.srchst || app.mode.ptmatch(pt))) {
                txt += "\n" + jt.tac2html(pointTAC(pt, idx)); } });
        txt += "</body></html>\n";
        return "data:text/html;charset=utf-8," + encodeURIComponent(txt);
    }


    function getTSVDataURI () {
        var txt = "Date\tText\n";
        app.allpts.forEach(function (pt, idx) {
            if(idx && (!dnld.srchst || app.mode.ptmatch(pt))) {
                txt += pt.date + "\t" + cleanTDValue(pt.text) + "\n"; } });
        return "data:text/plain;charset=utf-8," + encodeURIComponent(txt);
    }


    function getJSONDataURI () {
        var txt, pts = [];
        app.allpts.forEach(function (pt, idx) {
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


    function makeSelect (domid, onchangestr, options) {
        var spec = {id:domid, chgstr:onchangestr, opts:options};
        return {
            tac: function () {
                var html = [];
                spec.opts.forEach(function (opt) {
                    html.push(["option", {value:opt.value},
                               opt.text || opt.value]); });
                return ["select", {name:spec.id, id:spec.id,
                                   onchange:spec.chgstr},
                        html]; },
            setValue: function (val) {
                jt.byId(spec.id).value = val; },
            getValue: function () {
                var sel = jt.byId(spec.id);
                return sel.options[sel.selectedIndex].value; }};
    }


    function verifyDisplayElements () {
        var html;
        if(jt.byId("pointsdispdiv")) {  //already set up
            return; }
        ptflds.selpool = makeSelect(
            "ptdpsel", jt.fs("app.tabular.ptdisp()"),
            [{value:"All", text:"All Points"},
             {value:"Timeline", text:"Timeline Points"},
             {value:"Suppviz", text:"Visualizations"}]);
        ptflds.selcode = makeSelect(
            "ptcodesel", jt.fs("app.tabular.ptdisp()"),
            [{value:"All", text:"All Codes"},
             {value:"N", text:"Native American"},
             {value:"B", text:"African American"},
             {value:"L", text:"Latino/as"},
             {value:"A", text:"Asian American"},
             {value:"M", text:"Middle East and North Africa"},
             {value:"R", text:"Multiracial"},
             {value:"U", text:"Did you know?"},
             {value:"F", text:"Firsts"},
             {value:"D", text:"What year?"}]);
        html = [["div", {id:"tcontheaddiv"},
                 [["div", {id:"tlctxdiv"}, ""],  //timeline context
                  ["div", {id:"ptctxdiv"},       //points context
                   [["div", {id:"ptdispmodediv"},
                     [ptflds.selpool.tac(), ptflds.selcode.tac()]],
                    ["div", {id:"ptfilterdiv"},  //point filtering
                     [["input", {type:"number", cla:"yearin",
                                 onchange:jt.fs("app.tabular.ptdisp()"),
                                 name:"yearstartin", id:"yearstartin",
                                 min:-1200, max:2016, value:-1200}],
                      ["span", {cla:"srchinspan"}, "&nbsp;to&nbsp;"],
                      ["input", {type:"number", cla:"yearin",
                                 onchange:jt.fs("app.tabular.ptdisp()"),
                                 name:"yearendin", id:"yearendin",
                                 min:-1200, max:2016, value:2016}],
                      ["input", {type:"text", id:"srchin", size:18,
                                 placeholder:"Filter text...",
                                 value:app.mode.searchstate().qstr, 
                                 oninput:jt.fs("app.tabular.ptdisp()")}],
                      ["div", {id:"downloadlinkdiv"}, ""]]]]]]],
                ["div", {id:"pointsdispdiv"}, ""]];
        jt.out("tcontdiv", jt.tac2html(html));
    }


    function display () {
        mode = "refdisp";
        verifyDisplayElements();
        jt.byId("tlctxdiv").style.display = "none";
        app.tabular.ptdisp();
    }


    function timelineSelectHTML () {
        var btls = [], selopts = [];
        app.user.acc.built.forEach(function (tl) {
            btls.push(tl); });
        btls.sort(function (a, b) {
            if(a.name < b.name) { return -1; }
            if(a.name > b.name) { return 1; }
            return 0; });
        if(!btls.length) {
            btls = [{tlid:"none", name:""}]; }
        btls.push({tlid:"new", name:"New&nbsp;Timeline"});
        btls.forEach(function (btl) {
            selopts.push({value:btl.tlid, text:btl.name}); });
        tlflds.selname = makeSelect("tlselname", jt.fs("app.tabular.tledchg()"),
                                    selopts);
        return tlflds.selname.tac();
    }


    function emptyTimeline () {
        //Do not set a default value here or it short circuits creation flow.
        return {instid:"", name:"", slug:"", comment:"", 
                ctype:"", cids:"", svs:""};
    }


    function timelineChanged () {
        if(!dbtl) {
            return true; }
        if(currtl.name !== dbtl.name ||
           currtl.slug !== dbtl.slug ||
           currtl.lang !== dbtl.lang ||
           currtl.comment !== dbtl.comment ||
           currtl.ctype !== dbtl.ctype ||
           currtl.cids !== dbtl.cids ||
           currtl.svs !== dbtl.svs) {
            return true; }
        return false;
    }


    function timelineSettingsHTML () {
        var html = [];
        currtl = currtl || emptyTimeline();
        if(currtl.instid) {
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
                               //updates are reflected after save (new timeline)
                               //onchange:jt.fs("app.tabular.tledchg()"),
                               value:currtl.name}]]]);
        if(app.user && app.user.acc.orgid && app.user.acc.lev >= 1) {
            html.push(["div", {cla:"dlgformline"},
                       [["label", {fo:"slugin", cla:"wlab", id:"labslugin"},
                         "Slug"],
                        ["input", {type:"text", cla:"wfin",
                                   name:"slugin", id:"slugin",
                                   value:currtl.slug}]]]); }
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
                               min:3, max:900,
                               value:tlflds.maxpts || 18}]]]);
        html.push(["div", {cla:"dlgformline", id:"ppsindiv"},
                   [["label", {fo:"ppsin", cla:"wlab", id:"labppsin"},
                     "Points/Save"],
                    ["input", {type:"number", cla:"wfin",
                               name:"ppsin", id:"ppsin",
                               min:3, max:50,
                               value:tlflds.pps || 6}]]]);
        html.push(["div", {id:"tlsavestatdiv"}]);
        html.push(["div", {cla:"buttonsdiv"},
                   [["button", {type:"button", id:"etlsetcancelbutton",
                                onclick:jt.fs("app.tabular.canctl()")},
                     "Cancel"],
                    ["button", {type:"button", id:"etlsetokbutton",
                                onclick:jt.fs("app.tabular.savetl()")},
                     "Save"]]]);
        return html;
    }


    function editTimeline () {
        var html;
        app.mode.chmode("reference");  //verify correct display
        mode = "tledit";
        jt.byId("tlctxdiv").style.display = "block";
        tlflds.seltype = makeSelect("tlseltype", jt.fs("app.tabular.tledchg()"),
                                    [{value:"Points"}, {value:"Timelines"}]);
        tlflds.selseq = makeSelect("tlselseq", jt.fs("app.tabular.tledchg()"),
                                   [{value:"Sequential"}, {value:"Random"}]);
        html = [["div", {id:"etlselpropdiv"},
                 [timelineSelectHTML(),
                  ["a", {href:"#settings",
                         onclick:jt.fs("app.tabular.tlset()")},
                   ["img", {src:"img/settings.png", cla:"formicoimg"}]],
                  ["div", {id:"tltypeseldiv", cla:"formseldiv"},
                   tlflds.seltype.tac()],
                  ["div", {id:"tlseqseldiv", cla:"formseldiv"},
                   tlflds.selseq.tac()]]],
                ["div", {id:"etlsetdiv", style:"display:none;"}, 
                 timelineSettingsHTML()]];
        jt.out("tlctxdiv", jt.tac2html(html));
        if(currtl && currtl.instid) {
            tlflds.selname.setValue(currtl.instid); }
        app.tabular.tledchg();
        app.tabular.ptdisp();
    }


    function timelineSettings (spec) {
        var div, ptsh;
        div = jt.byId("etlsetdiv");
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
        ptsh = window.innerHeight - (jt.byId("tcontheaddiv").offsetHeight + 30);
        jt.byId("pointsdispdiv").style.height = String(ptsh) + "px";
    }


    function slugify (str) {
        str = str.toLowerCase().replace(/\s/g, "");
        return str;
    }


    function setDisplayInputFieldsFromTimeline (tl) {
        var elems = (tl.ctype || "Points:6").split(":");
        if(elems[0] === "Timelines") {
            tlflds.seltype.setValue("Timelines"); }
        else {
            tlflds.seltype.setValue("Points");
            jt.byId("ppsin").value = elems[1] || 6;
            if(elems[0] === "Random") {
                tlflds.selseq.setValue("Random");
                jt.byId("tlrndmaxin").value = elems[2] || 18; }
            else {
                tlflds.selseq.setValue("Sequential"); } }
        if(jt.byId("idin")) {
            jt.byId("idin").value = tl.instid || ""; }
        jt.byId("namein").value = tl.name;
        if(jt.byId("slugin")) {
            jt.byId("slugin").value = tl.slug; }
        jt.byId("commentin").value = tl.comment;
    }
            
                
    function setStateToDatabaseTimeline (tl) {
        dbtl = tl;
        currtl = Object.assign({}, dbtl);
        app.user.tls = app.user.tls || {};
        app.user.tls[dbtl.instid] = dbtl;
    }


    function cancelTimelineEdit() {
        if(dbtl) {
            setStateToDatabaseTimeline (dbtl); }
        timelineSettings();  //toggle closed
        app.tabular.ptdisp();
    }


    function timelineEditFieldChange () {
        var tlid;
        tlflds.name = tlflds.selname.getValue();
        //hide all display inputs
        jt.byId("tltypeseldiv").style.display = "none";
        jt.byId("tlseqseldiv").style.display = "none";
        jt.byId("tlrndmaxdiv").style.display = "none";
        jt.byId("ppsindiv").style.display = "none";
        if(tlflds.name === "none") {
            return; }
        if(tlflds.name === "new") {
            currtl = emptyTimeline();
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
                jt.call("GET", "fetchtl?tlid=" + tlid, null,
                        function (result) {
                            app.db.deserialize("Timeline", result[0]);
                            setStateToDatabaseTimeline(result[0]);
                            app.tabular.ptdisp();
                            timelineEditFieldChange(); },
                        function (code, errtxt) {
                            jt.log("tlefc " + code + " " + errtxt);
                            jt.err("Timeline fetch " + code + " " + errtxt); },
                        jt.semaphore("tabular.timelineEditFieldChange"));
                return; }  //don't unhide until data available
            if(currtl) {
                setDisplayInputFieldsFromTimeline(currtl); } }
        //unhide appropriate display inputs
        timelineSettings("ifchanged");
        jt.byId("tltypeseldiv").style.display = "inline-block";
        tlflds.type = tlflds.seltype.getValue();
        if(tlflds.type === "Points") {
            jt.byId("ppsindiv").style.display = "block";
            jt.byId("tlseqseldiv").style.display = "inline-block";
            if(tlflds.selseq.getValue() === "Random") {
                jt.byId("tlrndmaxdiv").style.display = "block";
                tlflds.rndmax = jt.byId("tlrndmaxin").value; } }
        tlflds.name = jt.byId("namein").value || "";
        if(jt.byId("slugin")) {
            jt.byId("slugin").value = slugify(tlflds.name); }
        app.tabular.ptdisp();  //might need to switch points/timelines
    }


    function saveTimeline () {
        currtl.name = jt.byId("namein").value;
        if(jt.byId("slugin")) {
            currtl.slug = jt.byId("slugin").value; }
        currtl.comment = jt.byId("commentin").value;
        currtl.ctype = tlflds.seltype.getValue();
        if(currtl.ctype === "Points") {
            if(tlflds.selseq.getValue() === "Random") {
                currtl.ctype = "Random"; }
            currtl.ctype += ":" + jt.byId("ppsin").value;
            if(currtl.ctype.startsWith("Random")) {
                currtl.ctype += ":" + jt.byId("tlrndmaxin").value; } }
        //cids already updated
        currtl.preb = "";  //rebuilt by server
        jt.log("saveTimeline parameters:");
        Object.keys(currtl).forEach(function (field) {
            jt.log("    " + field + ": " + currtl[field]); });
        jt.call("POST", "updtl?" + app.auth(), app.db.postdata("Timeline", 
                                                               currtl),
                function (result) {
                    app.db.deserialize("Timeline", result[0]);
                    setStateToDatabaseTimeline(result[0]);
                    app.db.deserialize("AppUser", result[1]);
                    app.user.acc = result[1];
                    editTimeline(); },  //redraw reflecting new/updated name
                function (code, errtxt) {
                    jt.log("saveTimeline " + code + " " + errtxt);
                    jt.out("tlsavestatdiv", errtxt); },
                jt.semaphore("tabular.saveTimeline"));
    }


    function getPointMatchCriteria () {
        var crit = {code: ptflds.selcode.getValue(),
                    start: Number(jt.byId("yearstartin").value),
                    end: Number(jt.byId("yearendin").value),
                    srch: jt.byId("srchin").value};
        if(ptflds.selpool.getValue() === "Timeline") {
            crit.ids = currtl.cids; }
        // jt.log("getPointMatchCriteria:");
        // Object.keys(crit).forEach(function (key) {
        //     jt.log("    " + key + ": " + crit[key]); });
        return crit;
    }


    function isMatchingPoint (crit, pt) {
        var srchtxt;
        if(crit.ids && !crit.ids.csvcontains(pt.instid)) {
            return false; }
        if(crit.code !== "All" && pt.codes.indexOf(crit.code) < 0) {
            return false; }
        if(pt.start.year < crit.start || pt.start.year > crit.end) {
            return false; }
        if(crit.srch) {
            srchtxt = crit.srch.toLowerCase();
            if((pt.text.toLowerCase().indexOf(srchtxt) < 0) &&
               (pt.keywords.toLowerCase().indexOf(srchtxt) < 0)) {
                return false; } }
        return true;
    }


    function preparePointsData () {
        app.allpts.forEach(function (pt) {
            app.db.parseDate(pt); });
        app.allpts.sort(function (a, b) {
            var av, bv;
            if(a.start.year < b.start.year) { return -1; }
            if(a.start.year > b.start.year) { return 1; }
            av = a.start.month || 0;
            bv = b.start.month || 0;
            if(av < bv) { return -1; }
            if(av > bv) { return 1; }
            av = a.start.day || 0;
            bv = b.start.day || 0;
            if(av < bv) { return -1; }
            if(av > bv) { return 1; }
            return 0; });
    }


    function displayPointFilters (val, all) {
        if(all && val === "none") {
            jt.byId("ptdpsel").style.display = val; }
        else if(val !== "none") {
            jt.byId("ptdpsel").style.display = val; }
        jt.byId("ptcodesel").style.display = val;
        jt.byId("ptfilterdiv").style.display = val;
    }


    function updateTimelinesDisplay () {
        var tls = [], accflds = ["remtls", "built", "completed"], html = [];
        accflds.forEach(function (fld) {
            app.user.acc[fld].forEach(function (tl) {
                if(tl.tlid !== currtl.instid) {
                    tls.push({tlid:tl.tlid, name:tl.name}); } }); });
        tls.sort(function (a, b) {
            var aidx = currtl.cids.indexOf(a.tlid),
                bidx = currtl.cids.indexOf(b.tlid);
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
        var html = [],
            svs = [
                // sv/about is a suppviz but not for timelines
                // sv/levelup runs automatically as part of leveling
                // discussion: https://github.com/theriex/rh/issues/2
                // - Finale: Fireworks, donation, build your own..
                // - Population Composition: Census categories/numbers over time
                // - Immigration Flows: Who from where over time
                // - Citizenship: Residency/Citizenship availability over time
                // - Monetary Loss: Monetary loss from systemic racism
                // - Worldwide ancient cities (Teotihuacán context)
                // - Officials of color by state (first and cumulative)
                // - Indigenous nations territories over time
                {module:"intro", name:"Intro Completion",
                 descr:"Chronology Unlocked, please bookmark"},
                {module:"slavery", name:"Slavery",
                 descr:"Chattel slavery by state, some context"},
                {module:"lynching", name:"Lynching",
                 descr:"Lynchings by year range and region"}];
        svs.forEach(function (sv) {
            var si = "";
            if(mode === "tledit") {
                si = {type:"checkbox", id:"cb" + sv.module,
                      onchange:jt.fs("app.tabular.togsvsel('" + 
                                     sv.module + "')")};
                if(currtl && currtl.svs && currtl.svs.csvcontains(sv.module)) {
                    si.checked = "checked"; }
                si = ["span", {cla:"ptseldiv"},
                      [["label", {fo:"cb" + sv.module}, "Include"],
                       ["input", si]]]; }
            html.push(["div", {cla:"svlistdiv"},
                       [["div", {cla:"svlistnamediv"}, 
                         [si, 
                          ["span", {cla:"svlistnamespan"}, sv.name]]],
                        //PENDING: "Run" and "About" buttons
                        ["div", {cla:"svlistdescdiv"}, sv.descr]]]); });
        html = ["div", {id:"svsdispdiv"}, html]; 
        jt.out("pointsdispdiv", jt.tac2html(html));
    }


    function updatePointsDisplay () {
        var mcrit, outdiv = jt.byId("pointsdispdiv");
        jt.out("downloadlinkdiv", jt.tac2html(
            ["img", {src:"img/wait.png", cla:"downloadlinkimg"}]));
        outdiv.innerHTML = "";
        if(tlflds && tlflds.seltype && 
           tlflds.seltype.getValue() === "Timelines") {
            displayPointFilters("none", true);
            return updateTimelinesDisplay(); }
        if(ptflds.selpool.getValue() === "Suppviz") {
            displayPointFilters("none");
            return updateSuppvizDisplay(); }
        displayPointFilters("initial");
        if(!app.allpts) {
            jt.call("GET", "docs/allpts.json", null,
                    function (result) {
                        //PENDING: fetch recent updates and integrate
                        app.allpts = result;
                        preparePointsData();
                        updatePointsDisplay(); },
                    function (code, errtxt) {
                        jt.err("Fetch allpts failed " + code + " " + errtxt); },
                    jt.semaphore("tabular.updatePointsDisplay"));
            return; }  //nothing to do until points are available
        mcrit = getPointMatchCriteria();
        app.allpts.forEach(function (pt, idx) {
            var linediv;
            if(isMatchingPoint(mcrit, pt)) {
                linediv = document.createElement("div");
                linediv.innerHTML = jt.tac2html(pointTAC(pt, idx));
                outdiv.appendChild(linediv); } });
        jt.out("downloadlinkdiv", jt.tac2html(
            ["a", {href:"#Download", id:"downloadlink",
                   title:"Download the displayed points",
                   onclick:jt.fs("app.tabular.showDownloadDialog")},
             ["img", {src:"img/download.png", cla:"downloadlinkimg"}]]));
    }


    function togglePointInclude (ptid) {
        if(tlflds.selname.getValue() === "new") {
            jt.err("Name and save your new timeline"); }
        if(currtl.cids.csvcontains(ptid)) {
            currtl.cids = currtl.cids.csvremove(ptid); }
        else {
            currtl.cids = currtl.cids.csvappend(ptid); }
        app.tabular.tledchg();
    }


    function toggleSuppvizInclude (svmn) {
        currtl.svs = currtl.svs || "";
        if(currtl.svs.csvcontains(svmn)) {
            currtl.svs = currtl.svs.csvremove(svmn); }
        else {
            currtl.svs = currtl.svs.csvappend(svmn); }
        app.tabular.tledchg();
    }


    return {
        display: function () { display(); },
        showDownloadDialog: function () { showDownloadDialog(); },
        dldrad: function (idx) { selectDownloadOption(idx); },
        tledit: function () { editTimeline(); },
        tlset: function () { timelineSettings(); },
        tledchg: function () { timelineEditFieldChange(); },
        savetl: function () { saveTimeline(); },
        ptdisp: function () { updatePointsDisplay(); },
        togptsel: function (ptid) { togglePointInclude(ptid); },
        togsvsel: function (svmn) { toggleSuppvizInclude(svmn); },
        togtlsel: function (tlid) { togglePointInclude(tlid); },
        canctl: function () { cancelTimelineEdit(); }
    };
}());
