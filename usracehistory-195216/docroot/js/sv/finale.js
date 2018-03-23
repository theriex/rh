/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.finale = (function () {
    "use strict";

    var tl = null,       //grab useful geometry from linear timeline display
        chart = {};      //container for svg references


    function display () {
        //display elements:
        //  - link to reference view the timeline they just completed so 
        //    they can revisit points or suppviz.
        //  - donate
        jt.err("finale suppviz not implemented yet");
    }


    return {  //unlike regular suppviz, finale never returns to interactive
        display: function () { display(); }
    };
}());
