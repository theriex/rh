/*jslint browser, multivar, white, fudge */
/*global window jtminjsDecorateWithUtilities */

var app = {},  //Global container for application level funcs and values
    jt = {};   //Global access to general utility methods

(function () {
    "use strict";

    app.dispdivid = "rhcontentdiv";  //main display div


    app.init2 = function () {
        app.amdtimer.load.end = new Date();
        app.db.prepData();
        //define levels
        app.linear.display();
        //app.tabular.display();
    };


    app.init = function () {
        var href = window.location.href,
            modules = ["js/data",     //all the points for display
                       "js/db",       //data access and state
                       "js/linear",   //linear timeline display
                       "js/tabular"   //text display
                      ];
        jtminjsDecorateWithUtilities(jt);
        jt.out(app.dispdivid, "Loading app modules...");
        app.amdtimer = {};
        app.amdtimer.load = { start: new Date() };
        jt.loadAppModules(app, modules, href, app.init2, "?cbp=161223");
    };


}());
