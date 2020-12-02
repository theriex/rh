/*jslint browser, white, fudge, for */
/*global window jtminjsDecorateWithUtilities */

var app = {};  //Global container for application level funcs and values
var jt = {};   //Global access to general utility methods

(function () {
    "use strict";

    app.modules = [{name:"refmgr", desc:"Server data and client cache"},
                   {name:"db", desc:"Data access and app state"},
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

    app.keyflds = ["communities", "regions", "categories", "tags"];
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
        app.dlg.procparams(app.db.fetchDisplayTimeline);
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
        var ox = window.location.href;
        //PENDING: If not secure then disable login forms
        app.docroot = ox.split("/").slice(0, 3).join("/") + "/";
        if(!jtminjsDecorateWithUtilities) { //support lib not loaded yet
            return setTimeout(app.init, 50); }
        jtminjsDecorateWithUtilities(jt);
        if(!app.validURL()) {  //sets app.baseurl or redirects as needed
            return; }
        var splash = jt.byId("splashdiv");
        if(window.location.href.indexOf("/timeline/") >= 0) {
            splash.innerHTML = "Starting timeline"; }
        else {
            splash.style.backgroundImage = "url('../img/splashbg.png')"; }
        splash.style.opacity = 1.0;
        var modules = app.modules.map(function (md) {
            var path = "js/";
            if(md.type === "gv" || md.type === "sv") {
                path += "sv/"; }
            else {
                path += "amd/"; }
            return path + md.name; });
        jt.out("loadstatdiv", "Loading app modules...");
        app.amdtimer = {};
        app.amdtimer.load = { start: new Date() };
        jt.loadAppModules(app, modules, app.baseurl, app.init2, "?v=201202");
    };


    app.domfield = function (id, field) {
        var val = "";
        if(jt.byId(id)) {
            val = jt.byId(id)[field] || ""; }
        return val;
    };


    //app.docroot is initialized with a terminating '/' so it can be
    //concatenated directly with a relative path, but remembering and
    //relying on whether a slash is required is annoying.  Double slashes
    //are usually handled properly, but can be a source of confusion, so
    //easier to call this utility instead when building a relative path.
    app.dr = function (relpath) {
        if(relpath.startsWith("/")) {
            relpath = relpath.slice(1); }
        return app.docroot + relpath;
    };


    //Return a timestamp version tag as a url cache bust value.
    app.vtag = function (modified) {
        return modified && modified.replace(
            /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z;?(\d*)/,
            "$1$2$3-$4$5$6");
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


    //Return the argument list as a string of arguments suitable for appending
    //to manager dispatch onwhatever function text.
    app.paramstr = function (args) {
        var ps = "";
        if(args && args.length) {
            ps = args.reduce(function (acc, arg) {
                if((typeof arg === "string") && (arg !== "event")) {
                    arg = "'" + arg + "'"; }
                return acc + "," + arg; }, ""); }  //always start with comma
        return ps;
    };


    app.ptimgsrc = function (pt, skipcachebust) {
        var src = "/api/obimg?dt=Point&di=" + pt.dsId;
        if(!skipcachebust) {
            src += "&mod=" + jt.canonize(pt.modified || "unspecified"); }
        return src;
    };


}());
