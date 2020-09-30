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
    var cookname = "userauth";
    var cookdelim = "..pastkey..";
    var lnfidx = 0;
    var tl = null;
    var editpt = null;
    var dlgstack = [];
    var sip = {};  //sign-in prompting
    var popdim = null;


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
            jt.log("displayDialog " + d.dsId + " " +
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
            if(tl.pts[pti].dsId === pt.dsId) {
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


    function pointKeywordsHTML (pt) {
        if(pt.groups && !pt.communities) {  //legacy keyfield name support
            pt.communities = pt.groups; }
        var keys = [];
        app.keyflds.forEach(function (field) {
            if(pt[field]) {
                pt[field].csvarray().forEach(function (key) {
                    keys.push(key); }); } });
        return jt.tac2html(
            [["span", {cla:"buttonptcodeslabelspan"}, "Keys: "],
             keys.join(", ")]);
    }


    function prevButtonTAC (d) {
        var html = "";
        var tlpts = app.linear.tldata().pts;
        var idx = 0;
        while(idx < tlpts.length && tlpts[idx].dsId !== d.dsId) {
            idx += 1; }
        if(idx > 0 && idx < tlpts.length) {  //found it, and not first point
            html = ["div", {id:"prevlinkdiv"},
                    ["a", {href:"#previous",
                           onclick:jt.fs("app.linear.byPtId('" + 
                                         tlpts[idx - 1].dsId + "','" +
                                         d.dsId + "')")},
                     "&#8678;"]]; }  //Leftwards White Arrow U+21E6
        return html;
    }


    function forwardButtonTAC (d) {
        var html = "";
        var currpt = app.mode.currpt();
        var tlpts = app.linear.tldata().pts;
        var idx = tlpts.length - 1;
        while(idx > 0 && tlpts[idx].dsId !== d.dsId) {
            idx -= 1; }
        if(idx < tlpts.length - 1 && 
           (!currpt || currpt.dsId !== tlpts[idx + 1].dsId)) {
            html = ["div", {id:"forwardlinkdiv"},
                    ["a", {href:"#next",
                           onclick:jt.fs("app.linear.byPtId('" +
                                         tlpts[idx + 1].dsId + "','" +
                                         d.dsId + "')")},
                     "&#8680;"]]; }  //Rightwards White Arrow U+21E8
        return html;
    }


    function infoButtons (d, inter) {
        var ret = {tac:[], focid:"", date:""};
        if(!inter) {
            ret.tac = [prevButtonTAC(d),
                       forwardButtonTAC(d),
                       ["div", {cla:"buttonptcodesdiv"}, pointKeywordsHTML(d)],
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
                       ["div", {cla:"buttonptcodesdiv"}, pointKeywordsHTML(d)],
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


    function saveAccountSettings () {
        var data = jt.objdata({settings:JSON.stringify(app.user.acc.settings)});
        jt.call("POST", "/api/updacc?" + app.auth(), data,
                function (result) {
                    saveUserInfo(result);
                    jt.log("saveAccountSettings ok"); },
                function (code, errtxt) {
                    jt.log("saveAccountSettings " + code + ": " + errtxt); },
                jt.semaphore("dlg.saveAccountSettings"));
    }


    function saveGenerationInfo () {
        gendat.gens.forEach(function (gen) {
            var input = jt.byId(gen.id + "in");
            if(input) {
                gen.year = Number(input.value); } });
        gendat.accepted = true;
        closeGenerationEntry();
        if(app.user && app.user.acc) {
            app.user.acc.settings = app.user.acc.settings || {};
            app.user.acc.settings.gendat = gendat;
            saveAccountSettings(); }
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
        if(!refs) { return ""; }
        //Should be deserialized already, but fix if not
        if(!Array.isArray(refs)) {
            refs = JSON.parse(refs); }
        if(!Array.isArray(refs)) { return ""; }
        if(!refs.length) { return ""; }
        return jt.tac2html(
            ["ol", {cla:"refslist"},
             refs.map(function (txt) {
                 return ["li", jt.linkify(txt)]; })]);
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
                                            "refslistdiv" + d.dsId + "')")},
                            ["span", {cla:"refslinkspan"}, "refs"]],
                           ["div", {id:"refslistdiv" + d.dsId,
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
                   app.db.ptt2html(d, tl.pts, "app.linear.byPtId"),
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
        var ptid = pt.dsId;
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


    function popBack (dfunc) {
        if(dlgstack.length > 0) {
            return (dlgstack.pop())(); }
        if(dfunc) {
            return dfunc(); }
        app.mode.chmode();
    }


    //General container for all managers.
    var mgrs = {};


    mgrs.kw = (function () {
        //Using the singular keyword names here keeps the tabular point
        //keyword managers separate from the user keyword managers.
        var kgs = {community:null, region:null, category:null, tag:null};
        var kwsrc = {  //no autocomplete suggestions
            getKeywords: function () { return ""; },
            updateKeywords: function () { return ""; }};
    return {
        init: function () {
            Object.keys(kgs).forEach(function (key) {
                var plh = ((key === "ukeytags")? "keyword" : "");
                kgs[key] = app.tabular.makeCSVManager(key, plh, kwsrc); }); },
        keywordsObjectId: function () {
            return "UserKeywords" + app.user.acc.dsId; },
        getKeywordsHTML: function () {
            if(!app.user.acc.built.length) { //don't complicate the interface
                return ""; }                 //until they have built a timeline
            var us = app.user.acc.settings || {};
            us.keywords = us.keywords || {};
            if(!Object.values(us.keywords).length) { //nothing to edit until
                return ""; }                         //keywords created
            us.keywords.dsId = mgrs.kw.keywordsObjectId();
            mgrs.kw.init();
            return jt.tac2html(
                ["div", {id:"ukeydefsdiv"},
                 [["span", {id:"ukeydefstitlediv"},
                   "Point edit keyword options:"],
                  Object.values(kgs).map(function (mgr) {
                      return mgr.getEditHTML(us.keywords); })]]); },
        getKeywordsSetting: function (settings) {
            settings.keywords = settings.keywords || {};
            var kobjid = mgrs.kw.keywordsObjectId();
            Object.entries(kgs).forEach(function ([fld, mgr]) {
                if(mgr) {
                    settings.keywords[fld] = mgr.getUIKeywords(kobjid); } }); }
        };
    }());


    mgrs.acc = {
        fi: function (lab, field, intype, val, place) {
            place = place || "";
            return jt.tac2html(
                ["div", {cla:"dlgformline"},
                 [["label", {fo:field + "in", cla:"liflab",
                             id:"lab" + field + "in"},
                   lab],
                  ["input", {type:intype, cla:"lifin",
                             name:field + "in", id:field + "in",
                             placeholder:place, value:val}]]]); },
        myAccount: function () {
            var html = [
                ["div", {id:"dlgtitlediv"},
                 [["a", {href:"#back", onclick:jt.fs("app.dlg.back()")},
                   ["img", {src:app.dr("img/backward.png"), cla:"dlgbackimg"}]],
                  "Account"]],
                ["div", {cla:"dlgsignindiv"},
                 [["div", {cla:"dlgsicontdiv"},
                   [["div", {cla:"dlgformline"},
                     ["em", "Private information:"]],
                    mgrs.acc.fi("Email", "updemail", "email", app.user.email),
                    mgrs.acc.fi("Password", "updpassword", "password", ""),
                    ["div", {cla:"dlgformline", id:"accstatdiv"}],
                    ["div", {cla:"dlgformline"},
                     ["em", "Public information:"]],
                    mgrs.acc.fi("Name", "name", "text", app.user.acc.name,
                                "For Honor Roll..."),
                    mgrs.acc.fi("Title", "title", "text", app.user.acc.title,
                                "Optional"),
                    mgrs.acc.fi("Website", "web", "text", app.user.acc.web,
                                "Optional"),
                    mgrs.acc.noticesCheckbox(),
                    mgrs.kw.getKeywordsHTML()]],
                  ["div", {id:"loginstatdiv"}],
                  ["div", {id:"dlgbuttondiv"},
                   [["button", {type:"button", id:"updaccbutton",
                                onclick:mdfs("acc.updateAccount")},
                     "Ok"]]]]]];
            displayDialog(null, jt.tac2html(html));
            setFocus("namein");
            if(app.user.acc.status !== "Active") {
                mgrs.acc.showAccStatLink(); } },
        noticesCheckbox: function () {
            return jt.tac2html(
                ["div", {cla:"dlgformline"},
                 [["input", {type:"checkbox", id:"cbtlnotices",
                             value:"sendtlnotices",
                             checked:jt.toru(app.user.acc.settings.tlnotices)}],
                  ["label", {fo:"cbtlnotices", id:"tlnoticeslabel"},
                   "Send me new timeline notices"]]]); },
        showAccStatLink: function () {
            if(app.user.status !== "Active") {  //"Pending" or admin setting
                jt.out("accstatdiv", jt.tac2html(
                    [["label", {fo:"accstata", cla:"liflab"}, "Status:"],
                     ["a", {href:"#sendcode", cla:"lifin", id:"accstata",
                            title:"Email Account Activation Code",
                            onclick:mdfs("acc.sendactcode")},
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
                    jt.semaphore("sendactcode")); },
        getUpdateData: function () {
            var data = readInputFieldValues([
                "updemailin", "updpasswordin", "namein", "titlein", "webin"]);
            data = data || {};  //always update if they click to save
            data.settings = app.user.acc.settings || {};
            mgrs.acc.getNoticesSetting(data.settings);
            mgrs.kw.getKeywordsSetting(data.settings);
            data.settings = JSON.stringify(data.settings);
            return data; },
        getNoticesSetting: function (settings) {
            var cbntl = jt.byId("cbtlnotices");
            if(cbntl) {
                if(cbntl.checked) {  //could be set to "checked" or other true
                    settings.tlnotices = true; }
                else {
                    settings.tlnotices = false; } } },
        updateAccount: function () {
            var data = mgrs.acc.getUpdateData();
            jt.out("loginstatdiv", "Updating account...");
            jt.byId("updaccbutton").disabled = true;
            if(app.user.email === data.updemailin &&
               data.updpasswordin === "noval") {  //not changing auth info
                delete data.updpasswordin;        //so don't send
                delete data.updemailin; }
            else if(app.user.email !== data.updemailin) {
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
    };


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
        //handle param side effects
        params.plainurl = params.href.slice(0, params.qidx);
        if(params.an && params.at) {
            params.authqs = "an=" + params.an + "&at=" + params.at;
            params.an = jt.dec(params.an);
            setCookie(params.an, params.at); }
        //choose what to do next
        if(params.actcode) {
            jt.out("splashdiv", "Updating your account...");
            params.data = params.data || {};
            params.data.actcode = params.actcode;
            params.data = jt.objdata(params.data);
            jt.call("POST", "/api/updacc?" + params.authqs, params.data,
                    function (result) {
                        saveUserInfo(result);
                        //this next line probably results in a reload.
                        window.location.href = params.plainurl;
                        //continue on in case reload doesn't happen
                        app.dlg.chkcook(contf); },
                    function (code, errtext) {
                        jt.out("splashdiv", "Account update failed " + code +
                               ": " + errtext); }); }
        else if(params.compcert) {  //leave the params on the url
            app.dlg.chkcook(contf); }
        else { //nothing to save on server and no custom processing
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


    //Note that some anonymous user at least made it to the first save
    //point.  Prompt for them to sign in.
    function promptSignIn () {
        var data = jt.objdata(app.db.displayContext().prog);
        jt.call("POST", "/api/notefs?" + app.db.uidp(), data,
                function () { return true; },
                function (code, errtxt) {
                    jt.log("note first save " + code + " " + errtxt); },
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
        var data = app.refmgr.postdata(app.user.acc, ["email"]);
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
        myacc: function () { mgrs.acc.myAccount(); },
        back: function () { closeDialog(); popBack(); },
        login: function () { processSignIn(); },
        logout: function () { processSignOut(); },
        procparams: function (cf) { processParameters(cf); },
        chkcook: function (cf) { checkCookieSignIn(cf); },
        resetpw: function () { resetPassword(); },
        saveprog: function () { saveProgress(); },
        contnosave: function () { continueToNext(); },
        addtxt: function (field) { addTextListElement(field); },
        search: function () { searchForPoint(); },
        refsListHTML: function (refs) { return refsListHTML(refs); },
        gendat: function (gen) { return getOrSetGenerationData(gen); },
        closepop: function () { closePopup(); },
        saveAccountSettings: function () { saveAccountSettings(); },
        managerDispatch: function (mgrname, fname, ...args) {
            return mgrs[mgrname][fname].apply(app.tabular, args); }
        }; //end returned published functions
}());
