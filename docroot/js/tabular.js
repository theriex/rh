/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.tabular = (function () {
    "use strict";

    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
                  "Sep", "Oct", "Nov", "Dec"],
        dnld = {srchst:"", opts:[{format:"html", name:"Document (HTML)"},
                                 {format:"pdf", name:"Document (PDF)"},
                                 {format:"tsv", name:"Spreadsheet (TSV)"},
                                 {format:"json", name:"JavaScript (JSON)"}]};


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


    function display (srchst) {
        var outdiv;
        outdiv = jt.byId("tcontdiv");
        outdiv.innerHTML = jt.tac2html(
            ["div", {id:"downloadlinkdiv"},
             ["span", {cla:"procspan"}, "Processing..."]]);
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


    return {
        display: function () { display(); },
        search: function (srchst) { display(srchst); },
        showDownloadDialog: function () { showDownloadDialog(); },
        dldrad: function (idx) { selectDownloadOption(idx); }
    };
}());
