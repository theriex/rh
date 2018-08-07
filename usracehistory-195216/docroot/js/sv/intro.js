/*jslint browser, multivar, white, fudge, long */
/*global app, window, jt, d3 */

app.intro = (function () {
    "use strict";

    var tstat = null,    //duration timing stats container
        tl = null,       //grab useful geometry from linear timeline display
        chart = {},      //container for svg references
        plat = {
            type:"unknown",
            //iOS Safari or comparable
            ios: {
                add:"Click the share button on your browser and select \"Add to Home Screen\"",
                fav:"Click the share button on your browser and select \"Add to Favorites\""},
            //Android Chrome or comparable.  In Firefox the "Add to Home
            //Screen" option is under the "Page" submenu, which is crappy
            //organization since this is more important than bookmarks.
            //Going with Chrome as the standard
            android: {
                add:"In your browser menu, select \"Add to Home screen\".",
                fav:"In your browser menu, select the star icon." },
            //mobile device not otherwise covered specifically
            genmob: {
                fav:"Select the star icon or the bookmark option in your browser menu." },
            //The command-D keyboard shortcut is recognized by Chrome,
            //Safari, Firefox and others.  It brings up an appropriate
            //dialog in each case.  At the time of this writing Safari does
            //not have the star option on the desktop browser menu, so going
            //with the keyboard shortcut standard.  Replace "command-D" with
            //"Ctrl-D" for non-Mac.
            pc: {
                fav:"Press command-D to bookmark this site" }};

    function initHTMLContent () {
        jt.out("suppvisdiv", jt.tac2html(
            ["div", {id:"sv0contdiv"},
             [["div", {id:"sv0unlockdiv"},
               ["svg", {id:"sv0usvg", width:tl.width2, height:chart.vu.svgh}]],
              ["div", {id:"sv0timediv"}],
              ["div", {id:"sv0textdiv"}],
              ["div", {id:"sv0linkdiv"}],
              ["div", {id:"sv0closediv"}],
              ["div", {id:"sv0txtdiv", 
                       style:"position:absolute;left:30px;top:120px;" +
                             "margin-right:30px;opacity:0.0;"}]]]));
    }


    function makeBracket (bo) {
        var brg = bo.g.append("g").attr("id", bo.id + "g");
        bo.bth = Math.round(bo.h / 20);  //border thickness
        bo.fill = "none";  //initial triangle cut off Mac FF
        brg.append("rect")
            .attr("id", bo.id)
            .attr("x", bo.x)
            .attr("y", bo.y)
            .attr("width", bo.w)
            .attr("height", bo.h)
            .style("fill", bo.fill);
        brg.append("rect")
            .attr("id", bo.id + "topborder")
            .attr("x", bo.x)
            .attr("y", bo.y)
            .attr("width", bo.w)
            .attr("height", bo.bth)
            .style("fill", bo.border);
        brg.append("rect")
            .attr("id", bo.id + "bottomborder")
            .attr("x", bo.x)
            .attr("y", bo.y + bo.h - bo.bth)
            .attr("width", bo.w)
            .attr("height", bo.bth)
            .style("fill", bo.border);
        bo.sx = bo.x;
        if(bo.side === "right") {
            bo.sx = bo.x + bo.w - bo.bth; }
        brg.append("rect")
            .attr("id", bo.id + "sideborder")
            .attr("x", bo.sx)
            .attr("y", bo.y)
            .attr("width", bo.bth)
            .attr("height", bo.h)
            .style("fill", bo.border);
    }


    function makeTriangle (to) {
        var trg = to.g.append("g").attr("id", to.id + "g");
        trg.append("path")
            .attr("d", "M " + to.x1 + " " + to.y1 +
                      " L " + to.x2 + " " + to.y2 +
                      " L " + to.x3 + " " + to.y3 +
                      " Z")
            .style("fill", to.fill)
            .style("stroke", to.fill);
        return trg;
    }


    function makeBracketsAndTriangles (vu) {
        //combined scale and translate via matrix transform leads to
        //distance adjustments that don't work (FF).
        vu.lmg = vu.g.append("g").attr("id", "leftmoveg");
        vu.rmg = vu.g.append("g").attr("id", "rightmoveg");
        vu.leftg = vu.lmg.append("g").attr("id", "leftg");
        vu.rightg = vu.rmg.append("g").attr("id", "rightg");
        makeBracket({g:vu.leftg, id:"leftrec", side:"left",
                     x:vu.cx - vu.rect.w, y:vu.svgh - vu.rect.h,
                     w:vu.rect.w, h:vu.rect.h,
                     fill:vu.rect.fill, border:vu.rect.border});
        makeBracket({g:vu.rightg, id:"rightrec", side:"right",
                     x:vu.cx, y:vu.svgh - vu.rect.h,
                     w:vu.rect.w, h:vu.rect.h,
                     fill:vu.rect.fill, border:vu.rect.border});
        vu.tin = Math.round(0.20 * vu.rect.h);
        vu.tlo = {g:vu.leftg, id:"lefttri", side:"left",
                  x1:vu.cx + vu.rect.w - vu.tin,       //upper right
                  y1:vu.svgh - vu.rect.h + vu.tin,
                  x2:vu.cx - vu.rect.w + vu.tin,       //top left
                  y2:vu.svgh - vu.rect.h + vu.tin,
                  x3:vu.cx - vu.rect.w + vu.tin,       //lower left
                  y3:vu.svgh - vu.tin,
                  fill:vu.tri.fill};
        vu.tlg = makeTriangle(vu.tlo);
        vu.tro = {g:vu.rightg, id:"righttri", side:"right",
                  x1:vu.cx + vu.rect.w - vu.tin,       //upper right
                  y1:vu.svgh - vu.rect.h + vu.tin,
                  x2:vu.cx + vu.rect.w - vu.tin,       //lower right
                  y2:vu.svgh - vu.tin,
                  x3:vu.cx - vu.rect.w + vu.tin,       //lower left
                  y3:vu.svgh - vu.tin,
                  fill:vu.tri.fill};
        vu.trg = makeTriangle(vu.tro);
    }


    function animateBrackets (vu) {
        vu.tim = {unfurl:chart.visunfurltime,
                  rot:{del:Math.round(0.9 * chart.visunfurltime),
                       dur:400}};
        //rotate triangles to form arrows
        vu.tlg.transition().delay(vu.tim.rot.del).duration(vu.tim.rot.dur)
            .attr("transform", "rotate(-45 " + vu.cx + " " + 
                  (vu.svgh - (vu.rect.h / 2)) + ")");
        vu.trg.transition().delay(vu.tim.rot.del).duration(vu.tim.rot.dur)
            .attr("transform", "rotate(-45 " + vu.cx + " " + 
                  (vu.svgh - (vu.rect.h / 2)) + ")");
        vu.tim.mv = {del:vu.tim.rot.del + vu.tim.rot.dur,
                     dur:800};
        //shrink width
        vu.scalex = 0.3;
        vu.leftg.transition().delay(vu.tim.mv.del).duration(vu.tim.mv.dur)
            .attr("transform", "scale(" + vu.scalex + ",1)");
        vu.rightg.transition().delay(vu.tim.mv.del).duration(vu.tim.mv.dur)
            .attr("transform", "scale(" + vu.scalex + ",1)");
        //move to edges
        vu.transx = (-1 * (vu.cx - vu.rect.w)) * vu.scalex;
        vu.lmg.transition().delay(vu.tim.mv.del).duration(vu.tim.mv.dur)
            .attr("transform", "translate(" + vu.transx + ")");
        //offset to move the contents to the right side within shrunken space
        vu.rs = (vu.cx - vu.rect.w) * vu.scalex;
        //offset to move entire shrunken space to right side of total space
        vu.ss = tl.width2 * (1 - vu.scalex);
        vu.transx = vu.rs + vu.ss;
        vu.rmg.transition().delay(vu.tim.mv.del).duration(vu.tim.mv.dur)
            .attr("transform", "translate(" + vu.transx + ")");
    }


    function drawHorizontalLine (vu) {
        var pad = 2;
        vu.g.append("rect")
            .attr("id", "horizontalline")
            .attr("x", vu.cx - 1)
            .attr("y", vu.svgh - (vu.rect.h / 2))
            .attr("width", 1)
            .attr("height", 3)
            .style("fill", "#000")
        .transition().delay(vu.tim.mv.del).duration(vu.tim.mv.dur)
            .attr("x", (vu.rect.w * vu.scalex) + pad)
            .attr("width", tl.width2 - 
                  (2 * (vu.rect.w * vu.scalex)) - (2 * pad));
    }


    function drawUnlockedText (vu) {
        var pad = 5;
        vu.tim.txt = {del:vu.tim.mv.del + vu.tim.mv.dur - 200,
                      dur:500};
        vu.textcolor = "#000";
        vu.textsize = "36px";
        vu.textg = vu.g.append("g").attr("id", "textg");
        vu.textg.append("text")
            .attr("x", vu.cx)
            .attr("y", vu.cy - (vu.rect.h * 3 / 4) - pad)
            .attr("fill", vu.textcolor)
            .attr("opacity", 0.0)
            .style("font-size", vu.textsize)
            .style("font-weight", "bold")
            .style("text-anchor", "middle")
            .text("Chronology")
            .transition().delay(vu.tim.txt.del).duration(vu.tim.txt.dur)
            .attr("opacity", 1.0);
        vu.textg.append("text")
            .attr("x", vu.cx)
            .attr("y", vu.cy - (vu.rect.h / 4) + pad)
            .attr("fill", vu.textcolor)
            .attr("opacity", 0.0)
            .style("font-size", vu.textsize)
            .style("font-weight", "bold")
            .style("text-anchor", "middle")
            .text("Unlocked")
            .transition().delay(vu.tim.txt.del).duration(vu.tim.txt.dur)
            .attr("opacity", 1.0);
    }


    function showCloseButton () {
        jt.out("sv0closediv", jt.tac2html(
            ["button", {type:"button", cla:"ghostbutton",
                        onclick:jt.fs("app.intro.close()")},
             "Continue"]));
    }


    function close () {
        tstat.end = new Date();
        app.mode.svdone("intro", tstat.start, tstat.end);
    }


    function displayActionText (action) {
        jt.out("sv0txtdiv", jt.tac2html(
            ["div", {id:"sv0actiondiv"},
             [plat[plat.type][action],
              ["div", {id:"sv0buttonsdiv"},
               ["button", {type:"button", cla:"ghostbutton",
                           onclick:jt.fs("app.intro.hidetxtdiv()")},
                "Ok"]]]]));
        jt.byId("sv0txtdiv").style.opacity = 1.0;
    }


    function displayActionLink () {
        var html;
        if(plat.type === "pc" || plat.type === "mac") {
            html = plat.pc.fav;
            if(plat.type === "pc") {
                html = html.replace(/command-D/ig, "Ctrl-D"); }
            jt.out("sv0linkdiv", html); }
        else {
            html = jt.byId("sv0textdiv").innerHTML;
            html += "<br/>Add this site to your";
            jt.out("sv0textdiv", html);
            html = [];
            if(!plat[plat.type]) {  //should always be defined but just in case
                plat.type = "genmob"; }
            if(plat[plat.type].add) {
                html.push(["a", {href:"#addToHomeScreen",
                                 onclick:jt.fs("app.intro.actlink('add')")},
                           "Home Screen"]);
                html.push(" | "); }
            html.push(["a", {href:"#addToFavorites",
                             onclick:jt.fs("app.intro.actlink('fav')")},
                       "Favorites"]); }
        jt.out("sv0linkdiv", jt.tac2html(html));
        setTimeout(showCloseButton, 4000);
    }


    //The goal here is to provide an easy path back to resuming the timeline
    //since it takes several visits to complete.  Bookmarking the site can
    //help people return, but adding the app to the homescreen is normally
    //preferable in terms of visibility and ease of access.  This prompting
    //is in addition to whatever automated support is provided via the
    //manifest/serviceWorker interface.
    function initLinkText () {
        var userAgent = navigator.userAgent || navigator.vendor || window.opera;
        //windows phones also claim android and IOS.
        if(/windows\sphone/i.test(userAgent)) {
            plat.type = "genmob"; }
        else if(/android/i.test(userAgent)) {
            plat.type = "android"; }
        else if(/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
            plat.type = "ios"; }
        else if(/Mac/.test(userAgent)) {
            plat.type = "mac"; }
        else {
            plat.type = "pc"; }
        //Space for an additional text message if needed.
        jt.out("sv0textdiv", "");
        setTimeout(displayActionLink, 1200);
    }


    function initInteractiveText () {
        setTimeout(initLinkText, 800);
    }


    function initDisplayElements () {
        var vu = {svgh:Math.round(0.48 * tl.height),
                  rect:{h:80, w:40, fill:"#638991", border:"#333"},
                  tri:{fill:"#990000"},
                  cx:Math.round(tl.width2 / 2),
                  cy:Math.round(tl.height / 2)};
        chart.visunfurltime = 2000;
        chart.vu = vu;
        initHTMLContent();
        vu.g = d3.select("#sv0usvg").append("g");
        makeBracketsAndTriangles(vu);
        animateBrackets(vu);
        drawHorizontalLine(vu);
        drawUnlockedText(vu);
        setTimeout(initInteractiveText, vu.tim.txt.del + vu.tim.txt.dur - 200);
        d3.select("#suppvisdiv")
            .style("left", vu.cx - 15 + "px")
            .style("top", vu.cy - 15 + "px")
            .style("width", 30 + "px")
            .style("height", 30 + "px")
            .style("background", "radial-gradient(80% 40%, #d6edf2, #4aaec3)")
            .style("visibility", "visible")
            .transition().duration(chart.visunfurltime)
            .style("left", tl.margin.left + "px")
            .style("top", tl.margin.top + "px")
            .style("width", tl.width2 + "px")
            .style("height", tl.height + "px");
    }


    function display () {
        tstat = {start: new Date()};
        tl = app.linear.timeline();
        initDisplayElements();
    }


    return {
        display: function () { display(); },
        actlink: function (action) { displayActionText(action); },
        close: function () { close(); },
        hidetxtdiv: function () { jt.byId("sv0txtdiv").style.opacity = 0; },
        initLinkText: function () { initLinkText(); }
    };
}());
