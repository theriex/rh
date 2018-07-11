/*jslint browser, multivar, white, fudge */
/*global window jtminjsDecorateWithUtilities */

var app = {},  //Global container for application level funcs and values
    jt = {};   //Global access to general utility methods

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


    app.init2 = function () {
        app.amdtimer.load.end = new Date();
        jt.log("window.innerWidth: " + window.innerWidth);
        app.user = {};  //used for general reference
        app.dlg.chkcook("background");
        app.db.fetchDisplayTimeline();
    };


    app.init = function () {
        var modules, href = window.location.href;
        modules = app.modules.map(function (md) {
            var path = "js/";
            if(md.type === "gv" || md.type === "sv") {
                path += "sv/"; }
            return path + md.name; });
        jtminjsDecorateWithUtilities(jt);
        app.baseurl = "https://usracehistory.org";
        if(!href.startsWith("https") && !href.startsWith("http://localhost")) {
            window.location.href = app.baseurl;
            return; }
        jt.out("rhcontentdiv", "Loading app modules...");
        app.amdtimer = {};
        app.amdtimer.load = { start: new Date() };
        jt.loadAppModules(app, modules, href, app.init2, "?cbp=180705");
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


}());
