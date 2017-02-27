/*jslint browser, multivar, white, fudge */
/*global window jtminjsDecorateWithUtilities */

var app = {},  //Global container for application level funcs and values
    jt = {};   //Global access to general utility methods

(function () {
    "use strict";

    app.init2 = function () {
        app.amdtimer.load.end = new Date();
        app.db.prepData();
        app.lev.init();
        app.linear.display();
        //app.tabular.display();
    };


    app.init = function () {
        var href = window.location.href,
            modules = ["js/data",     //all the points for display
                       "js/db",       //data access and state
                       "js/lev",      //traversal levels
                       "js/dlg",      //dialog interaction
                       "js/picbg",    //background pictures
                       "js/linear",   //linear timeline display
                       "js/tabular",  //text timeline display
                       "js/mode",     //interactive or reference
                       "js/sv/about",
                       "js/sv/intro",
                       "js/sv/slavery"
                      ];
        jtminjsDecorateWithUtilities(jt);
        jt.out("rhcontentdiv", "Loading app modules...");
        app.amdtimer = {};
        app.amdtimer.load = { start: new Date() };
        jt.loadAppModules(app, modules, href, app.init2, "?cbp=161223");
    };


}());
