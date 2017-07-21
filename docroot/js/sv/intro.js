/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.intro = (function () {
    "use strict";

    var sv = null,       //decorated suppvis from data.js 
        tl = null,       //linear timeline settings and data
        endf = null,     //callback for after visualization has finished
        chart = {},      //container for svg references
        mobile = false;  //browser device flag

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


    function computeEstimatedCompletionTime () {
        var t = 0;
        app.data.pts.forEach(function (pt) {
            if(!pt.visited && !pt.sv) {
                //takes me avg 11 seconds/pt. Figure double if unfamiliar.
                t += 22; } }); 
        app.data.suppvis.forEach(function (sv) {
            if(!sv.visited) {
                //figure 5 minutes for each suppvis on average
                t += 5 * 60; } });
        chart.vu.avgct = t;   //count in seconds
    }


    function updateCompletionTimeDisplay () {
        var t, hr, min, sec;
        chart.vu.avgct -= 1;
        t = Math.max(chart.vu.avgct, 0);
        sec = t % 60;
        if(sec < 10) {
            sec = "0" + sec; }
        t = Math.floor(t / 60);
        min = t % 60;
        if(min < 10) {
            min = "0" + min; }
        hr = Math.floor(t / 60);
        jt.out("sv0timediv", "Estimated completion time " + 
               hr + ":" + min + ":" + sec);
        setTimeout(updateCompletionTimeDisplay, 1000);
    }


    function showCloseButton () {
        jt.out("sv0closediv", jt.tac2html(
            ["button", {type:"button", cla:"ghostbutton",
                        onclick:jt.fs("app.intro.close()")},
             "Continue"]));
    }


    function close () {
        var date, nowiso;
        date = new Date();
        sv.startstamp = app.db.wallClockTimeStamp(sv.startDate);
        sv.duration = app.db.getElapsedTime(date, sv.startDate);
        nowiso = date.toISOString();
        sv.pts.forEach(function (pt) {
            pt.visited = nowiso; });
        sv.visited = nowiso;
        d3.select("#suppvisdiv")
            .style("visibility", "hidden");
        endf();
    }


    function addToHomeScreen () {
        jt.out("sv0txtdiv", jt.tac2html(
            ["div", {id:"sv0howtodiv"}, 
             ["Not implemented yet",
              ["div", {id:"sv0buttonsdiv"},
               ["button", {type:"button", cla:"ghostbutton",
                           onclick:jt.fs("app.intro.hidetxtdiv()")},
                "Ok"]]]]));
        jt.byId("sv0txtdiv").style.opacity = 1.0;
    }


    function addToBookmarks () {
        jt.out("sv0txtdiv", jt.tac2html(
            ["div", {id:"sv0howtodiv"}, 
             ["Not implemented yet",
              ["div", {id:"sv0buttonsdiv"},
               ["button", {type:"button", cla:"ghostbutton",
                           onclick:jt.fs("app.intro.hidetxtdiv()")},
                "Ok"]]]]));
        jt.byId("sv0txtdiv").style.opacity = 1.0;
    }


    function displayActionLink () {
        if(mobile) {
            jt.out("sv0linkdiv", jt.tac2html(
                ["a", {href:"#addToHomeScreen",
                       onclick:jt.fs("app.intro.addToHomeScreen()")},
                 "Add This Site To Your Home Screen"])); }
        else {
            jt.out("sv0linkdiv", jt.tac2html(
                ["a", {href:"#addToBookmarks",
                       onclick:jt.fs("app.intro.addToBookmarks()")},
                 "Bookmark This Site"])); }
        setTimeout(showCloseButton, 5000);
    }


    function initLinkText () {
        var userAgent = navigator.userAgent || navigator.vendor || window.opera;
        //windows phones also claim android and IOS.
        if((/windows\sphone/i.test(userAgent)) ||
           (/android/i.test(userAgent)) ||
           (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream)) {
            mobile = true; }
        //Removed statement about being speedier or more thorough.  Keep
        //this concise
        jt.out("sv0textdiv", "This will take more than one visit.");
        setTimeout(displayActionLink, 1200);
    }


    function initInteractiveText () {
        computeEstimatedCompletionTime();
        updateCompletionTimeDisplay();
        setTimeout(initLinkText, 3200);
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


    function display (suppvis, timeline, endfunc) {
        sv = suppvis || app.lev.suppVisByCode("sl");
        tl = timeline || app.linear.tldata();
        endf = endfunc || app.dlg.close;
        sv.startDate = new Date();
        initDisplayElements();
    }


    return {
        display: function (sv, tl, endf) { display(sv, tl, endf); },
        addToHomeScreen: function () { addToHomeScreen(); },
        addToBookmarks: function () { addToBookmarks(); },
        close: function () { close(); },
        hidetxtdiv: function () { jt.byId("sv0txtdiv").style.opacity = 0; }
    };
}());
