/*jslint browser, multivar, white, fudge */
/*global app, window, jt, d3 */

app.picbg = (function () {
    "use strict";

    var divid = "",
        picpts = null,
        picgrid = {x: 10, y: 6},  //may be inverted on init
        dd = null;  //display div dimensions object


    function initPicPoints () {
        var idx;
        picpts = [];
        app.data.pts.forEach(function (pt) {
            if(pt.pic) {
                picpts.push(pt); } });
        while(picpts.length > (picgrid.x * picgrid.y)) {
            idx = Math.floor(Math.random() * picpts.length);
            picpts.splice(idx, 1); }
    }


    function initialize (picdivid) {
        var div, sd, cs, i, j, picidx, picsrc, html = [];
        divid = picdivid;
        div = jt.byId(divid);
        dd = {w: div.offsetWidth, h: div.offsetHeight}
        if(dd.h > dd.w) {  //invert the grid to be tall instead of wide
            picgrid = {x: picgrid.y, y: picgrid.x}; }
        sd = {w: Math.floor(dd.w / picgrid.x), wm: (dd.w % picgrid.x) - 1,
              h: Math.floor(dd.h / picgrid.y), hm: (dd.h % picgrid.y) - 1};
        initPicPoints();
        cs = {w: 0, h: 0};
        for(i = 0; i < picgrid.y; i += 1) {
            for(j = 0; j < picgrid.x; j += 1) {
                cs.w = sd.w;
                if(j < sd.wm) {
                    cs.w += 1; }
                cs.h = sd.h;
                if(i < sd.hm) {
                    cs.h += 1; }
                picidx = (i * picgrid.x) + j;
                picsrc = "img/datapics/" + picpts[picidx].pic;
                html.push(["div", {id: "pdx" + j + "y" + i,
                                   cla: "bgpicdiv",
                                   style: "width:" + cs.w + "px;" +
                                          "height:" + cs.h + "px;"},
                           ["img", {cla: "bgpicimg",
                                    style: "max-width:" + cs.w + "px;" +
                                           "max-height:" + cs.h + "px;",
                                    src: picsrc}]]); } }
        jt.out(divid, jt.tac2html(html));
    }


    function handleMouseClick (mx, my) {
        var pb, pt;
        pb = {x: Math.floor(picgrid.x * (mx / dd.w)),
              y: Math.floor(picgrid.y * (my / dd.h))}
        pt = picpts[(pb.y * picgrid.x) + pb.x];
        app.mode.interject(pt);
    }


    return {
        init: function (divid) { initialize(divid); },
        click: function (mxy) { handleMouseClick(mxy[0], mxy[1]); }
    };
}());
