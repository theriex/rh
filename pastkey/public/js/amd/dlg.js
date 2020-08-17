/*jslint browser, white, fudge, for, long */
/*global app, jt, d3, confirm */

app.dlg = (function () {
    "use strict";

    var lnfs = [
        {name: "parchment", dlgbg: "#f8e6a0", textbg: "#fff5ce", 
         datebg: "#fff0b7", buttonbg: "#ffe278"},
        {name: "slate", dlgbg: "#beddb9", textbg: "#d8f2d3", 
         datebg: "#ddfad8", buttonbg: "#aec8aa"},
        {name: "sky", dlgbg: "#c6deff", textbg: "#e7f1ff",
         datebg: "#e9f5f8", buttonbg: "#c0e3eb"}];
    var buttonText = {yes:"Yes", no:"No"};
    var birthyeardefault = (new Date()).getFullYear() - 27;
    var generationyrs = 30;
    var gendat = {accepted:false, gens:[
            {id:"geyou", abbr:"You", name: "You", year: birthyeardefault},
            {id:"gepar", abbr:"Parents", name: "Parents", 
             year: birthyeardefault - generationyrs},
            {id:"gegrn", abbr:"Grands", name: "Grandparents", 
             year: birthyeardefault - 2 * generationyrs},
            {id:"gegrt", abbr:"G.Grands", name: "Great Grandparents", 
             year: birthyeardefault - 3 * generationyrs },
            {id:"geold", abbr:"Ancestors", name: "Ancestors", 
             year: 1000},
            {id:"geanc", abbr:"Ancients", name:"Ancient Ancestors", 
             year: -90000}]};
    var edptflds = null;
    var upldmon = null;
    var cookname = "userauth";
    var cookdelim = "..pastkey..";
    var lnfidx = 0;
    var tl = null;
    var editpt = null;
    var dlgstack = [];
    var sip = {};  //sign-in prompting
    var popdim = null;
    var orgtabs = ["contact", "keywords", "members"];


    function setCookie (an, at) {
        jt.cookie(cookname, an + cookdelim + at, 365);
    }


    //The api updacc, newacct and acctok calls all return the same result
    //array consisting of the AppUser and an access token.  The private
    //information is stored in app.user, and the public information is
    //stored in app.user.acc.
    function saveUserInfo (result) {
        app.user.email = result[0].email;
        app.user.status = result[0].status;
        app.user.tok = result[1];
        app.user.acc = app.refmgr.put(app.refmgr.deserialize(result[0]));
        //set auth cookie info and create auth params utility method
        setCookie(app.user.email, app.user.tok);
        app.auth = function () {
            return "an=" + jt.enc(app.user.email) + "&at=" + app.user.tok; };
        //set the generation data if available
        if(app.user.acc.settings && app.user.acc.settings.gendat) {
            gendat = app.user.acc.settings.gendat; }
    }


    function nextColorTheme () {
        lnfidx += 1;
        lnfidx = lnfidx % lnfs.length;
    }


    function styleDialog (d) {
        var ct = lnfs[lnfidx];
        var div = jt.byId("itemdispdiv");
        if(d) {
            div.style.borderRadius = "50px 5px 30px 5px";
            div.style.background = ct.dlgbg; }
        else {
            div.style.borderRadius = "50px";
            div.style.background = ct.textbg; }
        d3.select(".dlgtextdiv").style("background", ct.textbg);
        d3.select("#dlgdatespan").style("background", ct.datebg);
        d3.select("#choicebuttonsdiv").style("background", ct.textbg);
        d3.selectAll("button").style("background", ct.buttonbg);
    }


    function constrainDialogToChartDims () {
        var dim = {mx:Math.round(0.01 * tl.width),
                   myt:Math.round(0.15 * tl.height),
                   myb:Math.round(0.9 * tl.height)};
        if(tl.width > 500) {  //expand the x margin to appear less elongated
            dim.mx = Math.round(0.04 * tl.width); }
        dim.x = tl.margin.left + dim.mx;
        dim.w = tl.width - tl.margin.left - (2 * dim.mx);
        //Start the dialog near the bottom of the display so content
        //adjustments can move it up rather than down. This is in case of
        //visual artifacts due to timing hiccups or whatever.
        dim.y = Math.round(0.9 * tl.height);
        dim.h = dim.myb - dim.myt;
        //verify width and height are not unworkably small.
        dim.w = Math.max(dim.w, 100);
        dim.h = Math.max(dim.h, 100);
        d3.select("#itemdispdiv")
            .style("left", dim.x + "px")
            .style("top", dim.y + "px")
            .style("max-width", dim.w + "px")
            .style("max-height", dim.h + "px");
        return dim;
    }


    function constrainTextToDialogHeight (d, dlgdim) {
        var ph = 166;  //default infopic max-height from css
        var resids = ["dlgdatediv", "dlgbuttondiv"];
        //Set min text area height equal img height so pic not squished.
        if(d && d.pic) {
            var img = jt.byId("dlgpicimg");
            if(img && img.offsetHeight) {
                ph = img.offsetHeight; }
            jt.byId("dlgtextdiv").style.minHeight = ph + "px";
            //pad 4 margin-top 2 === 10, extra in case === 12
            jt.byId("dlgcontentdiv").style.minHeight = (ph + 12) + "px"; }
        //Set max text area height equal to max dlg height - header/footer
        if(!d) {
            resids[0] = "dlgtitlediv"; }
        var mh = dlgdim.h;
        resids.forEach(function (id) {
            var elem = jt.byId(id);
            if(elem) {
                mh -= elem.offsetHeight; } });
        mh -= 10;  //avoid off-by-one calcs, default margins..
        d3.select("#dlgcontentdiv")  //text and img areas together
            .style("max-height", mh + "px");
    }


    function verticallyPositionDialog (d, dim) {
        var y = dim.myt;
        var dd = jt.byId("itemdispdiv");
        if(d && dd && ((dd.offsetHeight - 10) < dim.h)) {
            var xa = tl.y(tl.pts[0].vc);  //first point should be on x-axis
            y = tl.y(d.vc) - xa;  //start with logical offset value
            y *= -1;  //invert so more chance circle is visible
            y = xa + y;
            var bump; //if y is close to x-axis, bump it upwards or downwards
            if(y > xa) {
                bump = Math.round(0.2 * (2 * xa));
                if(y < xa + bump) {
                    y = xa + bump; } }
            else if (y <= xa) {
                bump = Math.round(0.4 * (2 * xa));
                if(y > xa - bump) {
                    y = xa - bump; } }
            //top of dlg must be no higher than top margin
            y = Math.max(y, dim.myt);
            //bottom should not exceed bottom margin
            y = Math.min(y, dim.myb - (dd.offsetHeight + 10)); }
        d3.select("#itemdispdiv")
            .style("top", y + "px");
        var yval = y;  //variable avoids lint tool complaint...
        popdim = {x:dim.x, y:yval, w:dim.w, h:dim.h};  //popup over dialog
    }


    function displayDialog (d, html) {
        var dim;
        if(d) {
            jt.log("displayDialog " + d.instid + " " + 
                   d.text.slice(0, 50) + "..."); }
        dim = constrainDialogToChartDims();
        //Verify the dialog is hidden so there is no blink when the content
        //gets updated.
        jt.byId("popupdiv").style.visibility = "hidden";
        jt.byId("itemdispdiv").style.visibility = "hidden";
        jt.out("itemdispdiv", html);
        constrainTextToDialogHeight(d, dim);
        verticallyPositionDialog(d, dim);
        styleDialog(d);
        //give the content a few millis to render so it's not ignored
        setTimeout(function () {
            d3.select("#itemdispdiv")
                .style("max-height", "4px")
                .style("visibility", "visible")
                .transition().duration(500)
                .style("max-height", dim.h + "px"); }, 
                   //This timeout value affects setFocus and verifyClosed
                   1000);  //< verifyClosed timeout
    }


    function wrapText (txt, cc, minw) {
        var line = "";
        var res = []; 
        var words = txt.split(/\s/);
        words.forEach(function (word) {
            if(line.length + word.length < cc) {
                line += " " + word; }
            else {
                if(line) {  //have previously appended words
                    res.push(line); }
                line = word; } });
        if(line) {  //append any remainder
            res.push(line); }
        res = res.join("<br/> ").trim();
        if(window.innerWidth < minw) {
            res = res.replace(/<br>/g, "");
            res = res.replace(/<br\/>/g, ""); }
        return res;
    }
        // html = "An introduction<br/>" +
        //     " to the history<br/>" +
        //     " of race and racism<br/>" +
        //     " in the United States<br/>";


    function showStartDialog (title, subtitle, clickfstr, cmt) {
        var html = wrapText(subtitle || "", 18, 400);
        //no dialog dismissal option.  Use menu select to do something else.
        html = ["div", {id:"introdlgdiv"},
                [["div", {id:"introtitlediv"}, title],
                 ["table",
                  ["tr",
                   [["td",
                     ["div", {cla: "dlgtextdiv"}, html]],
                    ["td", 
                     ["div", {id: "startdiv", onclick: clickfstr},
                      ["div", {id: "startcontdiv"},
                       "Start"]]]]]]]];
        displayDialog(null, jt.tac2html(html));
        if(cmt && cmt.type === "popup") {
            setTimeout(function () {
                var pd = jt.byId("popupdiv");
                pd.innerHTML = jt.tac2html(
                    ["div", {id:"popupcontdiv"},
                     ["table",
                      [["tr",
                        ["td",
                         ["div", {id:"popuptxtdiv"}, 
                          wrapText(cmt.text, 32, 400)]]],
                       ["tr",
                        ["td",
                         ["div", {cla:"buttonsdiv"},
                          ["button", {type:"button", id:"popokbutton",
                                      onclick:jt.fs("app.dlg.closepop()")},
                           cmt.button]]]]]]]);
                pd.style.left = (popdim.x + 10) + "px";
                pd.style.top = (popdim.y + 50) + "px";
                //pd.style.width = (popdim.w - 20) + "px";
                pd.style.maxWidth = (popdim.w - 20) + "px";
                pd.style.visibility = "visible"; }, 1000); }
    }


    function closePopup () {
        jt.byId("popupdiv").style.visibility = "hidden";
    }


    function rememberCheckboxTAC (checked) {
        var html;
        html = ["div", {cla:"checkboxdiv"},
                [["input", {type:"checkbox", id:"cbremember",
                            value:"remembered", checked:jt.toru(checked)}],
                 ["label", {fo:"cbremember", id:"remcblabel"},
                  "Remember"]]];
        return html;
    }


    function getYearGuessOptions (pt, flank) {
        var pti = 0; var idx = 0; var dp; var off; var years = [pt.start.year];
        for(pti = 0; pti < tl.pts.length; pti += 1) {
            if(tl.pts[pti].instid === pt.instid) {
                break; } }
        idx = pti - 1;
        while(idx >= 0 && years.length < flank) {
            dp = tl.pts[idx];
            if(dp.start.year !== years[0]) {
                //jt.log("yr guess unshift " + dp.start.year + ", idx: " + idx);
                years.unshift(dp.start.year); }
            idx -= 1; }
        idx = pti + 1;
        while(idx < tl.pts.length && years.length <= 2 * flank) {
            dp = tl.pts[idx];
            if(dp.start.year !== years[years.length - 1]) {
                //jt.log("yr guess push " + dp.start.year + ", idx: " + idx);
                years.push(dp.start.year); }
            idx += 1; }
        //find the original year again, array may not be balanced
        idx = 0;
        while(idx < years.length && years[idx] !== pt.start.year) {
            idx += 1; }
        off = Math.floor(Math.random() * (flank + 1));
        idx = Math.max(idx - off, 0);
        years = years.slice(idx, idx + flank + 1);
        return years;
    }


    function yearButtonId (year) {
        var yid = "yearbutton" + Math.abs(year);
        if(year < 0) {
            yid += "bce"; }
        return yid;
    }


    function pointKeywords (pt) {
        var keys = [];
        app.keyflds.forEach(function (field) {
            if(pt[field]) {
                pt[field].csvarray().forEach(function (key) {
                    keys.push(key); }); } });
        return keys.join(", ");
    }


    function prevButtonTAC (d) {
        var html = "";
        var tlpts = app.linear.tldata().pts;
        var idx = 0;
        while(idx < tlpts.length && tlpts[idx].instid !== d.instid) {
            idx += 1; }
        if(idx > 0 && idx < tlpts.length) {  //found it, and not first point
            html = ["div", {id:"prevlinkdiv"},
                    ["a", {href:"#previous",
                           onclick:jt.fs("app.linear.byPtId('" + 
                                         tlpts[idx - 1].instid + "','" +
                                         d.instid + "')")},
                     "&#8678;"]]; }  //Leftwards White Arrow U+21E6
        return html;
    }


    function forwardButtonTAC (d) {
        var html = "";
        var currpt = app.mode.currpt();
        var tlpts = app.linear.tldata().pts;
        var idx = tlpts.length - 1;
        while(idx > 0 && tlpts[idx].instid !== d.instid) {
            idx -= 1; }
        if(idx < tlpts.length - 1 && 
           (!currpt || currpt.instid !== tlpts[idx + 1].instid)) {
            html = ["div", {id:"forwardlinkdiv"},
                    ["a", {href:"#next",
                           onclick:jt.fs("app.linear.byPtId('" +
                                         tlpts[idx + 1].instid + "','" +
                                         d.instid + "')")},
                     "&#8680;"]]; }  //Rightwards White Arrow U+21E8
        return html;
    }


    function infoButtons (d, inter) {
        var ret = {tac:[], focid:"", date:""};
        if(!inter) {
            ret.tac = [prevButtonTAC(d),
                       forwardButtonTAC(d),
                       ["div", {cla:"buttonptcodesdiv"},
                        [["span", {cla:"buttonptcodeslabelspan"}, 
                          "Keys: "],
                         pointKeywords(d)]],
                       ["button", {type:"button", id:"backbutton",
                                   onclick:jt.fs("app.dlg.button('back')")},
                        "Return To Interactive"]];
            ret.focid = "backbutton";
            ret.date = ["span", {id:"dlgdatespan"}, d.dispdate]; }
        else if(d.qtype === "U") {
            ret.tac = [prevButtonTAC(d),
                       ["span", {cla:"buttonintrospan"}, "Did you know?"],
                       ["div", {id:"choicebuttonsdiv"},
                        [["button", {type:"button", id:"yesbutton",
                                     onclick:jt.fs("app.dlg.button('yes')")},
                          buttonText.yes],
                         ["span", {cla:"dlgbuttonsep"}, "|"],
                         ["button", {type:"button", id:"nobutton",
                                     onclick:jt.fs("app.dlg.button('no')")},
                          buttonText.no],
                         rememberCheckboxTAC(true)]]];
            ret.focid = "nobutton";
            ret.date = ["span", {id:"dlgdatespan"}, d.dispdate]; }
        else if(d.qtype === "D") {
            ret.tac = [prevButtonTAC(d)];
            d.yearguesses = getYearGuessOptions(d, 3);
            d.yearguesses.forEach(function (year) {
                ret.tac.push(["button", {type:"button", id:yearButtonId(year),
                                         onclick:jt.fs("app.dlg.guessyear(" +
                                                       year + ")")},
                              year]); });
            ret.date = ["span", {id:"dlgdatespan"}, 
                        ["span", {id:"dlgdatequestion"}, "When?"]]; }
        else {
            ret.tac = [prevButtonTAC(d),
                       ["div", {cla:"buttonptcodesdiv"},
                        [["span", {cla:"buttonptcodeslabelspan"}, 
                          "Keys: "],
                         pointKeywords(d)]],
                       ["button", {type:"button", id:"nextbutton",
                                   onclick:jt.fs("app.dlg.button()")},
                        "Continue"]];
            ret.focid = "nextbutton";
            ret.date = ["span", {id:"dlgdatespan"}, d.dispdate]; }
        return ret;
    }


    function cascadeGenerationInfo (id) {
        var cascading = -1; var val = 0;
        gendat.gens.forEach(function (gen, idx) {
            var input = null;
            if(gen.id === id) {
                input = jt.byId(id + "in");
                if(input) {
                    val = input.value; }
                cascading = idx; }
            else if(cascading >= 0) {
                input = jt.byId(gen.id + "in");
                if(input) {
                    input.value = val - (
                        (idx - cascading) * generationyrs); } } });
    }


    function showGenerationEntryForm () {
        var html = [];
        gendat.gens.forEach(function (gen, idx) {
            if(idx <= 3) {
                html.push(["tr", [
                    ["td", {cla:"genentrylabel"}, gen.name],
                    ["td", ["input", {type:"number", id:gen.id + "in",
                                      cla:"genyearinput",
                                      oninput:jt.fs("app.dlg.cascgen('" + 
                                                    gen.id + "')"),
                                      value: gen.year}]]]]); } });
        html = ["div", {id:"genentrycontentdiv"},
                [["div", {id:"genentrytitlediv"}, "Generation Birth Years"],
                 ["div", {id:"genyearstablediv"},
                  ["table", {style:"margin:auto;"}, html]],
                 ["div", {id:"genbuttonsdiv"},
                  [["button", {type:"button", id:"genbcancel", cla:"genbutton",
                               onclick:jt.fs("app.dlg.closegenentry()")},
                    "Cancel"],
                   ["button", {type:"button", id:"genbok", cla:"genbutton",
                               onclick:jt.fs("app.dlg.okgenentry()")},
                    "Ok"]]]]];
        jt.out("genentrydiv", jt.tac2html(html));
        jt.out("genindspan", "");
    }


    function generationIndicator (d) {
        var html; var genobj = null; var i;
        if(!gendat.accepted) {
            html = ["button", {type:"button", cla:"genbutton",
                               onclick:jt.fs("app.dlg.genentry()")},
                    "Generations"]; }
        else {
            for(i = 0; !genobj && i < gendat.gens.length; i += 1) {
                if(gendat.gens[i].year <= d.start.year) {
                    genobj = gendat.gens[i]; } }
            var label = jt.byId("rhcontentdiv");
            if(label && label.offsetWidth > 600) {
                label = genobj.name; }
            else {
                label = genobj.abbr; }
            if(genobj.id === "geyou") {
                label += " (" + (d.start.year - genobj.year) + ")"; }
            html = ["a", {href:"#generations",
                          onclick:jt.fs("app.dlg.genentry()")},
                    "[" + label + "]"]; }
        return html;
    }


    function closeGenerationEntry () {
        jt.out("genentrydiv", "");
        jt.out("genindspan", jt.tac2html(generationIndicator(tl.dlgdat)));
    }


    function saveGenerationInfo () {
        var data;
        gendat.gens.forEach(function (gen) {
            var input = jt.byId(gen.id + "in");
            if(input) {
                gen.year = Number(input.value); } });
        gendat.accepted = true;
        closeGenerationEntry();
        if(app.user && app.user.acc) {
            app.user.acc.settings = app.user.acc.settings || {};
            app.user.acc.settings.gendat = gendat;
            data = jt.objdata({settings:JSON.stringify(app.user.acc.settings)});
            jt.call("POST", "/api/updacc?" + app.auth(), data,
                    function (result) {
                        saveUserInfo(result);
                        jt.log("saveGenerationInfo updacc succeeded"); },
                    function (code, errtxt) {
                        jt.log("saveGenerationInfo " + code + ": " + errtxt); },
                    jt.semaphore("dlg.saveGenerationInfo")); }
    }


    function setFocus (elemid) {
        var elem = jt.byId(elemid);
        if(elem) {
            elem.focus(); }
        //try again in a moment in case the element wasn't ready.  Typically
        //isn't due to displayDialog transitions and timeouts.
        setTimeout(function () {
            elem = jt.byId(elemid);
            if(elem) {
                jt.byId(elemid).focus(); }}, 1200);
    }


    function refsListHTML (refs) {
        var html = [];
        refs.forEach(function (txt) {
            html.push(["li", jt.linkify(txt)]); });
        if(html.length) {
            html = ["ol", {cla:"refslist"}, html]; }
        return jt.tac2html(html);
    }


    function showInfoDialog (d, inter) {
        var buttons; var pichtml = ""; var refshtml; var html;
        tl.dlgdat = d;
        if(d.pic) {
            pichtml = ["div", {cla:"dlgpicdiv", id:"dlgpicdiv"},
                       ["img", {cla:"infopic", id:"dlgpicimg",
                                src:app.ptimgsrc(d)}]]; }
        refshtml = [["a", {onclick:jt.fs("app.dlg.search()")},
                     ["img", {cla:"searchicoimg",
                              src:app.dr("img/search.png")}]]];
        if(d.refs && d.refs.length) {
            refshtml.push([["a", {onclick:jt.fs("app.toggledivdisp('" +
                                            "refslistdiv" + d.instid + "')")},
                            ["span", {cla:"refslinkspan"}, "refs"]],
                           ["div", {id:"refslistdiv" + d.instid,
                                    style:"display:none;"},
                            refsListHTML(d.refs)]]); }
        refshtml = ["div", {id:"dlgrefsdiv"}, refshtml];
        buttons = infoButtons(d, inter);
        html = [["div", {id:"genentrydiv"}],
                ["div", {id:"dlgdatediv"}, 
                 [buttons.date,
                  ["span", {id:"genindspan"}, generationIndicator(d)]]],
                ["div", {id:"dlgcontentdiv"},
                 ["div", {cla:"dlgtextdiv", id:"dlgtextdiv"},
                  [pichtml,
                   app.db.ptlinktxt(d, tl.pts, "app.linear.byPtId"),
                   refshtml]]],
                ["div", {id:"dlgbuttondiv"}, buttons.tac]];
        displayDialog(d, jt.tac2html(html));
        d.interact = {start:new Date()};
        //setting focus the first time does not work for whatever
        //reason, but it helps for subsequent dialog displays.
        if(buttons.focid) {
            setFocus(buttons.focid); }
    }


    function closeInteractionTimeTracking () {
        var pt = tl.dlgdat;
        var inter = pt.interact;
        var ptid = pt.instid;
        var prog = app.db.displayContext().prog;
        var pstr = "";
        inter.end = new Date();
        pt.isoClosed = inter.end.toISOString();
        if(prog.pts.csvcontains(ptid)) {
            prog.pts.csvarray().forEach(function (ps) {
                if(ps.startsWith(ptid)) {
                    ps = ps.split(";");
                    ps[3] = String(Number(ps[3]) + 1);
                    ps = ps.join(";"); }
                pstr.csvappend(ps); }); }
        else { //no existing save status entry
            tl.pendingSaves = tl.pendingSaves || 0;
            tl.pendingSaves += 1;
            pstr = ptid + ";" + inter.start.toISOString() + ";" +
                inter.end.toISOString() + ";1;";
            if(pt.remembered) {
                pstr += "r"; }
            if(pt.qtype === "U") {
                if(inter.answer === "yes") {
                    pstr += "k"; }
                if(inter.answer === "no") {
                    pstr += "u"; } }
            if(pt.qtype === "D") {
                if(!pt.yearmisscount || pt.yearmisscount === 1) {
                    pstr += "1"; }
                else {
                    pstr += pt.yearmisscount; } }
            pstr = prog.pts.csvappend(pstr); }
        prog.pts = pstr;
    }


    function transitionToNext () {
        var dur = 600;
        d3.select("#itemdispdiv").transition().duration(dur)
            .style("top", (tl.height + 20) + "px")
            .style("left", Math.round(tl.width / 2) + "px")
            .style("max-width", "2px")
            .style("max-height", "2px")
            .on("end", app.mode.next);
    }


    function buttonPress (answer) {
        var inter = tl.dlgdat.interact;
        if(answer) {
            if(answer !== "back") {
                inter.answer = answer;
                if(answer !== buttonText.yes) {
                    tl.dlgdat.remembered = jt.byId("cbremember").checked; } } }
        if(answer !== "back") {
            app.mode.updqrc(-1);
            closeInteractionTimeTracking(); }
        transitionToNext();
    }


    function yearGuessButtonPress (year) {
        var pt = tl.dlgdat;
        if(pt.start.year === year) {
            app.mode.updqrc(-1);
            closeInteractionTimeTracking();
            jt.out("dlgdatediv", jt.tac2html(
                ["span", {id:"dlgdatespan"}, pt.dispdate]));
            pt.yearguesses.forEach(function (year) {
                jt.byId(yearButtonId(year)).disabled = true; });
            setTimeout(transitionToNext, 1000); }
        else {
            var button = jt.byId(yearButtonId(year));
            button.disabled = true;
            button.innerHTML = "x";
            pt.yearmisscount = pt.yearmisscount || 0;
            pt.yearmisscount += 1; }
    }


    function readInputFieldValues (fields) {
        var vals = {}; var havereqs = true;
        fields.forEach(function (field) {
            //field can be {fieldname:"x", required:true} or just "x"
            var fin = field.fieldname || field;
            var inelem = jt.byId(fin);
            if(inelem) {
                vals[fin] = inelem.value; }
            else {
                jt.log("readInputFieldValues " + fin + " element not found"); }
            if(field.required) {
                var lv = jt.byId("lab" + fin);
                if(vals[fin]) {  //have value, clear emphasis
                    lv.innerHTML = lv.innerHTML.replace("*", "");
                    lv.style.fontWeight = "normal"; }
                else {  //no value provided, emphasize field and note it
                    lv.innerHTML += "*";
                    lv.style.fontWeight = "bold";
                    havereqs = false; } }
            else if(!vals[fin]) {  //not required, force no value
                vals[fin] = "noval"; } });
        if(!havereqs) {
            return null; }
        return vals;
    }


    function inputsToParams (obj) {
        var co = {};
        if(obj) {
            Object.keys(obj).forEach(function (field) {
                if(field.endsWith("in")) {
                    co[field.slice(0, -2)] = obj[field]; }
                else {
                    co[field] = obj[field]; } }); }
        return jt.objdata(co);
    }


    function createAccount () {
        var cred = readInputFieldValues([
            {fieldname:"emailin", required:true},
            {fieldname:"passwordin", required:true}]);
        if(cred) {
            cred.updemail = cred.emailin;  //pass email without "in"
            //Provide context url for account activation email
            cred.returl = jt.enc(window.location.href);
            jt.out("loginstatdiv", "Creating account...");
            jt.call("POST", "/api/newacct", inputsToParams(cred),
                    function (result) {
                        saveUserInfo(result);
                        app.dlg.close();
                        //Do not rebuild random timelines for a new account
                        //or existing progress for points may be lost.
                        //app.db.initTimelines();
                        app.dlg.myacc(); },
                    function (code, errtxt) {
                        jt.log("createAccount " + code + " " + errtxt);
                        jt.out("loginstatdiv", errtxt); },
                    jt.semaphore("dlg.createAccount")); }
    }


    function disableFieldsIfNotOrgAdmin () {
        var disids = ["namein", "codein", "contacturlin", "projecturlin", 
                      "groupsin", "regionsin", "categoriesin", "tagsin", 
                      "updorgbutton"];
        if(app.user.acc.lev !== 2) {
            disids.forEach(function (id) {
                var elem = jt.byId(id);
                if(elem) {
                    elem.disabled = true; } }); }
    }


    function showOrgMembers () {
        var oms = app.orgmembers || [app.user.acc];
        var labels = ["Members:", "Contributors:", "Administrators:"];
        var html = [];
        if(!jt.byId("orgedmembersdiv")) {
            return; }  //no output area so nothing to do
        oms.sort(function (a, b) {
            if(a.lev > b.lev) { return -1; }
            if(a.lev < b.lev) { return 1; }
            if(a.name < b.name) { return -1; }
            if(a.name > b.name) { return 1; }
            if(a.instid < b.instid) { return -1; }
            if(a.instid > b.instid) { return 1; }
            return 0; });
        oms.forEach(function (om) {
            var nh = om.name;
            if(app.user.acc.lev === 2) {  //administrator
                nh = ["a", {href:"#om" + om.instid,
                            onclick:jt.fs("app.dlg.omexp('" + om.instid + 
                                          "')")}, om.name]; }
            if(labels[om.lev]) {
                html.push(["div", {cla:"dlgformline"}, ["em", labels[om.lev]]]);
                labels[om.lev] = ""; }
            html.push(["div", {cla:"dlgsubline", id:"om" + om.instid}, nh]);
            html.push(["div", {cla:"dlgsubline", id:"om" + om.instid + 
                               "detdiv"}]); });
        jt.out("orgedmembersdiv", jt.tac2html(html));
        if(!app.orgmembers) {
            jt.out("loginstatdiv", "Fetching members...");
            var url = "orgmembers?" + app.auth() + "&orgid=" + 
                app.user.acc.orgid + jt.ts("&cb=", "second");
            jt.call("GET", url, null,
                    function (members) {
                        jt.out("loginstatdiv", "");
                        app.omids = {};
                        members.forEach(function (mem) {
                            mem.name = mem.name || mem.instid;
                            app.omids[mem.instid] = mem; });
                        app.orgmembers = members;
                        showOrgMembers(); },
                    function (code, errtxt) {
                        jt.log("showOrgMembers " + code + ": " + errtxt);
                        jt.out("loginstatdiv", errtxt); },
                    jt.semaphore("dlg.showOrgMembers")); }
    }


    function changeOrgMemberLevel (om, chg) {
        var instid = om.instid;
        om.lev = om.lev + chg;
        jt.log("changeOrgMemberLevel " + om.instid + " -> " + om.lev);
        if(om.lev < 0) {
            jt.log("changeOrgMemberLevel removing member " + om.instid);
            app.omids[instid] = null;
            app.orgmembers = 
                app.orgmembers.filter((m) => m.instid !== instid); }
        showOrgMembers();
    }


    function modifyMemberLevel (instid, chg) {
        var om = app.omids[instid]; var verified = true;
        if(chg === -1 && instid === app.user.acc.instid &&
           !confirm("Are you sure you want to resign as an Administrator?")) {
            verified = false; }
        if(chg === -1 && om.lev === 0 &&
           !confirm("Completely remove member from organization?")) {
            verified = false; }
        if(verified) {
            app.dlg.omexp(instid);  //hide buttons so no double click.
            jt.out("loginstatdiv", "Updating membership...");
            var data = jt.objdata({orgid:app.user.acc.orgid,
                                   userid:instid, lev:om.lev + chg});
            jt.call("POST", "/updmembership?" + app.auth(), data,
                    function () {  //nothing returned on success
                        jt.out("loginstatdiv", "");
                        changeOrgMemberLevel(om, chg); },
                    function (code, errtxt) {
                        jt.log("modifyMemberLevel " + code + ": " + errtxt);
                        jt.out("loginstatdiv", errtxt); },
                    jt.semaphore("dlg.modifyMemberLevel")); }
    }


    function expandOrganizationMember (instid) {
        var div = jt.byId("om" + instid + "detdiv");
        if(!div) { return; }
        if(div.innerHTML) {  //have content, toggle off
            div.innerHTML = "";
            return; }
        var html = [];
        var user = app.omids[instid];
        if(user.lev < 2) {
            html.push(["button", {type:"button",
                                  onclick:jt.fs("app.dlg.modmem('" + instid + 
                                                "',1)")}, "Promote"]); }
        if(user.lev >= 0) {
            html.push(["button", {type:"button",
                                  onclick:jt.fs("app.dlg.modmem('" + instid + 
                                                "',-1)")}, "Demote"]); }
        div.innerHTML = jt.tac2html(html);
    }


    function addOrgMemberByEmail () {
        var data;
        jt.out("loginstatdiv", "Adding...");
        data = "membermail=" + jt.byId("emailin").value;
        jt.call("POST", "addmember?" + app.auth(), data,
                function (result) {
                    var member = result[0];
                    jt.out("loginstatdiv", "");
                    jt.byId("emailin").value = "";
                    member.name = member.name || member.instid;
                    app.omids[member.instid] = member;
                    app.orgmembers.push(member);
                    showOrgMembers(); },
                function (code, errtxt) {
                    jt.log("addOrgMemberByEmail " + code + ": " + errtxt);
                    jt.out("loginstatdiv", errtxt); },
                jt.semaphore("dlg.addOrgMemberByEmail"));
    }


    function selectOrgTab (seltab) {
        orgtabs.forEach(function (tab) {
            var div = jt.byId("orged" + tab + "div");
            var span = jt.byId("orgtab" + tab + "span");
            if(tab === seltab) {
                span.innerHTML = tab.capitalize();
                div.style.display = "block"; }
            else {
                span.innerHTML = jt.tac2html(
                    ["span", {id:"orgtab" + tab + "span"},
                     ["a", {href:"#" + tab, 
                            onclick:jt.fs("app.dlg.orgtab('" + tab + "')")},
                      tab.capitalize()]]);
                div.style.display = "none"; } });
        if(seltab === "members") {
            jt.byId("updorgbutton").style.display = "none";
            jt.byId("addmemberbutton").style.display = "initial";
            showOrgMembers(); }
        else {
            jt.byId("updorgbutton").style.display = "initial";
            jt.byId("addmemberbutton").style.display = "none"; }
    }


    function orgFieldEditHTML (divid, fields) {
        var html = [];
        fields.forEach(function (fd) {
            var fname = fd.field.capitalize();
            if(fname.endsWith("url")) {
                fname = fname.slice(0, -3); }
            html.push(["div", {cla:"dlgformline"},
                       [["label", {fo:fd.field + "in", cla:"liflab", 
                                   id:"lab" + fd.field + "in"},
                         fname],
                        ["input", {type:"text", cla:"lifin",
                                   name:fd.field + "in", id:fd.field + "in",
                                   placeholder:fd.place || "",
                                   value:app.user.org[fd.field]}]]]); });
        html = ["div", {id:divid}, html];
        return jt.tac2html(html);
    }


    function newMemberPopup (event) {
        var html = [];
        html.push(["div", {id:"dlgxdiv", 
                           onclick:jt.fs("app.dlg.closepop()")}, "X"]);
        html.push(["div", {cla:"edptpoptitle"}, "Add Member"]);
        html.push(["div", {cla:"dlgformline"},
                   [["label", {fo:"emailin", cla:"liflab"}, "Email"],
                    ["input", {type:"text", cla:"lifin",
                               name:"emailin", id:"emailin",
                               placeholder:"name@example.com",
                               value:""}]]]);
        html.push(["div", {cla:"buttonsdiv"},
                   ["button", {type:"button", 
                               onclick:jt.fs("app.dlg.addmem()")}, "Add"]]);
        jt.out("popupdiv", jt.tac2html(html));
        var pos = jt.geoXY(event);
        var left = Math.round(0.01 * tl.width) + tl.margin.left + 20;
        var pdiv = jt.byId("popupdiv");
        pdiv.style.left = left + "px";
        pdiv.style.top = pos.y + "px";
        pdiv.style.visibility = "visible";
    }


    function editOrganization (tab) {
        var html = []; var th = [];
        tab = tab || orgtabs[0];
        orgtabs.forEach(function (tab) {
            th.push(["span", {id:"orgtab" + tab + "span"},
                     ["a", {href:"#" + tab, 
                            onclick:jt.fs("app.dlg.orgtab('" + tab + "')")},
                      tab.capitalize()]]); });
        html.push(["div", {id:"dlgtitlediv"},
                   [["a", {href:"#back", onclick:jt.fs("app.dlg.back()")},
                     ["img", {src:app.dr("img/backward.png"),
                              cla:"dlgbackimg"}]],
                    "Organization",
                    ["div", {id:"dlgorgtabsdiv"}, jt.tac2html(th)]]]);
        html.push(["div", {cla:"dlgsignindiv", id:"dlgcontentdiv"},
                   [orgFieldEditHTML("orgedcontactdiv", [
                       {field:"name"},
                       {field:"code", place:"Initials or short name"},
                       {field:"contacturl", place:"https://yoursite.org"},
                       {field:"projecturl", place:"https://.../projectpage"}]),
                    orgFieldEditHTML("orgedkeywordsdiv", [
                        {field:"groups", place:"African American, Latinx, ..."},
                        {field:"regions", place:"Boston, West Coast, ..."},
                        {field:"categories", place:"Core, Stats, Awards, ..."},
                        {field:"tags", place:"Keyword1, Keyword2, ..."}]),
                    ["div", {id:"orgedmembersdiv"}]]]);
        html.push(["div", {id:"loginstatdiv"}]);
        html.push(["div", {id:"dlgbuttondiv"},
                   [["button", {type:"button", id:"updorgbutton",
                                onclick:jt.fs("app.dlg.updorg()")},
                     "Ok"],
                    ["button", {type:"button", id:"addmemberbutton",
                                onclick:jt.fs("app.dlg.orgmemp(event)")},
                     "Add Member"]]]);
        //container to constrain width of content so the tabs look ok.
        html = ["div", {id:"orgeditcontentdiv"}, html];
        displayDialog(null, jt.tac2html(html));
        dlgstack.push(app.dlg.myacc);
        disableFieldsIfNotOrgAdmin();
        selectOrgTab(tab);
    }


    function updateOrganization () {
        var data = readInputFieldValues([
            {fieldname:"namein", required:true},
            "codein", "contacturlin", "projecturlin", 
            "groupsin", "regionsin", "categoriesin", "tagsin"]);
        if(data) {
            data.orgid = app.user.org.instid;
            jt.out("loginstatdiv", "Updating organization...");
            jt.call("POST", "updorg?" + app.auth(), inputsToParams(data),
                    function (result) {
                        app.db.deserialize("Organization", result[0]);
                        app.user.org = result[0];
                        app.dlg.back(); },
                    function (code, errtxt) {
                        jt.log("updateOrganization " + code + ": " + errtxt);
                        jt.out("loginstatdiv", errtxt); },
                    jt.semaphore("dlg.updateOrganization")); }
    }


    function showOrgLink () {
        if(app.user.org) {
            jt.out("orglinkdiv", jt.tac2html(
                [["label", {fo:"orglinka", cla:"liflab"}, "Org:"],
                 ["a", {href:"#editorg", cla:"lifin", id:"orglinka",
                        onclick:jt.fs("app.dlg.editorg()")},
                  app.user.org.name]]));
            return; }
        app.tabular.fetchorg(showOrgLink);
    }


    function mdfs (mgrfname, ...args) {
        mgrfname = mgrfname.split(".");
        return jt.fs("app.dlg.managerDispatch('" + mgrfname[0] + "','" +
                     mgrfname[1] + "'" + app.paramstr(args) + ")");
    }


    function displayEmailSent (emo) {
        var subj = emo.title + " email didn't arrive";
        var body = "Hi,\n\n" +
            "I clicked \"" + emo.clk + "\" but didn't get a response. " +
            "Could you please look into it and get back to me?\n\n" +
            "Thanks\n\n";
        var mh = "mailto:support@pastkey.org?subject=" + jt.dquotenc(subj) +
            "&body=" + jt.dquotenc(body);
        var html = ["div", {id:"passemdiv"},
                    [["p", "An account " + emo.lkt + " link has been sent to " +
                      emo.em +
                      " and should arrive in a few minutes.  If it doesn't" +
                      " show up, please"],
                     ["ol",
                      [["li", "Make sure your email address is spelled right,"],
                       ["li", "Check your spam folder"]]],
                     ["p", 
                      ["If the email doesn't arrive in a timely fashion,",
                       " contact ",
                       ["a", {href:mh}, "support@pastkey.org"],
                       " so we can look into it."]],
                     ["div", {id: "dlgbuttondiv"},
                      ["button", {type: "button", id: "okbutton",
                                  onclick: jt.fs("app.dlg.back()")},
                       "Ok"]]]];
        displayDialog(null, jt.tac2html(html));
    }


    var accmgr = {
        fiTAC: function (lab, field, intype, val, place) {
            var html = ["div", {cla:"dlgformline"},
                        [["label", {fo:field + "in", cla:"liflab", 
                                    id:"lab" + field + "in"},
                          lab],
                         ["input", {type:intype, cla:"lifin",
                                    name:field + "in", id:field + "in",
                                    placeholder:place, value:val}]]];
            return html; },
        myAccount: function () {
            var html = [
                ["div", {id:"dlgtitlediv"},
                 [["a", {href:"#back", onclick:jt.fs("app.dlg.back()")},
                   ["img", {src:app.dr("img/backward.png"), cla:"dlgbackimg"}]],
                  "Account"]],
                ["div", {cla:"dlgsignindiv"},
                 [["div", {cla:"dlgformline"},
                   ["em",
                    "Private information:"]],
                  accmgr.fiTAC("Email", "updemail", "text", app.user.email, ""),
                  accmgr.fiTAC("Password", "updpassword", "password", "", ""),
                  ["div", {cla:"dlgformline", id:"accstatdiv"}],
                  ["div", {cla:"dlgformline", id:"orglinkdiv"}],
                  ["div", {cla:"dlgformline"},
                   ["em",
                    "Public information:"]],
                  accmgr.fiTAC("Name", "name", "text", app.user.acc.name,
                               "For Honor Roll..."),
                  accmgr.fiTAC("Title", "title", "text", app.user.acc.title,
                               "Optional"),
                  accmgr.fiTAC("Website", "web", "text", app.user.acc.web,
                               "Optional"),
                  ["div", {cla:"dlgformline"},
                   [["input", {type:"checkbox", id:"cbtlnotices",
                               value:"sendtlnotices", 
                               checked:jt.toru(
                                   app.user.acc.settings.tlnotices)}],
                    ["label", {fo:"cbtlnotices", id:"tlnoticeslabel"},
                     "Send me new timelines"]]],
                  ["div", {id:"loginstatdiv"}],
                  ["div", {id:"dlgbuttondiv"},
                   [["button", {type:"button", id:"updaccbutton",
                                onclick:jt.fs("app.dlg.updacc()")},
                     "Ok"]]]]]];
            displayDialog(null, jt.tac2html(html));
            setFocus("namein");
            if(app.user.acc.status !== "Active") {
                accmgr.showAccStatLink(); }
            if(app.db.getOrgId(app.user.acc)) {
                showOrgLink(); } },
        showAccStatLink: function () {
            if(app.user.status !== "Active") {  //"Pending" or admin setting
                jt.out("accstatdiv", jt.tac2html(
                    [["label", {fo:"accstata", cla:"liflab"}, "Status:"],
                     ["a", {href:"#sendcode", cla:"lifin", id:"accstata",
                            title:"Email Account Activation Code",
                            onclick:mdfs("accmgr.sendactcode")},
                      app.user.status]])); } },
        sendactcode: function () {
            jt.out("accstata", "Sending...");
            var data = jt.objdata({returl:window.location.href});
            jt.call("POST", "/api/mailactcode?" + app.auth(), data,
                    function () {
                        jt.out("accstata", "Mail sent");
                        displayEmailSent({
                            em:app.user.email, title:"Account Activation",
                            clk:"Status: Pending", lkt:"activation"}); },
                    function (code, errtxt) {
                        jt.err("Send failed " + code + ": " + errtxt); },
                    jt.semaphore("sendactcode")); }
    };


    function popBack (dfunc) {
        if(dlgstack.length > 0) {
            return (dlgstack.pop())(); }
        if(dfunc) {
            return dfunc(); }
        app.mode.chmode();
    }


    function updateAccount () {
        var data = readInputFieldValues([
            "updemailin", "updpasswordin", "namein", "titlein", "webin"]);
        if(data) {
            var cbntl = jt.byId("cbtlnotices");
            if(cbntl) {
                app.user.acc.settings = app.user.acc.settings || {};
                if(cbntl.checked) {
                    app.user.acc.settings.tlnotices = true; }
                else {
                    app.user.acc.settings.tlnotices = false; }
                data.settings = JSON.stringify(app.user.acc.settings); }
            jt.out("loginstatdiv", "Updating account...");
            jt.byId("updaccbutton").disabled = true;
            if(app.user.acc.email === data.updemailin &&
               data.updpasswordin === "noval") {  //not changing auth info
                delete data.updpasswordin;        //so don't send
                delete data.updemailin; }
            else if(app.user.acc.email !== data.updemailin) {
                //Provide context url for account activation email
                data.returl = jt.enc(window.location.href); }
            jt.call("POST", "/api/updacc?" + app.auth(), inputsToParams(data),
                    function (result) {
                        saveUserInfo(result);
                        app.dlg.close();
                        popBack(app.db.nextInteraction); },
                    function (code, errtxt) {
                        jt.byId("updaccbutton").disabled = false;
                        jt.log("updateAccount " + code + ": " + errtxt);
                        jt.out("loginstatdiv", errtxt); },
                    jt.semaphore("dlg.updateAccount")); }
    }


    //local storage notes: https://github.com/theriex/rh/issues/13
    function processSignIn (cred, contf) {
        var params;
        cred = cred || readInputFieldValues([
            {fieldname:"emailin", required:true},
            {fieldname:"passwordin", required:true}]);
        params = inputsToParams(cred);
        jt.log("processSignIn params: " + params);
        if(cred) {
            jt.call("GET", "/api/acctok?" + params, null,
                    function (result) {
                        jt.log("processSignIn retrieved AppUser");
                        saveUserInfo(result);
                        app.db.initTimelines();  //reset for user
                        if(contf) {
                            return contf(); }
                        app.dlg.close();
                        app.linear.display(); },
                    function (code, errtxt) {
                        jt.log("processSignIn: " + code + " " + errtxt);
                        setTimeout(function () {
                            if(!app.domfield("cbnewacc", "checked")) {
                                if(jt.byId("loginstatdiv")) {
                                    jt.out("loginstatdiv", errtxt); }
                                else {
                                    app.dlg.logout(); } } }, 200); },
                    jt.semaphore("dlg.processSignIn")); }
    }


    function processSignOut () {
        jt.cookie(cookname, "", -1);
        //while it seems a bit wasteful to go back to the server to fetch
        //the timeline again, it's important to nuke all context.
        app.init2();
    }


    //Process and clear all URL parameters saving in cookie or on server.
    function processParameters (contf) {
        var params = jt.parseParams("String");
        params.href = window.location.href;
        params.qidx = params.href.indexOf("?");
        if(params.qidx < 0) { //no parameters to process
            return app.dlg.chkcook(contf); }
        params.plainurl = params.href.slice(0, params.qidx);
        if(params.an && params.at) {
            params.authqs = "an=" + params.an + "&at=" + params.at;
            params.an = jt.dec(params.an);
            setCookie(params.an, params.at); }
        if(params.actcode) {
            params.data = params.data || {};
            params.data.actcode = params.actcode; }
        //Save all parameter state in cookie or server, then clear the
        //params and continue.  With no app history management, removing the
        //query portion of the url will probably result in a reload, but
        //should work either way since all given state was saved.
        if(params.data) {
            jt.out("splashdiv", "Updating your account...");
            params.data = jt.objdata(params.data);
            jt.call("POST", "/api/updacc?" + params.authqs, params.data,
                    function (result) {
                        saveUserInfo(result);
                        window.location.href = params.plainurl;
                        app.dlg.chkcook(contf); },
                    function (code, errtext) {
                        jt.out("splashdiv", "Account update failed " + code +
                               ": " + errtext); }); }
        else { //nothing to save on server.
            window.location.href = params.plainurl;  //probably causes reload
            app.dlg.chkcook(contf); }
    }


    function checkCookieSignIn (contf) {
        var cval = jt.cookie(cookname);
        jt.log("cookie " + cookname + ": " + cval);
        if(!cval) {
            return contf(); }
        cval = cval.split(cookdelim);
        processSignIn({an:jt.dec(cval[0]), at:cval[1]}, contf);
    }


    function resetPassword () {
        var cred = readInputFieldValues([{fieldname:"emailin", required:true}]);
        if(!cred || !jt.isProbablyEmail(cred.emailin)) {
            jt.out("loginstatdiv", "Please fill in your email address...");
            return; }
        cred.returl = jt.enc(window.location.href);
        jt.call("POST", "/api/mailpwr", inputsToParams(cred),
                function () {
                    jt.out("loginstatdiv", "");
                    displayEmailSent({
                        em:cred.emailin, title:"Reset Password",
                        clk:"reset password", lkt:"access"}); },
                function (code, errtxt) {
                    jt.log("mailpwr call failed " + code + " " + errtxt);
                    jt.out("loginstatdiv", "Mail send failed: " + errtxt); },
                jt.semaphore("resetPassword"));
    }


    function showSignInDialog () {
        var html; var hd;
        var cbi = {type:"checkbox", id:"cbnewacc", value:"na",
                   onclick:jt.fs("app.dlg.signin()")};
        var fpd = {id:"resetpassdiv"};
        if(app.domfield("cbnewacc", "checked")) {
            hd = {f:jt.fs("app.dlg.newacc()"), b:"Sign Up"};
            cbi.checked = "checked";
            fpd.style = "visibility:hidden;"; }
        else {
            hd = {f:jt.fs("app.dlg.login()"), b:"Sign In"}; }
        html = [["div", {id:"dlgtitlediv"},
                 [["a", {href:"#back", onclick:jt.fs("app.dlg.back()")},
                   ["img", {src:app.dr("img/backward.png"), cla:"dlgbackimg"}]],
                  "Welcome"]],
                ["div", {cla:"dlgsignindiv"},
                 [["div", {cla:"dlgformline"},
                   [["label", {fo:"emailin", cla:"liflab", id:"labemailin"}, 
                     "Email"],
                    ["input", {type:"email", cla:"lifin", 
                               name:"emailin", id:"emailin", 
                               value:app.domfield("emailin", "value"),
                               placeholder:"nospam@example.com"}]]],
                  ["div", {cla:"dlgformline"},
                   [["label", {fo:"passwordin", cla:"liflab", 
                               id:"labpasswordin"}, 
                     "Password"],
                    ["input", {type:"password", cla:"lifin",
                               name:"passwordin", id:"passwordin",
                               value:app.domfield("passwordin", "value"),
                               onchange:hd.f}]]]]],
                ["div", {id:"loginstatdiv"}],
                ["div", {id:"dlgbuttondiv"},
                 [["div", {cla:"checkboxdiv"},
                   [["input", cbi],
                    ["label", {fo:"cbnewacc", id:"cbnewacclabel"},
                     "New Account"]]],
                  " &nbsp ",
                  ["button", {type:"button", id:"signinbutton",
                              onclick:hd.f},
                   hd.b]]],
                ["div", fpd,
                 ["a", {href:"#resetpassword",
                        onclick:jt.fs("app.dlg.resetpw()")},
                  "reset password"]]];
        displayDialog(null, jt.tac2html(html));
        setFocus("emailin");
    }


    function checkAndShowSignInDialog () {
        var hr = window.location.href;
        if(app.user.email) {
            jt.log("showSignInDialog not displaying since already signed in");
            if(hr.endsWith("?menu=signin")) {
                hr = hr.slice(0, hr.indexOf("?"));
                window.location.href = hr;
                return; } }  //above line redirects, but takes time...
        //normally a popup goes over the dialog, but if there is one visible
        //in this case ten it needs to be hidden so the signin form shows.
        jt.byId("popupdiv").style.visibility = "hidden";
        setTimeout(function () {
            jt.byId("popupdiv").style.visibility = "hidden"; }, 800);
        showSignInDialog();
    }


    function showSignInToSaveDialog () {
        var html;
        sip = {noprompt:true};  //only show dialog once.
        html = [["div", {id:"dlgtitlediv"}, "Save Progress"],
                ["div", {cla:"dlgsignindiv"},
                 ["div", {cla:"dlgformline", style:"text-align:center;"},
                  "To save your progress for this timeline, sign in from the menu."]],
                ["div", {id:"dlgbuttondiv"},
                 ["button", {type:"button", id:"signinokbutton",
                             onclick:jt.fs("app.dlg.contnosave()")},
                 "Ok"]]];
        displayDialog(null, jt.tac2html(html));
        setFocus("signinokbutton");
        dlgstack.push(app.dlg.saveprog);
    }


    function indicateMenu (color) {
        var source;
        color = color || "";
        source = app.dr("img/menuicon" + color + ".png");
        jt.byId("menuiconimg").src = source;
        jt.log("indicateMenu source " + source);
    }


    function continueToNext () {
        var chdet = app.support.chapter();
        if(jt.byId("savestatspan")) {
            jt.out("savestatspan", "Continuing..."); }
        tl.pendingSaves = 0;
        indicateMenu();
        nextColorTheme();
        app.dlg.verifyClosed();  //otherwise can end up overlayed over chapter
        //The cutoff here is for timelines resembling a book.  Shorter
        //timelines can divide into sections using suppviz.
        if(chdet.ttl > 200 && chdet.rem <= 0) {
            return app.support.chapter(app.db.nextInteraction); }
        app.db.nextInteraction();
    }


    function buttons (bs) {
        var html = "";
        bs.forEach(function (bspec) {
            if(html) {
                html += " &nbsp; "; }
            html += jt.tac2html(
                ["button", {type:"button", id:bspec[0],
                            onclick:jt.fs(bspec[2])},
                 bspec[1]]); });
        return html;
    }


    function promptSignIn () {
        var data = jt.objdata(app.db.displayContext().prog);
        jt.call("POST", "noteprog?" + app.db.uidp(), data,
                function () { return true; },
                function (code, errtxt) {
                    jt.log("noteGuestProgress " + code + " " + errtxt); },
                jt.semaphore("dlg.noteGuestProgress"));
        if(sip.noprompt) {
            setTimeout(continueToNext, 500);
            return; }
        showSignInToSaveDialog();
    }


    function saveProgress () {
        var savestat = "Saving your progress...";
        if(!app.user.email) {  //not signed in
            indicateMenu("Yellow");
            return promptSignIn(); }
        indicateMenu("Green");
        var html = [["div", {id:"dlgtitlediv"}, "Save Progress"],
                    ["div", {cla:"dlgsignindiv"},
                     ["div", {cla:"dlgformline"},
                      ["span", {id:"savestatspan"}, savestat]]],
                    ["div", {id:"dlgbuttondiv"},
                     buttons([["skipbutton", "Skip", "app.dlg.contnosave()"],
                              ["contbutton", "Continue", "app.dlg.signin()"]])
                    ]];
        displayDialog(null, jt.tac2html(html));
        jt.byId("contbutton").disabled = true;
        app.db.mergeProgToAccount();  //normalize current prog with db state
        var data = app.db.postdata("AppUser", app.user.acc, ["email"]);
        jt.call("POST", "/api/updacc?" + app.auth(), data,
                function (result) {
                    saveUserInfo(result);
                    jt.byId("contbutton").disabled = false;
                    jt.log("progress saved");
                    if(jt.byId("savestatspan") &&
                       jt.byId("savestatspan").innerHTML === savestat) {
                        continueToNext(); } },
                function (code, errtxt) {
                    jt.out("savstatspan", "Save failed " + code + " " + errtxt);
                    jt.out("dlgbuttondiv", buttons([
                        ["skipbutton", "Skip", "app.dlg.contnosave()"],
                        ["retrybutton", "Retry", "app.dlg.saveprog()"]]));
                    styleDialog(); },  //match color for buttons
                jt.semaphore("dlg.saveProgress"));
    }


    function toggleFieldDesc (divid, descf) {
        var div = jt.byId(divid);
        if(!div) {
            jt.log("toggleFieldDesc " + divid + " div not found");
            return; }
        if(div.innerHTML) {
            div.innerHTML = ""; }
        else {
            div.innerHTML = descf(); }
    }


    function buildEditPointFields () {
        var qtos = []; 
        var efs = [
            {field:"date", layout:"main", type:"text",
             descf:"app.db.describeDateFormat", place:"YYYY-MM-DD",
             reqd:"Please enter a valid date value."},
            {field:"text", layout:"main", type:"bigtext",
             place:"Point Description Text",
             reqd:"Please provide some descriptive text."},
            {field:"refs", pname:"References", layout:"ref", type:"txtlst",
             place:"reference citation and/or URL"},
            {field:"pic", layout:"pic", type:"image"}];
        Object.keys(app.qts).forEach(function (key) {
            qtos.push({value:key, text:app.qts[key]}); });
        efs.push({field:"qtype", layout:"detail", type:"select", options:qtos});
        app.keyflds.forEach(function (fld) {
            var opts = [];
            if(app.user.org[fld]) {
                app.user.org[fld].csvarray().forEach(function (key) {
                    opts.push(key); }); }
            efs.push({field:fld, layout:"detail", type:"cbsel", 
                      options:opts}); });
        efs.push({field:"source", layout:"detail", type:"text", 
                  place:"unique id for point"});
        edptflds = efs;
    }


    function textInputTAC (fs, mode, vo) {
        if(mode === "list") {
            return ["div", {cla:"edptvaldiv"}, vo[fs.field]]; }
        var inid = fs.field + "in";
        var label = fs.label || fs.field.capitalize();
        if(fs.descf) {
            label = ["a", {href:"#describe_" + label,
                           onclick:jt.fs("app.dlg.togfdesc('" +
                                         "fhdiv" + fs.field + "'," +
                                         fs.descf + ")")},
                     [label + "&nbsp;",
                      ["img", {src:app.dr("img/info.png")}],
                      "&nbsp;"]]; }
        var html = ["div", {cla:"dlgformline"},
                    [["div", {cla:"fieldhelpdiv", id:"fhdiv" + fs.field}],
                     ["label", {fo:inid, cla:"liflab", 
                                id:"lab" + inid}, label],
                     ["input", {type:fs.type, cla:"lifin", name:fs.field, 
                                id:inid, value:(vo && vo[fs.field]) || "",
                                placeholder:fs.place || ""}]]];
        return html;
    }


    function largeTextInputTAC (fs, mode, vo) {
        var html;
        if(mode === "list") {
            return ["div", {cla:"edptvaldiv"}, vo[fs.field]]; }
        html = ["div", {cla:"dlgformline"},
                ["div", {cla:"textareacontainerdiv"},
                 ["textarea", {id:fs.field + "ta",
                               name:fs.field,
                               cols:fs.cols || 40,
                               style:"width:95%;",  //override cols value
                               rows:fs.rows || 8,
                               maxlength:1200,
                               placeholder:fs.place || ""},
                  ((vo && vo[fs.field]) || "")]]];
        return html;
    }


    function readTextListInputFields (field) {
        var i; var count; var inel; var val; var txts = [];
        for(i = 0; i < 50; i += 1) {
            count = i + 1;
            inel = jt.byId(field + count + "in");
            if(!inel) {  //no more text inputs found
                break; }
            val = inel.value.trim();
            if(val) {
                val = jt.ndq(val); //html escape embedded double quotes
                txts.push(val); } }
        editpt[field] = txts;
    }


    function formValuesToObject (fields) {
        var obj = {};
        fields.forEach(function (fspec) {
            switch(fspec.type) {
            case "text": 
                obj[fspec.field] = jt.byId(fspec.field + "in").value;
                break;
            case "bigtext": 
                obj[fspec.field] = jt.byId(fspec.field + "ta").value;
                break;
            case "select":
                obj[fspec.field] = editpt[fspec.field];
                break;
            case "cbsel":
                obj[fspec.field] = editpt[fspec.field];
                break;
            case "txtlst":
                readTextListInputFields(fspec.field);
                obj[fspec.field] = editpt[fspec.field];
                break;
            default: jt.err("formValuesToObject unknown fspec " + fspec); } });
        return obj;
    }


    function selectInputTAC (fs, mode, vo) {
        var html = [];
        if(mode === "list") {
            var val = vo[fs.field] || "";
            fs.options.forEach(function (opt) {
                if(val === opt.value) {
                    val = opt.text; } });
            return ["div", {cla:"edptvaldiv"}, val]; }
        var inid = fs.field + "sel";
        fs.options.forEach(function (opt, idx) {
            var oao = {value:opt.value, id:fs.field + "opt" + idx};
            if(vo && vo[fs.field] === opt.value) {
                oao.selected = "selected"; }
            html.push(["option", oao, opt.text]); });
        html = [["div", {cla:"dlgformline"},
                 [["label", {fo:inid, cla:"liflab", id:"lab" + inid},
                   fs.label || fs.field.capitalize()],
                  ["select", {id:inid, onchange:jt.fs("app.dlg.selchg('" + 
                                                      fs.field + "')")},
                   html]]],
                ["input", {type:"hidden", id:fs.field + "hin", name:fs.field,
                           value:vo[fs.field]}]];  //form submit value
        return html;
    }


    function checkboxInputTAC (fs, mode, vo) {
        var html;
        vo[fs.field] = vo[fs.field] || "";  //verify initialized
        var val = vo[fs.field].csvarray().join(", ");
        if(mode === "list") {
            return ["div", {cla:"edptvaldiv"}, val]; }
        html = [["div", {cla:"dlgformline"},
                 ["a", {href:"#" + fs.field,
                        onclick:jt.fs("app.dlg.cbpop(event,'" + 
                                      fs.field + "')")},
                  [["span", {cla:"edptfldspan"}, fs.field.capitalize()],
                   ["span", {cla:"edptvalspan", id:fs.field + "valspan"}, 
                    val]]]],
                ["input", {type:"hidden", id:fs.field + "hin", name:fs.field,
                           value:vo[fs.field]}]];  //form submit value
        return html;
    }


    function checkboxPopup (event, field) {
        var html = [];
        html.push(["div", {id:"dlgxdiv", 
                           onclick:jt.fs("app.dlg.closepop()")}, "X"]);
        html.push(["div", {cla:"edptpoptitle"}, field]);
        app.user.org[field] = app.user.org[field] || "";  //verify initialized
        app.user.org[field].csvarray().forEach(function (key, idx) {
            var checked = editpt[field].csvcontains(key.trim());
            html.push(["div", {cla:"keywordcheckboxdiv"},
                       [["input", {type:"checkbox", id:field + idx,
                                   value:key, checked:jt.toru(checked)}],
                        ["label", {fo:field + idx, id:field + idx + "lab"},
                         key]]]); });
        if(app.user.org[field]) {
            html.push(["div", {cla:"buttonsdiv"},
                       ["button", {type:"button", 
                                   onclick:jt.fs("app.dlg.cbproc('" + field + 
                                                 "')")}, "Ok"]]); }
        else { 
            html.push(app.user.org.name + " has no " + field + " set up." +
                      " Edit the organization to define possible values."); }
        jt.out("popupdiv", jt.tac2html(html));
        var pos = jt.geoXY(event);
        var left = Math.round(0.01 * tl.width) + tl.margin.left + 20;
        var pdiv = jt.byId("popupdiv");
        pdiv.style.left = left + "px";
        pdiv.style.top = pos.y + "px";
        pdiv.style.visibility = "visible";
    }


    function updatePointKeywords (field) {
        var valcsv = ""; 
        var fin = jt.byId(field + "hin");
        app.user.org[field].csvarray().forEach(function (key, idx) {
            var cb = jt.byId(field + idx);
            if(cb && cb.checked) {
                valcsv = valcsv.csvappend(key); } });
        editpt[field] = valcsv;
        if(fin) {  //reflect value in input form field for submit processing
            fin.value = valcsv; }
        app.dlg.closepop();
        jt.out(field + "valspan", valcsv.csvarray().join(", "));
    }


    function updateSelectedValue (field) {
        var sel = jt.byId(field + "sel");
        var fin = jt.byId(field + "hin");
        editpt[field] = sel.options[sel.selectedIndex].value;
        if(fin) {  //reflect value in input form field for submit processing
            fin.value = editpt[field]; }
    }


    function reflectDeletePicCheckbox () {
        var cb = jt.byId("piccbdel");
        var img = jt.byId("editpicimg");
        if(cb.checked) {
            img.style.visibility = "hidden"; }
        else {
            img.style.visibility = "visible"; }
    }

    function imageInputTAC (fs, mode, vo) {
        var imgsrc = (vo && vo[fs.field]) || "";
        var dph = "";
        if(imgsrc) {
            imgsrc = app.ptimgsrc(vo);
            dph = ["div", {id:"picdelcbdiv"},
                   [["input", {type:"checkbox", id:fs.field + "cbdel",
                               name:"picdelcb", value:"picdelcb",
                               onclick:jt.fsd("app.dlg.cbdelpic()")}],
                    ["label", {fo:fs.field + "cbdel", id:"picdellabel"},
                     "Delete pic"]]]; }
        else {
            imgsrc = app.dr("/img/picplaceholder.png"); }
        if(mode === "list") {
            return ["div", {cla:"edptvaldiv"}, 
                    ["img", {src:imgsrc, cla:"txtpicimg"}]]; }
        var html = ["div", {cla:"dlgformline", style:"text-align:center;"},
                    ["table", {style:"margin:auto;"},
                     ["tr",
                      [["td",
                        [["div", {id:"picinputdiv"},
                          ["input", {type:"file", id:fs.field + "in", 
                                     name:fs.field}]],
                         dph]],
                       ["td",
                        ["img", {src:imgsrc, cla:"txtpicimg", 
                                 id:"editpicimg"}]]]]]];
        return html;
    }


    function textListEditContentTAC (fs, txts) {
        var html = []; 
        var fname = fs.pname || fs.field.capitalize();
        html.push(["div", {cla:"dlgformline"},
                   [fname,
                    ["button", {type:"button", id:"addbutton",
                                onclick:jt.fs("app.dlg.addtxt('" + fs.field + 
                                              "')")}, "+"]]]);
        //filtering of empty elements is done by readTextListInputFields
        if(!txts.length) {  //provide an empty line to start with
            txts.push(""); }
        txts.forEach(function (txt, idx) {
            var count = idx + 1;
            html.push(["div", {cla:"dlgformline"},
                       [["label", {fo:fs.field + count + "in", cla:"reflab"}, 
                         String(count) + "."],
                        ["input", {type:"text", cla:"refin",
                                   name:fs.field + count + "in",
                                   id:fs.field + count + "in",
                                   value:txt || "",
                                   placeholder:fs.place || ""}]]]); });
        return html;
    }


    function textListInputTAC (fs, mode, pt) {
        var html;
        var txts = pt[fs.field] || [];
        if(mode === "list") {
            html = refsListHTML(txts); }
        else {  //edit
            html = ["div", {cla:"txtlstdiv", id:fs.field + "indiv"}, 
                    textListEditContentTAC(fs, txts)]; }
        return html;
    }


    function addTextListElement (field) {
        //some folks might want to make several blanks and then fill, but
        //delete is accomplished by automatically filtering out empty inputs
        //and can't have it both ways.  Auto delete filtering is simpler.
        var fs;
        readTextListInputFields(field);  //updates editpt[field] contents
        editpt[field].push("");
        //find the field spec for rendering
        edptflds.forEach(function (epf) {
            if(epf.field === field) {
                fs = epf; } });
        //rewrite the editing content
        jt.out(field + "indiv", jt.tac2html(
            textListEditContentTAC(fs, editpt[field])));
        jt.byId(field + editpt[field].length + "in").focus();
    }


    function fieldTAC (fspec, mode, pt) {
        switch(fspec.type) {
        case "text": return textInputTAC(fspec, mode, pt);
        case "bigtext": return largeTextInputTAC(fspec, mode, pt);
        case "select": return selectInputTAC(fspec, mode, pt);
        case "cbsel": return checkboxInputTAC(fspec, mode, pt);
        case "image": return imageInputTAC(fspec, mode, pt);
        case "txtlst": return textListInputTAC(fspec, mode, pt);
        default: jt.log("fieldTAC unknown fspec " + fspec.type); }
        return "";
    }


    function inputFieldsTAC (fields, section, pt, mode) {
        var html = [];
        mode = mode || "edit";
        fields.forEach(function (fspec) {
            if(fspec.layout === section) {
                html.push(fieldTAC(fspec, mode, pt)); } });
        return html;
    }


    function editPointButtonsHTML (pt) {
        var html = [];
        html.push(["button", {type:"button", id:"cancelbutton",
                               onclick:jt.fs("app.dlg.close()")}, 
                    "Cancel"]);
        html.push(" &nbsp; ");
        if(pt.instid) {
            html.push(["button", {type:"button", id:"deletebutton",
                                  onclick:jt.fs("app.dlg.ptdelclick()")},
                       "Delete"]);
            html.push(" &nbsp; "); }
        html.push(["button", {type:"submit", id:"savebutton",
                              onclick:jt.fs("app.dlg.ptsubclick()")},
                   "Save"]);
        return ["div", {id:"dlgbuttondiv"}, html];
    }


    function editLoadedPoint (pt) {
        var html;
        if(pt.instid) {  //restore original edit link text in case altered
            jt.out("editlink" + pt.instid, "[edit]"); }
        editpt = pt;  //for form check access
        buildEditPointFields(pt);
        html = [
            ["div", {id:"dlgdatediv"}, "Edit Point"],
            ["div", {id:"dlgcontentdiv"},
             ["form", {action:"/api/updpt", method:"post", id:"editpointform", 
                       target: "subframe", enctype: "multipart/form-data"},
              [["input", {type:"hidden", name:"email", value:app.user.email}],
               ["input", {type:"hidden", name:"authtok", value:app.user.tok}],
               ["input", {type:"hidden", name:"ptid", value:pt.instid || ""}],
               ["input", {type:"hidden", name:"stats", id:"statshin",
                          value:JSON.stringify(pt.stats || {})}],
               ["input", {type:"hidden", name:"refs", id:"refshin",
                          value:JSON.stringify(pt.refs || [])}],
               inputFieldsTAC(edptflds, "main", pt),
               ["div", {id:"edptablediv"},
                ["table", {style:"margin:auto;"},
                 [["tr",
                   [["th", ["a", {href:"#details", 
                                  onclick:jt.fs("app.dlg.togptdet('detail')")},
                            "details"]],
                    ["th", ["a", {href:"#refs",
                                  onclick:jt.fs("app.dlg.togptdet('ref')")},
                            "refs"]],
                    ["th", ["a", {href:"#pic", 
                                  onclick:jt.fs("app.dlg.togptdet('pic')")},
                            "pic"]]]],
                  ["tr", {id:"epdetsumtr"},
                   [["td", {colspan:2}, 
                     inputFieldsTAC(edptflds, "detail", pt, "list")],
                    ["td", inputFieldsTAC(edptflds, "pic", pt, "list")]]],
                  ["tr", {id:"eprefsumtr"},
                   ["td", {colspan:3}, 
                    inputFieldsTAC(edptflds, "ref", pt, "list")]]]]],
               ["div", {id:"epdetindiv" + "detail", style:"display:none;"},
                inputFieldsTAC(edptflds, "detail", pt, "edit")],
               ["div", {id:"epdetindiv" + "ref", style:"display:none;"},
                inputFieldsTAC(edptflds, "ref", pt, "edit")],
               ["div", {id:"epdetindiv" + "pic", style:"display:none;"},
                inputFieldsTAC(edptflds, "pic", pt, "edit")],
               ["div", {id:"updatestatdiv"}],
               ["iframe", {id:"subframe", name:"subframe",
                           src:"/api/updpt", style:"display:none"}]]]],
            editPointButtonsHTML(pt)];
        displayDialog(null, jt.tac2html(html));
    }


    function togglePointDetailSection (sect, forceDisplay) {
        var sects = ["detail", "ref", "pic"];
        sects.forEach(function (s) {
            var div = jt.byId("epdetindiv" + s);
            if(s === sect) {
                if(div.style.display === "none" || forceDisplay) {
                    div.style.display = "block";
                    jt.byId("eprefsumtr").style.display = "none";
                    jt.byId("epdetsumtr").style.display = "none"; }
                else {  //toggle off if clicked again when displayed
                    div.style.display = "none";
                    jt.byId("eprefsumtr").style.display = "table-row";
                    jt.byId("epdetsumtr").style.display = "table-row"; } }
            else {  //other section
                div.style.display = "none"; } });
    }


    function pointChanged (pt, dbpt) {
        //True if the points differ in some noticeable way.  Only compare
        //fields included in the tl.preb instance data or anything fetched
        //will always be different.
        var ptflds = ["date", "text", "refs", "qtype", "groups", "regions",
                      "categories", "tags", "orgid", "source"];
        return !ptflds.every(function (fld) { return pt[fld] === dbpt[fld]; });
    }


    function noteUpdatedPoint (pt) {
        var datechg = app.db.mergeUpdPtData(pt);
        app.dbpts[pt.instid] = pt;
        app.tabular.redispt(pt, datechg);
    }


    function fetchPointFromServer (ptid, contf) {
        jt.out("editlink" + ptid, "fetching point data...");
        app.dbpts = app.dbpts || {};
        var url = "/api/fetchobj?" + app.auth() + "&dt=Point&di=" + ptid +
            jt.ts("&cb=", "second");
        jt.call("GET", url, null,
                function (points) {
                    app.db.deserialize("Point", points[0]);
                    app.dbpts[ptid] = points[0];
                    contf(points[0]); },
                function (code, errtxt) {
                    jt.log("fetch point failed " + code + ": " + errtxt);
                    jt.out("editlink" + ptid, errtxt); },
                jt.semaphore("dlg.fetchPoint"));
    }


    function editPoint (pt) {
        var locp;
        if(!app.user.org) {
            return app.tabular.fetchorg(function () {
                editPoint(pt); }); }
        if(pt === "create") {
            pt = {};
            return editLoadedPoint(pt); }
        if(typeof pt === "string") {
            if(app.dbpts && app.dbpts[pt]) {
                pt = app.dbpts[pt]; }
            else {
                return fetchPointFromServer(pt, editPoint); } }
        locp = app.db.pt4id(pt.instid);
        if(pointChanged(locp, pt)) {
            noteUpdatedPoint(pt);
            jt.out("editlink" + pt.instid, "[edit updated point]"); }
        editLoadedPoint(pt);
    }


    function monitorPointUpdateSubmit () {
        var okpre = "ptid: "; var errpre = "failed: ";
        var seconds = Math.round(upldmon.count / 2);
        if(upldmon.count > 2) {
            jt.out("updatestatdiv", "Waiting for server response " + seconds); }
        var subfrm = jt.byId("subframe");
        if(subfrm) {
            var fc = subfrm.contentDocument || subfrm.contentWindow.document;
            if(fc && fc.body) {  //body unavailable if error write in progress
                var txt = fc.body.innerHTML;
                if(txt.indexOf(okpre) === 0) {  //successful update
                    jt.out("savebutton", "Saved.");
                    var ptid = txt.slice(okpre.length);
                    app.dlg.close();
                    fetchPointFromServer(ptid, noteUpdatedPoint);
                    return; }
                if(txt.indexOf(errpre) >= 0) {
                    txt = txt.slice(txt.indexOf(errpre) + errpre.length);
                    jt.out("updatestatdiv", txt);  //display error
                    fc.body.innerHTML = "Reset.";  //reset status iframe
                    jt.byId("savebutton").disabled = false;
                    jt.out("savebutton", "Save");
                    return; }
                upldmon.count += 1; } }
        setTimeout(monitorPointUpdateSubmit, 500);
    }


    function makePointFormSubmitObject () {
        var subobj = formValuesToObject(edptflds);
        subobj.stats = editpt.stats || {};
        subobj.stats = JSON.stringify(subobj.stats);
        subobj.refs = subobj.refs || [];
        subobj.refs = JSON.stringify(subobj.refs);
        return subobj;
    }


    function disablePointEditButtons () {
        //prevent multiple form submissions, or canceling while waiting for
        //the server to come back.
        var delb = jt.byId("deletebutton");
        jt.byId("cancelbutton").disabled = true;  //avoid inconsistent state
        jt.byId("savebutton").disabled = true;    //prevent multiple submits
        if(delb) {
            delb.disabled = true; }               //prevent multiple submits
    }


    function confirmAbsentPicIntentional () {
        var picin = jt.byId("picin");
        var delcb = jt.byId("piccbdel");
        var nopictxt = "Uploading a public domain picture for your point will give it more impact and help people remember it. Are you sure you want to save without a pic?";
        var delpictxt = "Deleting the picture for this point will leave it without any image to help remember it. Are you sure you want to save without a pic?";
        if(picin && !picin.value && editpt && !editpt.instid && !editpt.pic && 
           !confirm(nopictxt)) {
            app.dlg.togptdet("pic", true);
            return false; }
        if(editpt && editpt.pic && delcb && delcb.checked &&
           !confirm(delpictxt)) {
            app.dlg.togptdet("pic", true);
            return false; }
        return true;
    }


    function ptsubclick () {
        var subobj = makePointFormSubmitObject();
        jt.out("updatestatdiv", "");
        var i; var fs;
        for(i = 0; i < edptflds.length; i += 1) {
            fs = edptflds[i];
            if(fs.reqd && !subobj[fs.field]) {
                jt.out("updatestatdiv", fs.reqd);
                if(fs.layout === "detail") {
                    app.dlg.togptdet("detail", true); }
                return;  } }
        if(!confirmAbsentPicIntentional()) {
            return; }
        jt.byId("refshin").value = subobj.refs;
        disablePointEditButtons();
        jt.out("savebutton", "Saving...");
        upldmon = {count:0};
        setTimeout(monitorPointUpdateSubmit, 100);
        jt.byId("editpointform").submit();
    }


    function ptdelclick () {
        var vertext = "Timelines with this point will still have the data available until they are next edited.  Are you sure you want to delete this point?";
        if(!confirm(vertext)) {
            return; }
        var subobj = makePointFormSubmitObject();
        subobj.stats = JSON.parse(subobj.stats);
        subobj.stats.status = "deleted";
        subobj.stats = JSON.stringify(subobj.stats);
        jt.byId("statshin").value = subobj.stats;
        disablePointEditButtons();
        jt.out("deletebutton", "Deleting...");
        upldmon = {count:0};
        setTimeout(monitorPointUpdateSubmit, 100);
        jt.byId("editpointform").submit();
    }


    function closeDialog (mode) {
        jt.byId("popupdiv").style.visibility = "hidden";
        d3.select("#itemdispdiv")
            .style("visibility", "hidden");
        if(mode) {  //e.g. "reference"
            app.mode.chmode(mode); }
    }


    function verifyClosed () {
        closeDialog();
        //Because displayDialog renders with a timeout, it is possible to
        //end up with a dialog being left open if other processing takes
        //over quickly, even if that processing called dlg.close.  This is a
        //second failsafe call to make sure the dialog is hidden in that case.
        setTimeout(closeDialog, 1200);
    }


    function searchForPoint () {
        var qstr = tl.dlgdat.text.split(" ").slice(0, 10).join("+");
        var url = "https://duckduckgo.com/?q=" + qstr;
        window.open(url);
    }


    function getOrSetGenerationData (gen) {
        if(gen) {
            gendat = gen; }
        return gendat;
    }


    return {
        init: function (timeline) { tl = timeline; },
        start: function (t, s, f, c) { showStartDialog(t, s, f, c); },
        info: function (d, inter) { showInfoDialog(d, inter); },
        show: function (html) { displayDialog(null, html); },
        close: function (mode) { closeDialog(mode); },
        verifyClosed: function () { verifyClosed(); },
        button: function (answer) { buttonPress(answer); },
        guessyear: function (year) { yearGuessButtonPress(year); },
        nextColorTheme: function () { nextColorTheme(); },
        signin: function () { checkAndShowSignInDialog(); },
        genentry: function () { showGenerationEntryForm(); },
        cascgen: function (id) { cascadeGenerationInfo(id); },
        closegenentry: function () { closeGenerationEntry(); },
        okgenentry: function () { saveGenerationInfo(); },
        newacc: function () { createAccount(); },
        myacc: function () { accmgr.myAccount(); },
        updacc: function () { updateAccount(); },
        back: function () { closeDialog(); popBack(); },
        login: function () { processSignIn(); },
        logout: function () { processSignOut(); },
        procparams: function (cf) { processParameters(cf); },
        chkcook: function (cf) { checkCookieSignIn(cf); },
        resetpw: function () { resetPassword(); },
        saveprog: function () { saveProgress(); },
        contnosave: function () { continueToNext(); },
        ptedit: function (ptid) { editPoint(ptid); },
        ptsubclick: function () { ptsubclick(); },
        ptdelclick: function () { ptdelclick(); },
        togfdesc: function (field, desc) { toggleFieldDesc(field, desc); },
        cbpop: function (event, field) { checkboxPopup(event, field); },
        cbproc: function (field) { updatePointKeywords(field); },
        selchg: function (field) { updateSelectedValue(field); },
        editorg: function (mode) { editOrganization(mode); },
        orgtab: function (tab) { selectOrgTab(tab); },
        updorg: function () { updateOrganization(); },
        omexp: function (instid) { expandOrganizationMember(instid); },
        modmem: function (instid, chg) { modifyMemberLevel(instid, chg); },
        orgmemp: function (event) { newMemberPopup(event); },
        addmem: function () { addOrgMemberByEmail(); },
        togptdet: function (sect, req) { togglePointDetailSection(sect, req); },
        addtxt: function (field) { addTextListElement(field); },
        search: function () { searchForPoint(); },
        refsListHTML: function (refs) { return refsListHTML(refs); },
        gendat: function (gen) { return getOrSetGenerationData(gen); },
        closepop: function () { closePopup(); },
        cbdelpic: function () { reflectDeletePicCheckbox(); },
        managerDispatch: function (mgrname, fname, ...args) {
            switch(mgrname) {
            case "accmgr": return accmgr[fname].apply(app.dlg, args);
            default: jt.log("dlg.managerDispatch unknown mgr: " + mgrname); } }
        }; //end returned published functions
}());