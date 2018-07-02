/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.support = (function () {
    "use strict";

    var content = [
        ["h2", "Support"],
        ["p", "Help improve this site! Issues are tracked on <span id=\"supghsp\">github</span>, or just <span id=\"supiemsp\">send email</span> if you notice something."],
        ["p", "If you can, please <span id=\"supdonsp\">make a donation to support this site</span>."],
        ["p", "If your organization would like to manage its own data, or sponsor creating a new visualization, <span id=\"suporgesp\">get in touch</span>."],
        ["p", "For other info, <span id=\"supdocsp\">see the docs</span>."]],
        repls = [
            {id:"supghsp", url:"https://github.com/theriex/rh/issues"},
            {id:"supiemsp", em:"issues", delay:1000},
            {id:"supdonsp", url:"docs/interimdonation.html"},
            {id:"suporgesp", em:"contact", delay:1000},
            {id:"supdocsp", url:"docs/documentation.html"}];


    function replace (delay) {
        var emd = "@usracehistory.org";
        delay = delay || 1;
        repls.forEach(function (rep) {
            if(!rep.delay || rep.delay < delay) {
                if(rep.url) {
                    jt.out(rep.id, jt.tac2html(
                        ["a", {href:rep.url,
                               onclick:jt.fs("window.open('" + rep.url + "')")},
                         jt.byId(rep.id).innerHTML])); }
                else if(rep.em) {
                    jt.out(rep.id, jt.tac2html(
                        ["a", {href:"mailto:" + rep.em + emd},
                         jt.byId(rep.id).innerHTML])); } } });
    }


    function display (ms) {
        var html = jt.tac2html(
            [["div", {id:"suppcontdiv"}, jt.tac2html(content)],
             ["div", {id:"suppokbuttondiv"}, 
              ["button", {type:"button", id:"okbutton",
                          onclick:jt.fs("app.support.close()")},
               "Ok"]]]);
        d3.select("#suppvisdiv")
            .style("left", "0px")
            .style("top", "0px")
            .style("width", ms.tl.width2 + "px")
            .style("height","30px")
            .style("background", "#fff5ce")
            .style("visibility", "visible")
            .transition().duration(2000)
            .style("height", (ms.tl.height) + "px");
        jt.out("suppvisdiv", html);
        replace();
        setTimeout(function () { replace(4000); });
    }


    return {
        display: function (ms) { display(ms); },
        close: function () {
            d3.select("#suppvisdiv")
                .style("visibility", "hidden");
            app.mode.chmode("interactive"); }
    };
}());
