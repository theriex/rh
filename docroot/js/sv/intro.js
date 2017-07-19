/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.intro = (function () {
    "use strict";

    var sv = null,    //decorated suppvis from data.js 
        tl = null,    //linear timeline settings and data
        endf = null,  //callback for after visualization has finished
        chart = {};   //container for svg references


    function initHTMLContent () {
        jt.out("suppvisdiv", jt.tac2html(
            ["div", {id:"sv0contdiv"},
             [["div", {id:"sv0unlockdiv"},
               ["svg", {id:"sv0usvg", width:tl.width2, height:chart.vu.svgh}]],
              ["div", {id:"sv0timediv"}],
              ["div", {id:"sv0textdiv"}],
              ["div", {id:"sv0linkdiv"}],
              ["div", {id:"sv0closediv"}]]]));
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
            .style("stroke", to.fill)
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
        var sw = 0.5, mat = {};
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
        mat.scalex = 0.3;
        vu.leftg.transition().delay(vu.tim.mv.del).duration(vu.tim.mv.dur)
            .attr("transform", "scale(" + mat.scalex + ",1)");
        vu.rightg.transition().delay(vu.tim.mv.del).duration(vu.tim.mv.dur)
            .attr("transform", "scale(" + mat.scalex + ",1)");
        //move to edges
        mat.transx = (-1 * (vu.cx - vu.rect.w)) * mat.scalex;
        vu.lmg.transition().delay(vu.tim.mv.del).duration(vu.tim.mv.dur)
            .attr("transform", "translate(" + mat.transx + ")");
        //offset to move the contents to the right side within shrunken space
        mat.rs = (vu.cx - vu.rect.w) * mat.scalex;
        //offset to move entire shrunken space to right side of total space
        mat.ss = tl.width2 * (1 - mat.scalex);
        mat.transx = mat.rs + mat.ss;
        vu.rmg.transition().delay(vu.tim.mv.del).duration(vu.tim.mv.dur)
            .attr("transform", "translate(" + mat.transx + ")");
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


    function initAnimationSequence () {
        //expand the box to show the unlock
        //display the average completion time with countdown
        //display the text and link
    }


    function display (suppvis, timeline, endfunc) {
        sv = suppvis || app.lev.suppVisByCode("sl");
        tl = timeline || app.linear.tldata();
        endf = endfunc || app.dlg.close;
        sv.startDate = new Date();
        initDisplayElements();
        initAnimationSequence();
    }


    return {
        display: function (sv, tl, endf) { display(sv, tl, endf); }
    };
}());
