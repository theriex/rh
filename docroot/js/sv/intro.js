/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.intro = (function () {
    "use strict";

    return {
        display: function (sv, ignore/*tl*/, endf) { 
            var date = new Date(), nowiso;
            sv.startstamp = app.db.wallClockTimeStamp(date);
            sv.duration = 0;
            nowiso = date.toISOString();
            sv.pts.forEach(function (pt) {
                pt.visited = nowiso; });
            sv.visited = nowiso;
            d3.select("#suppvisdiv")
                .style("visibility", "hidden");
            endf(); }
    };
}());
