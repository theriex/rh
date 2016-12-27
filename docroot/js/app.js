var app = {},  //Global container for application level funcs and values
    jt = {};   //Global access to general utility methods

(function () {
    "use strict"

    app.dispdivid = "rhcontentdiv";


    //See the project readme for allowable date form specfications.
    function parseDate (pt) {
        var date, mres;
        date = pt.date;
        pt.start = {};
        //start year
        pt.start.year = date.match(/^\d\d?\d?\d?/)[0];
        date = date.slice(pt.start.year.length);
        pt.start.year = +(pt.start.year);
        if(date.indexOf(" BCE") >= 0) {
            date = date.slice(date.indexOf(" BCE") + 4);
            pt.start.year *= -1; }
        //start month
        mres = date.match(/^\-\d\d(\-|$)/);
        if(mres) {
            date = date.slice(3);
            pt.start.month = +(mres[0].slice(1,3)); }
        //start day
        mres = date.match(/^\-\d\d(\-|$)/);
        if(mres) {
            date = date.slice(3);
            pt.start.day = +(mres[0].slice(1,3)); }
        //end year
        if(date.indexOf("-") >= 0) {
            date = date.slice(date.indexOf("-") + 1); }
        mres = date.match(/^\d\d?\d?\d?/);
        if(mres) {
            date = date.slice(mres[0].length);
            pt.end = {};
            pt.end.year = +(mres[0]); }
        //end month
        mres = date.match(/^\-\d\d(\-|$)/);
        if(mres) {
            date = date.slice(3);
            pt.end.month = +(mres[0].slice(1,3)); }
        //end day
        mres = date.match(/^\-\d\d/);
        if(mres) {
            date = date.slice(3);
            pt.end.day = +(mres[0].slice(1,3)); }
    }


    //D3 has very good support for dates, but that level of precision
    //is more than the data specifies.  Using a fractional year
    //rounded to two decimal places and multiplied by 100 so we are
    //working with integer values.  The y coordinate is just the point
    //count within the year.
    function makeCoordinates (pt, ctx) {
        var y, m, d;
        y = pt.start.year;
        m = pt.start.month || 0;
        d = pt.start.day || 0;
        pt.x = Math.round((y + m/12 + d/365) * 100);
        if(ctx.yr === pt.start.year) {
            ctx.dy += 1; }  //next y coordinate value within year
        else {
            ctx.yr = pt.start.year;  //reset year context
            ctx.dy = 1; }            //fist y coordinate value within year
        pt.y = ctx.dy;
    }


    //The base of the point identifier is the number of years ago.
    //That keeps more modern history less cluttered looking because
    //the point identifiers are more concise, and it provides a quick
    //indication of how long ago something was.  The second part of
    //the identifier is the y coordinate.
    function makePointIdent (pt, ny) {
        var ident = String(ny - pt.start.year + 1);  //zero is an ugly id
        if(pt.y > 1) {
            ident += "|" + pt.y; }
        pt.id = ident;
    }


    function prepData () {
        var ctx = {yr: 0, dy: 0}, ny = new Date().getFullYear();
        jt.out(app.dispdivid, "Preparing data...");
        app.data.pts.forEach(function (pt) {
            parseDate(pt);
            makeCoordinates(pt, ctx);
            makePointIdent(pt, ny); });
    }


    app.init2 = function () {
        app.amdtimer.load.end = new Date();
        prepData();
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
