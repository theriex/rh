/*jslint browser, multivar, white, fudge */
/*global window jtminjsDecorateWithUtilities */

var app = {},  //Global container for application level funcs and values
    jt = {};   //Global access to general utility methods

(function () {
    "use strict";

    app.init2 = function () {
        app.amdtimer.load.end = new Date();
        jt.log("window.innerWidth: " + window.innerWidth);
        app.user = {};  //used for general reference
        app.dlg.chkcook("background");
        app.baseurl = "https://usracehistory.org";
        app.db.fetchDisplayTimeline();
    };


    app.init = function () {
        var href = window.location.href,
            modules = ["js/db",       //data access and state
                       "js/dlg",      //dialog interaction
                       "js/linear",   //linear timeline display
                       "js/tabular",  //text timeline display
                       "js/mode",     //menu and topnav display
                       "js/sv/svcommon",
                       "js/sv/support",
                       "js/sv/levelup",
                       "js/sv/intro",
                       "js/sv/slavery",
                       "js/sv/lynching",
                       "js/sv/finale"];
        jtminjsDecorateWithUtilities(jt);
        jt.out("rhcontentdiv", "Loading app modules...");
        app.amdtimer = {};
        app.amdtimer.load = { start: new Date() };
        jt.loadAppModules(app, modules, href, app.init2, "?cbp=180511");
    };


    app.domfield = function (id, field) {
        var val = "";
        if(jt.byId(id)) {
            val = jt.byId(id)[field] || ""; }
        return val;
    };

}());
