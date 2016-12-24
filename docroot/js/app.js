var app = {},  //Global container for application level funcs and values
    jt = {};   //Global access to general utility methods

(function () {
    "use strict"

    app.dispdivid = "rhcontentdiv";


    app.init2 = function () {
        app.amdtimer.load.end = new Date();
        app.tabular.display();
    };


    app.init = function () {
        var href = window.location.href,
            modules = ["js/data", "js/tabular"];
        jtminjsDecorateWithUtilities(jt);
        jt.out(app.dispdivid, "Loading app modules...");
        app.amdtimer = {};
        app.amdtimer.load = { start: new Date() };
        jt.loadAppModules(app, modules, href, app.init2, "?cbp=161223");
    };


}());
