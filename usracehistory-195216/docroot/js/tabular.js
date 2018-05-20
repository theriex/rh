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
        tlsetflds = null,
        tlsetfldopts = [],
        mode = "refdisp",  //tledit
        currpts = null;


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


    function pointExtendedAttrValHTML(attr, val) {
        return ["div",
                [["span", {cla:"pxdattrspan"}, attr],
                 "&nbsp;",  //for double click select separation and visual
                 val]];
    }


    function pointExtendedDataHTML (pt) {
        var html = [];
        html.push(pointExtendedAttrValHTML("id", pt.instid));
        if(pt.source) {
            html.push(pointExtendedAttrValHTML("source", pt.source)); }
        if(pt.keywords) {
            html.push(pointExtendedAttrValHTML("keywords", pt.keywords)); }
        html.push(pointExtendedAttrValHTML("orgid", pt.orgid));
        html.push(pointExtendedAttrValHTML("timecode", pt.tc));
        //PENDING: refs should be a ul with new tabs if URLs
        //PENDING: stats should be displayed once available
        //Not doing endorsed for general display.
        return jt.tac2html(html);
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
                         id:"editlink" + pt.instid,
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
        html = ["div", {cla:"trowdiv", id:"trowdiv" + pt.instid},
                [["a", {id:"pt" + pt.instid}],  //static anchor for refs
                 ["div", {cla:"trowdatediv"}, 
                  [dateSpan(pt.start),
                   ["br"],
                   dateSpan(pt.end, "-"),
                   ["span", {cla:"tcspan"}, " (" + pt.codes + ") "],
                   html]],
                 ["div", {cla:"trowdescdiv"}, 
                  [ph,
                   app.db.ptlinktxt(pt, currpts, "app.tabular.scr2pt"),
                   " &nbsp;",
                   ["a", {href:"#" + pt.instid, cla:"editlink",
                          onclick:jt.fs("app.tabular.togptd('" + pt.instid + 
                                        "')")},
                    "[ptdata]"],
                   eh,
                   ["div", {id:"ptxdiv" + pt.instid, cla:"ptxdiv",
                            style:"display:none"},
                    pointExtendedDataHTML(pt)]]]]];
        return html;
    }


    function scrollToPointId (id) {
        var trowdiv = jt.byId("trowdiv" + id);
        if(trowdiv) {
            trowdiv.scrollIntoView(); }
    }


    function togglePointDataDisplay (id) {
        var ptxdiv = jt.byId("ptxdiv" + id);
        if(ptxdiv) {
            if(ptxdiv.style.display === "none") {
                ptxdiv.style.display = "block"; }
            else {
                ptxdiv.style.display = "none"; } }
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
                txt += "\n" + jt.tac2html(pointTAC(pt)); } });
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
                    var attributes = {value:opt.value};
                    if(opt.selected) {
                        attributes.selected = "selected"; }
                    html.push(["option", attributes,
                               opt.text || opt.value]); });
                return ["select", {name:spec.id, id:spec.id,
                                   onchange:spec.chgstr},
                        html]; },
            setValue: function (val) {
                jt.byId(spec.id).value = val; },
            getValue: function () {
                var val = "", sel = jt.byId(spec.id);
                if(sel) {  //display might not be ready yet
                    val = sel.options[sel.selectedIndex].value; }
                return val; }};
    }


    function pointTotals (tl) {
        var sum = {pts:0, words:0, minutes:0}, ids;
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
        var ts = {pts:0, words:0, minutes:0}, tls = [];
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
            {field:"name", type:"text", 
             oninput:jt.fs("app.tabular.dfltslug()")},
            {field:"slug", type:"text"},
            {field:"title", type:"text"},
            {field:"subtitle", type:"text"},
            {field:"lang", type:"text"},
            {field:"comment", type:"text"},
            {field:"ctype", type:"ui"},
            {field:"cids", type:"ui"},
            {field:"svs", type:"ui"},
            {field:"tlrndmax", dispname:"Select", type:"number",
             min:3, max:900, getf:function () { return tlflds.maxpts || 18; }},
            {field:"pps", dispname:"Pts/Save", type:"number",
             min:3, max:50, getf:function () { return tlflds.pps || 6; }},
            {field:"url", type:"info",
             getf:function (tl) { 
                 var url = app.baseurl + "/timeline/" + (tl.slug || tl.instid);
                 return jt.tac2html(
                     ["a", {href:url,
                            onclick:jt.fs("window.open('" + url + "')")},
                      url.slice(8)]); }},
            {field:"ptcounts", type:"info", getf:pointsTotalSummary}];
        tlsetflds.forEach(function (sf) {
            if(!sf.getf) {
                sf.getf = function (tl) { return tl[sf.field]; }; } });
    }


    function verifyDisplayElements () {
        var html;
        if(jt.byId("pointsdispdiv")) {  //already set up
            return; }
        initTimelineSettingsFields();
        ptflds.selpool = makeSelect(
            "ptdpsel", jt.fs("app.tabular.ptdisp()"),
            [{value:"All", text:"All Points"},
             {value:"Timeline", text:"Timeline Points", selected:"selected"},
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


    function adjustPointsAreaDisplayHeight () {
        var ptsh = window.innerHeight - 
            (jt.byId("tcontheaddiv").offsetHeight + 30);
        jt.byId("pointsdispdiv").style.height = String(ptsh) + "px";
    }


    function display () {
        mode = "refdisp";
        verifyDisplayElements();
        jt.byId("tlctxdiv").style.display = "none";
        adjustPointsAreaDisplayHeight();
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
            if(isEditSettingsField(sf)) {
                inobj = {type:sf.type, value:sf.getf(currtl),
                         id:sf.field + "in", name:sf.field + "in",
                         cla:"av" + sf.type + "in"};
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
        var setdiv = jt.byId("tlsettingsdispdiv"),
            infodiv = jt.byId("tlinfodispdiv"),
            img = jt.byId("setinfoimg");
        if(setdiv.style.display === "block") {
            infodiv.style.height = setdiv.offsetHeight + "px";
            img.src = "img/infolit.png";
            setdiv.style.display = "none";
            infodiv.style.display = "block"; }
        else {
            img.src = "img/info.png";
            setdiv.style.display = "block";
            infodiv.style.display = "none"; }
    }


    function timelineSettingsHTML () {
        var html;
        currtl = currtl || emptyTimeline();
        html = ["div", {id:"etlsetcontdiv"},
                [["div", {id:"etlsetidiv"},
                  ["a", {href:"#info", onclick:jt.fs("app.tabular.togseti()")},
                   ["img", {id:"setinfoimg", src:"img/info.png"}]]],
                 ["div", {id:"tlsettingsdispdiv", style:"display:block;"},
                  timelineSettingsFieldsHTML()],
                 ["div", {id:"tlinfodispdiv", style:"display:none;"},
                  timelineInfoFieldsHTML()],
                 ["div", {id:"tlsavestatdiv"}],
                 tlsetButtonsHTML()]];
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
        app.tabular.tledchg("namechg");  //init dependent fields for name sel
        app.tabular.ptdisp();
    }


    function timelineSettings (spec) {
        var div, st = {};
        div = jt.byId("etlsetdiv");
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
            adjustPointsAreaDisplayHeight(); }
    }


    function setDisplayInputFieldsFromTimeline (tl) {
        var ctype = tl.ctype || "Points:6",
            elems = ctype.split(":");
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
        jt.call("GET", "fetchtl?tlid=" + tlid, null,
                function (result) {
                    result.forEach(function (tl) {
                        app.db.deserialize("Timeline", tl);
                        app.user.tls[tl.instid] = tl; });
                    setStateToDatabaseTimeline(result[0]);
                    app.tabular.ptdisp();
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
        var tlid;
        tlflds.name = tlflds.selname.getValue();
        if(tlflds.name === "none") {
            currtl = null;
            return false; } 
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
                fetchTimeline(tlid);
                return false; }  //nothing to display until TL retrieved
            if(currtl) {
                setDisplayInputFieldsFromTimeline(currtl); } }
        return true;
    }


    function timelineEditFieldChange (context) {
        notePointScrollPosition();
        hideTLTypeFields();  //hide all data dependent fields
        if(context === "namechg" && !timelineNameChangeReady()) {
            return; }  //fetching timeline, or "none", or otherwise done
        unhideTLTypeFields();  //unhide appropriate data dependent fields
        restorePointScrollPosition();
        if(context !== "showsave") {  //redraw the points area since it might
            app.tabular.ptdisp(); }   //need to show suppviz or timelines now.
    }


    function saveTimeline () {
        jt.out("etlsetbuttonsdiv", "Saving...");
        currtl.name = jt.byId("namein").value;
        if(jt.byId("slugin")) {
            currtl.slug = jt.byId("slugin").value; }
        currtl.title = jt.byId("titlein").value;
        currtl.subtitle = jt.byId("subtitlein").value;
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
        // jt.log("saveTimeline parameters:");
        // Object.keys(currtl).forEach(function (field) {
        //     jt.log("    " + field + ": " + currtl[field]); });
        jt.call("POST", "updtl?" + app.auth(), app.db.postdata("Timeline", 
                                                               currtl),
                function (result) {
                    app.db.deserialize("Timeline", result[0]);
                    setStateToDatabaseTimeline(result[0]);
                    app.db.deserialize("AppUser", result[1]);
                    app.user.acc = result[1];
                    editTimeline();  //redraw reflecting new/updated name
                    jt.out("etlsetbuttonsdiv", jt.tac2html(tlsetButtonsHTML()));
                    adjustPointsAreaDisplayHeight(); },
                function (code, errtxt) {
                    jt.log("saveTimeline " + code + " " + errtxt);
                    jt.out("etlsetbuttonsdiv", jt.tac2html(tlsetButtonsHTML()));
                    jt.out("tlsavestatdiv", errtxt); },
                jt.semaphore("tabular.saveTimeline"));
    }


    function getPointMatchCriteria () {
        var crit = {code: ptflds.selcode.getValue(),
                    start: Number(jt.byId("yearstartin").value),
                    end: Number(jt.byId("yearendin").value),
                    srch: jt.byId("srchin").value}, dcon;
        if(ptflds.selpool.getValue() === "Timeline") {
            if(currtl) {
                crit.ids = currtl.cids; }
            else {
                dcon = app.db.displayContext();
                if(!dcon.cids) {
                    dcon.cids = "";
                    dcon.points.forEach(function (pt) {
                        dcon.cids = dcon.cids.csvappend(pt.instid); }); }
                crit.ids = dcon.cids; } }
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
                          ["a", {href:"#run" + sv.module,
                                 onclick:jt.fs("app.tabular.runsv('" + 
                                               sv.module + "')")},
                           ["span", {cla:"svlistnamespan"}, sv.name]]]],
                        //PENDING: "more..." link to sv about text.
                        ["div", {cla:"svlistdescdiv"}, sv.descr]]]); });
        html = ["div", {id:"svsdispdiv"}, html]; 
        jt.out("pointsdispdiv", jt.tac2html(html));
    }


    function fetchPubPoints () {
        var ptsfile = "docs/pubpts.json";
        if(window.location.href.indexOf("localhost") >= 0) {
            ptsfile = "docs/locpts.json"; }
        jt.call("GET", ptsfile, null,
                function (result) {
                    var dcon = app.db.displayContext();
                    //PENDING: fetch recent updates and integrate
                    app.db.prepPointsArray(result);
                    //make sure points from whatever timeline the app
                    //launched with are included
                    app.allpts = app.db.mergePoints(result, dcon.points);
                    app.tabular.ptdisp(); },
                function (code, errtxt) {
                    jt.err("Fetch pubpts failed " + code + " " + errtxt); },
                jt.semaphore("tabular.fetchPubPoints"));
        //no value to return and nothing to do until points are available.
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
            return fetchPubPoints(); }
        mcrit = getPointMatchCriteria();
        currpts = [];
        app.allpts.forEach(function (pt) {
            if(isMatchingPoint(mcrit, pt)) {
                currpts.push(pt); } });
        currpts.forEach(function (pt) {
            var linediv = document.createElement("div");
            linediv.innerHTML = jt.tac2html(pointTAC(pt));
            outdiv.appendChild(linediv); });
        jt.out("downloadlinkdiv", jt.tac2html(
            ["a", {href:"#Download", id:"downloadlink",
                   title:"Download the displayed points",
                   onclick:jt.fs("app.tabular.showDownloadDialog")},
             ["img", {src:"img/download.png", cla:"downloadlinkimg"}]]));
    }


    function redisplayPoint (pt) {
        var ptdiv = jt.byId("trowdiv" + pt.instid);
        ptdiv = ptdiv.parentElement;  //enclosing div
        ptdiv.innerHTML = jt.tac2html(pointTAC(pt));
        timelineSettings("required");
    }


    function togglePointInclude (ptid) {
        if(tlflds.selname.getValue() === "new") {
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


    function toggleSuppvizInclude (svmn) {
        currtl.svs = currtl.svs || "";
        if(currtl.svs.csvcontains(svmn)) {
            currtl.svs = currtl.svs.csvremove(svmn); }
        else {
            currtl.svs = currtl.svs.csvappend(svmn); }
        app.tabular.tledchg("showsave");
    }


    return {
        display: function () { display(); },
        showDownloadDialog: function () { showDownloadDialog(); },
        dldrad: function (idx) { selectDownloadOption(idx); },
        tledit: function () { editTimeline(); },
        tlset: function () { timelineSettings(); },
        tledchg: function (s) { timelineEditFieldChange(s); },
        savetl: function () { saveTimeline(); },
        ptdisp: function () { updatePointsDisplay(); },
        togptsel: function (ptid) { togglePointInclude(ptid); },
        togsvsel: function (svmn) { toggleSuppvizInclude(svmn); },
        togtlsel: function (tlid) { togglePointInclude(tlid); },
        canctl: function () { cancelTimelineEdit(); },
        runsv: function (svmodule) { app[svmodule].display(); },
        togptd: function (id) { togglePointDataDisplay(id); },
        scr2pt: function (id) { scrollToPointId(id); },
        dfltslug: function () { provideDefaultSlugValue(); },
        redispt: function (pt) { redisplayPoint(pt); },
        togseti: function () { toggleInfoSettings(); }
    };
}());
