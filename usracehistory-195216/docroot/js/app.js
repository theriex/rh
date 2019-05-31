/*jslint browser, white, fudge, for */
/*global window jtminjsDecorateWithUtilities */

var app = {};  //Global container for application level funcs and values
var jt = {};   //Global access to general utility methods

(function () {
    "use strict";

    app.modules = [{name:"db", desc:"Data access and app state"},
                   {name:"dlg", desc:"Dialog interactions"},
                   {name:"linear", desc:"Linear timeline display"},
                   {name:"tabular", desc:"Text timeline display"},
                   {name:"mode", desc:"Menu and topnav display"},
                   //general visualizations and common utilities
                   {name:"svcommon", type:"gv", desc:"Factored suppviz utils"},
                   {name:"support", type:"gv", desc:"Support contact page"},
                   {name:"levelup", type:"gv", desc:"Next level start display"},
                   {name:"finale", type:"gv", desc:"Timeline end display"},
                   //specific visualizations.  For what's left to build see
                   //https://github.com/theriex/rh/issues/2
                   {name:"intro", type:"sv", title:"Intro Completion",
                    desc:"Chronology Unlocked, please bookmark"},
                   {name:"slavery", type:"sv", title:"Chattel Slavery",
                    desc:"Chattel slavery by state, some context points"},
                   {name:"lynching", type:"sv", title:"Lynching",
                    desc:"Lynchings by year range and region"},
                   {name:"miscegenation", type:"sv", title:"Anti-Miscegenation",
                    desc:"Anti-Miscegenation legislation by state"}];

    app.keyflds = ["groups", "regions", "categories", "tags"];
    app.qts = {C:"Continue",
               U:"Did you know?",
               F:"Firsts",
               D:"What year?"};
    app.pqls = ["text", "refs"];


    app.init2 = function () {
        app.amdtimer.load.end = new Date();
        jt.log("window.innerWidth: " + window.innerWidth);
        app.user = {};  //used for general reference
        jt.out("loadstatdiv", "");
        app.dlg.chkcook(app.db.fetchDisplayTimeline);
    };


    app.validURL = function () {
        var subs = ["http://pastkey.com",
                    "http://www.pastkey.com",
                    "https://pastkey.com",
                    "https://www.pastkey.com",
                    "http://pastkey.org",
                    "http://www.pastkey.org",
                    //usracehistory is transitioning to an iframe demo..
                    "http://usracehistory.org",
                    "http://www.usracehistory.org",
                    "https://usracehistory.org",
                    "https://www.usracehistory.org",
                    "http://usracehistory.com",
                    "http://www.usracehistory.com",
                    "https://usracehistory.com",
                    "https://www.usracehistory.com"];
        var href = window.location.href; var i;
        href = href.toLowerCase();  //just in case
        app.baseurl = "https://pastkey.org";
        for(i = 0; i < subs.length; i += 1) {
            if(href.indexOf(subs[i]) >= 0) {
                window.location.href = href.replace(subs[i], app.baseurl);
                return false; } }
        if(href.match(/:\d080/)) {
            app.baseurl = href.slice(0, href.indexOf("080") + 3); }
        return true;
    };


    app.init = function () {
        var modules; var splash;
        jtminjsDecorateWithUtilities(jt);
        if(!app.validURL()) {  //sets app.baseurl or redirects as needed
            return; }
        splash = jt.byId("splashdiv");
        if(window.location.href.indexOf("/timeline/") >= 0) {
            splash.innerHTML = "Starting timeline"; }
        else {
            splash.style.backgroundImage = "url('../img/splashbg.png')"; }
        splash.style.opacity = 1.0;
        modules = app.modules.map(function (md) {
            var path = "js/";
            if(md.type === "gv" || md.type === "sv") {
                path += "sv/"; }
            return path + md.name; });
        jt.out("loadstatdiv", "Loading app modules...");
        app.amdtimer = {};
        app.amdtimer.load = { start: new Date() };
        jt.loadAppModules(app, modules, app.baseurl, app.init2, "?cbp=190531");
    };


    app.domfield = function (id, field) {
        var val = "";
        if(jt.byId(id)) {
            val = jt.byId(id)[field] || ""; }
        return val;
    };


    app.toggledivdisp = function (divid) {
        var div = jt.byId(divid);
        if(div) {
            if(div.style.display === "block") {
                div.style.display = "none"; }
            else {
                div.style.display = "block"; } }
    };


    app.localdev = function () {
        if(window.location.href.match(/\:\d\d80/)) {
            return true; }
        return false;
    };


    app.ptimgsrc = function (pt) {
        var src = "/ptpic?pointid=" + pt.instid + "&mod=" +
            jt.canonize(pt.modified || "unspecified");
        return src;
    };


}());
