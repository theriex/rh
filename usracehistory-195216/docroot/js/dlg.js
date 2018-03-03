/*jslint browser, multivar, white, fudge, for */
/*global app, jt, d3 */

app.dlg = (function () {
    "use strict";

    var lnfs = [
        {name: "parchment", dlgbg: "#f8e6a0", textbg: "#fff5ce", 
         datebg: "#fff0b7", buttonbg: "#ffe278"},
        {name: "slate", dlgbg: "#beddb9", textbg: "#d8f2d3", 
         datebg: "#ddfad8", buttonbg: "#aec8aa"},
        {name: "sky", dlgbg: "#d6edf2", textbg: "#e8f6f9", 
         datebg: "#e9f5f8", buttonbg: "#c0e3eb"}],
        buttonText = {yes:"Yes", no:"No"},
        birthyeardefault = (new Date()).getFullYear() - 27,
        generationyrs = 30,
        gendat = {accepted:false, gens:[
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
             year: -90000}]},
        cookname = "userauth",
        cookdelim = "..usracehistory..",
        lnfidx = 0,
        tl = null;


    function nextColorTheme () {
        lnfidx += 1;
        lnfidx = lnfidx % lnfs.length;
    }


    function setDialogColors () {
        var ct = lnfs[lnfidx];
        d3.select("#itemdispdiv").style("background", ct.dlgbg);
        d3.select(".dlgtextdiv").style("background", ct.textbg);
        d3.select(".dlgsavediv").style("background", ct.textbg);
        d3.select("#dlgdatespan").style("background", ct.datebg);
        d3.select("#choicebuttonsdiv").style("background", ct.textbg);
        d3.selectAll("button").style("background", ct.buttonbg);
    }


    function adjustContentHeight (dim) {
        var cd = {x:dim.x, y:dim.y, w:dim.w, h:dim.h},
            elids = ["dlgdatediv", "dlgxdiv", "dlgbuttondiv"];
        elids.forEach(function (id) {
            var elem = jt.byId(id);
            if(elem) {
                cd.h -= elem.offsetHeight; } });
        d3.select("#dlgcontentdiv")
            .style("max-height", cd.h + "px");
    }


    function displayDialog (d, html) {
        var dim, elem, txtdiv, picdiv;
        if(tl.width < 500) {  //use full space on small devices
            dim = {x: tl.margin.left + Math.round(0.02 * tl.width),
                   y: tl.margin.top + Math.round(0.04 * tl.height),
                   w: Math.round(0.9 * tl.width),
                   h: Math.round(0.8 * tl.height)}; }
        else { //larger display tracks the point height for visual interest
            dim = {tracked: true,
                   x: tl.margin.left + Math.round(0.04 * tl.width),
                   y: tl.margin.top + Math.round(0.04 * tl.height),
                   w: Math.round(0.9 * tl.width)};
            if(d) {
                dim.y = tl.margin.top + tl.y(d.oc);
                dim.y = Math.min(dim.y, Math.round(0.7 * tl.height)); }
            dim.h = Math.round(0.9 * tl.height) - dim.y; }
        d3.select("#itemdispdiv")
            .style("left", dim.x + "px")
            .style("top", dim.y + "px")
            .style("max-width", dim.w + "px")
            .style("max-height", dim.h + "px");
        jt.out("itemdispdiv", html);
        adjustContentHeight(dim);
        if(dim.tracked) {
            elem = jt.byId("itemdispdiv");
            txtdiv = jt.byId("dlgtextdiv");
            picdiv = jt.byId("dlgpicdiv");
            if(elem && ((elem.scrollHeight > elem.clientHeight) ||
                        (txtdiv && txtdiv.clientHeight > elem.clientHeight) ||
                        (picdiv && picdiv.clientHeight > elem.clientHeight))) {
                //readjust to full screen to accommodate overflow
                dim.y = tl.margin.top + Math.round(0.04 * tl.height);
                dim.h = Math.round(0.8 * tl.height);
                adjustContentHeight(dim);
                d3.select("#itemdispdiv")
                    .style("top", dim.y + "px")
                    .style("max-height", dim.h + "px"); } }
        setDialogColors();
        d3.select("#itemdispdiv")
            .style("visibility", "visible")
            .style("max-height", "4px")
            .transition().duration(250)
            .style("max-height", dim.h + "px");
    }


    function showStartDialog (clickfstr) {
        var html;
        //removed dlgxdiv since dismissing the dialog does not leave you
        //with an interactive application. Close interactivity instead.
        html = ["div", {id:"introdlgdiv"},
                [["div", {id:"introtitlediv"}, "U.S. Race History"],
                 ["table",
                  ["tr",
                   [["td",
                     ["div", {cla: "dlgtextdiv"},
                      "An introduction<br/>" +
                      "to the history of<br/>" +
                      "race and racism in<br/>" +
                      "the United States<br/>"]],
                    ["td", 
                     ["div", {id: "startdiv", onclick: clickfstr},
                      ["div", {id: "startcontdiv"},
                       "Start"]]]]]]]];
        displayDialog(null, jt.tac2html(html));
    }


    function infoPicHTML (d) {
        var html = "", name = "", i, ch;
        if(d.pic) {
            for(i = 0; i < d.pic.length - 4; i += 1) {
                ch = d.pic.charAt(i);
                if(ch === "-") {
                    name += "-"; }
                else if(ch === ch.toUpperCase()) {
                    name += " " + ch.toUpperCase(); }
                else {
                    name += ch; } }
            name = name.replace(/De\sBakey/g, "DeBakey");
            name = name.split(" ");
            name.forEach(function (na, idx) {
                if(na.length === 1) {
                    name[idx] = na + "."; } });
            name = name.join(" ");
            html = jt.tac2html(
                [["img", {cla:"infopic", src:"img/datapics/" + d.pic}],
                 ["div", {cla:"picnamediv"}, name]]); }
        return html;
    }


    function rememberCheckboxTAC (checked) {
        var html;
        html = ["div", {cla:"checkboxdiv"},
                [["input", {type:"checkbox", id:"cbremember",
                            value:"remembered", checked:jt.toru(checked)}],
                 ["label", {fo:"cbremember", id:"remcblabel"},
                  "Browse later"]]];
        return html;
    }


    function getYearGuessOptions (pt, flank) {
        var idx, dp, off, years = [pt.start.year];
        idx = pt.currdataindex - 1;
        while(idx >= 0 && years.length < flank) {
            dp = app.data.pts[idx];
            if(dp.start.year !== years[0]) {
                years.unshift(dp.start.year); }
            idx -= 1; }
        idx = pt.currdataindex + 1;
        while(idx < app.data.pts.length && years.length <= 2 * flank) {
            dp = app.data.pts[idx];
            if(dp.start.year !== years[years.length - 1]) {
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


    function pointCodeNamesCSV (codes) {
        var cidx, code, tidx, ptc, csv = "";
        for(cidx = 0; cidx < codes.length; cidx += 1) {
            code = codes.charAt(cidx);
            for(tidx = 0; tidx < app.data.ptcs.length; tidx += 1) {
                ptc = app.data.ptcs[tidx];
                if(ptc.code === code) {
                    if(csv) {
                        csv += ", "; }
                    csv += ptc.name;
                    break; } } }
        return csv;
    }


    function infoButtons (d) {
        var ret = {tac:[], focid:"", date:""};
        if(d.code.indexOf("U") >= 0) {
            ret.tac = [["span", {cla:"buttonintrospan"}, "Did you know?"],
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
        else if(d.code.indexOf("D") >= 0) {
            ret.tac = [];
            d.yearguesses = getYearGuessOptions(d, 3);
            d.yearguesses.forEach(function (year) {
                ret.tac.push(["button", {type:"button", id:yearButtonId(year),
                                         onclick:jt.fs("app.dlg.guessyear(" +
                                                       year + ")")},
                              year]); });
            ret.date = ["span", {id:"dlgdatespan"}, 
                        ["span", {id:"dlgdatequestion"}, "When?"]]; }
        else {
            ret.tac = [["div", {cla:"buttonptcodessdiv"},
                        [["span", {cla:"buttonptcodeslabelspan"}, 
                          "Groups: "],
                         pointCodeNamesCSV(d.code)]],
                       ["button", {type:"button", id:"nextbutton",
                                   onclick:jt.fs("app.dlg.button()")},
                        "Continue"]];
            ret.focid = "nextbutton";
            ret.date = ["span", {id:"dlgdatespan"}, d.dispdate]; }
        return ret;
    }


    function cascadeGenerationInfo (id) {
        var cascading = -1, val = 0;
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
        var html, genobj = null, i, label;
        if(!gendat.accepted) {
            html = ["button", {type:"button", cla:"genbutton",
                               onclick:jt.fs("app.dlg.genentry()")},
                    "Generations"]; }
        else {
            for(i = 0; !genobj && i < gendat.gens.length; i += 1) {
                if(gendat.gens[i].year <= d.start.year) {
                    genobj = gendat.gens[i]; } }
            label = jt.byId("rhcontentdiv");
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
        gendat.gens.forEach(function (gen) {
            var input = jt.byId(gen.id + "in");
            if(input) {
                gen.year = Number(input.value); } });
        gendat.accepted = true;
        closeGenerationEntry();
        jt.log("dlg.saveGenerationInfo not writing to server yet...");
    }


    function showInfoDialog (d) {
        var buttons, html;
        tl.dlgdat = d;
        buttons = infoButtons(d);
        html = [["div", {id:"genentrydiv"}],
                ["div", {id:"dlgdatediv"}, 
                 [buttons.date,
                  ["span", {id:"genindspan"}, generationIndicator(d)]]],
                ["div", {id:"dlgcontentdiv"},
                 ["div", {cla:"dlgtextdiv", id:"dlgtextdiv"},
                  [["div", {cla:"dlgpicdiv", id:"dlgpicdiv"}, infoPicHTML(d)],
                   d.text]]],
                ["div", {id:"dlgbuttondiv"}, buttons.tac]];
        displayDialog(d, jt.tac2html(html));
        d.interact = {start:new Date()};
        //setting focus the first time does not work for whatever
        //reason, but it helps for subsequent dialog displays.
        if(buttons.focid) {
            setTimeout(function () { jt.byId(buttons.focid).focus(); }, 500); }
    }


    function closeInteractionTimeTracking () {
        var inter = tl.dlgdat.interact;
        inter.end = new Date();
        tl.dlgdat.duration = app.db.getElapsedTime(inter.start, inter.end);
        inter.elapsed = tl.dlgdat.duration / 10;  //seconds
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
            inter.answer = answer; }
        if(answer && answer !== buttonText.yes) {
            tl.dlgdat.remembered = jt.byId("cbremember").checked; }
        closeInteractionTimeTracking();
        transitionToNext();
    }


    function yearGuessButtonPress (year) {
        var pt = tl.dlgdat;
        if(pt.start.year === year) {
            closeInteractionTimeTracking();
            jt.out("dlgdatediv", jt.tac2html(
                ["span", {id:"dlgdatespan"}, pt.dispdate]));
            pt.yearguesses.forEach(function (year) {
                jt.byId(yearButtonId(year)).disabled = true; });
            setTimeout(transitionToNext, 1000); }
        else {
            jt.byId(yearButtonId(year)).disabled = true;
            jt.out("dlgdatequestion", 
                   jt.byId("dlgdatequestion").innerHTML + "?");
            pt.yearguesscount = pt.yearguesscount || 1;
            pt.yearguesscount += 1; }
    }


    function levelDetailText (levinf) {
        var idx = 0, offset, trav = {}, pts = app.data.pts;
        if(levinf.level <= 1) {
            return "Intro Level: Lesser Known Facts"; }
        //Which points, and how many, can vary from one save to the next due
        //to extracurricular clicking, and/or changes to the data itself.
        //The years covered can vary depending on which usrace group is
        //providing the points for the current pass.  Not exact.  Pretty
        //much has to be guessed each time using heuristic traversal.
        while(!pts[idx].sv || pts[idx].visited) {
            idx += 1; }
        trav.firstnewidx = idx;
        offset = levinf.levPtsVis;
        while(idx > 0) {
            idx -= 1;
            if(!pts[idx].sv && pts[idx].visited) {
                offset -= 1; }
            if(!offset) {
                break; } }
        trav.startidx = idx;
        idx = trav.firstnewidx;
        offset = levinf.levPtsAvail;
        while(idx < pts.length) {
            idx += 1;
            if(!pts[idx].sv && !pts[idx].visited) {
                offset -= 1; }
            if(!offset) {
                break; } }
        trav.endidx = idx;
        trav.start = pts[trav.startidx].start.year;
        if(trav.start < 0) {
            trav.start = Math.abs(trav.start) + " BCE"; }
        return "Level " + levinf.level + ": " + trav.start +
            " to " + pts[trav.endidx].start.year;
    }


    function showSaveConfirmationDialog (nextfstr) {
        var html, subj, body, levinf = app.lev.progInfo();
        levinf.savenum = Math.floor(levinf.levPtsVis / levinf.savelen);
        subj = "Race History restore link";
        body = "Click this link to restore your browser state:\n" +
            "http://localhost:8080?" + app.db.getStateURLParams();
        html = [["div", {cla: "dlgsavediv"},
                 [["div", {id: "dlgsavelevinfdiv"}, 
                   "Level " + levinf.level + " Save " + levinf.savenum],
                  ["div", {id:"dlgsavelevdetdiv"}, levelDetailText(levinf)],
                  // ["div", {id: "dlgsavebrowserdiv"}, 
                  //  "Progress saved in browser."],
                  ["div", {id:"dlgsaveservermsgdiv"},
                   ["a", {href:"#signin", onclick:jt.fs("app.dlg.login()")},
                    "Sign in to save progress"]],
                  ["div", {id: "dlgsavelinkdiv"}, "building restore link..."]]],
                ["div", {id: "dlgbuttondiv"},
                 ["button", {type: "button", id: "nextbutton",
                             onclick: nextfstr},
                  "Ok"]]];
        displayDialog(null, jt.tac2html(html));
        //The mail href can sometimes take a long time to render leading
        //to the dialog looking like it has crashed.  So dump out the 
        //contents in a separate step.
        setTimeout(function () {
            jt.out("dlgsavelinkdiv", jt.tac2html(
                ["a", {href: "mailto:?subject=" + jt.dquotenc(subj) + 
                                    "&body=" + jt.dquotenc(body)},
                 "Mail a Progress link"])); }, 100);
    }


    function readInputFieldValues (fields, defaultvals) {
        var vals = {}, filled = true;
        fields.forEach(function (field) {
            var lv = jt.byId("lab" + field);
            lv.innerHTML = lv.innerHTML.replace("*", "");
            lv.style.fontWeight = "normal";
            vals[field] = jt.byId(field).value; });
        fields.forEach(function (field, idx) {
            var lv = jt.byId("lab" + field);
            if(!vals[field] || ((field.indexOf("mail") >= 0) &&
                                (!jt.isProbablyEmail(vals[field])))) {
                if(!defaultvals || !defaultvals[idx]) {
                    lv.innerHTML += "*";
                    lv.style.fontWeight = "bold";
                    filled = false; }
                else {
                    vals[field] = defaultvals[idx]; } } });
        if(!filled) {
            return null; }
        return vals;
    }


    function inputsToParams (obj) {
        var co = {};
        Object.keys(obj).forEach(function (field) {
            if(field.endsWith("in")) {
                co[field.slice(0, -2)] = obj[field]; }
            else {
                co[field] = obj[field]; } });
        return jt.objdata(co);
    }


    function setAuthentication (email, result) {
        app.user.email = email;
        app.user.acc = result[0];
        app.user.tok = result[1].token;
        jt.cookie(cookname, email + cookdelim + app.user.tok, 365);
        if(!app.auth) {
            app.auth = function () {
                return "email=" + jt.enc(app.user.email) + "&authtok=" +
                    app.user.tok; }; }
    }


    function createAccount () {
        var cred = readInputFieldValues(["emailin", "passwordin"]);
        if(cred) {
            jt.out("loginstatdiv", "Creating account...");
            jt.call("POST", "updacc", inputsToParams(cred),
                    function (result) {
                        setAuthentication(cred.emailin, result);
                        app.dlg.close();
                        app.dlg.myacc(); },
                    function (code, errtxt) {
                        jt.log("createAccount " + code + " " + errtxt);
                        jt.out("loginstatdiv", errtxt); },
                    jt.semaphore("dlg.createAccount")); }
    }


    function myAccount () {
        var html;
        html = [["div", {id:"dlgtitlediv"},
                 [["a", {href:"#back", onclick:jt.fs("app.dlg.back()")},
                   ["img", {src:"img/backward.png", cla:"dlgbackimg"}]],
                  app.user.email]],
                ["div", {cla:"dlgsignindiv"},
                 [["div", {cla:"dlgformline"},
                   [["label", {fo:"namein", cla:"liflab", id:"labnamein"},
                     "Name"],
                    ["input", {type:"text", cla:"lifin",
                               name:"namein", id:"namein",
                               value:app.user.acc.name}]]],
                  ["div", {cla:"dlgformline"},
                   [["label", {fo:"titlein", cla:"liflab", id:"labtitlein"},
                     "Title"],
                    ["input", {type:"text", cla:"lifin",
                               name:"titlein", id:"titlein",
                               value:app.user.acc.title}]]],
                  ["div", {cla:"dlgformline"},
                   [["label", {fo:"webin", cla:"liflab", id:"labwebin"},
                     "Website"],
                    ["input", {type:"text", cla:"lifin",
                               name:"webin", id:"webin",
                               value:app.user.acc.web}]]]]],
                ["div", {id:"loginstatdiv"}],
                ["div", {id:"dlgbuttondiv"},
                 [["button", {type:"button", id:"updaccbutton",
                              onclick:jt.fs("app.dlg.updacc()")},
                   "Ok"]]]];
        displayDialog(null, jt.tac2html(html));
        jt.byId("namein").focus();
    }


    function authparams () {
        return "email=" + jt.enc(app.user.email) + "&authtok=" + app.user.tok;
    }


    function updateAccount () {
        var data = readInputFieldValues(["namein", "titlein", "webin"],
                                        ["none",   "none",    "none"]);
        if(data) {
            jt.out("loginstatdiv", "Updating account...");
            jt.call("POST", "updacc?" + authparams(), inputsToParams(data),
                    function (result) {
                        app.user.acc = result[0];
                        app.dlg.close();
                        app.mode.chmode(); },
                    function (code, errtxt) {
                        jt.log("updateAccount " + code + ": " + errtxt);
                        jt.lut("loginstatdiv", errtxt); },
                    jt.semaphore("dlg.updateAccount")); }
    }


    function processSignIn (cred) {
        var params;
        cred = cred || readInputFieldValues(["emailin", "passwordin"]);
        params = inputsToParams(cred);
        jt.log("processSignIn params: " + params);
        if(cred) {
            jt.call("GET", "acctok?" + params, null,
                    function (result) {
                        setAuthentication(cred.emailin, result)
                        app.dlg.close();
                        //TEST: Uncomment to launch menu command post login
                        // setTimeout(function () { 
                        //     app.mode.menu(0, 'newtl'); }, 200);
                        app.mode.chmode(); },
                    function (code, errtxt) {
                        jt.log("processSignIn: " + code + " " + errtxt);
                        jt.out("loginstatdiv", errtxt); },
                    jt.semaphore("dlg.processSignIn")); }
    }


    function processSignOut () {
        app.user = {};
        jt.cookie(cookname, "", -1);
        app.mode.chmode();
    }


    function checkCookieSignIn () {
        var cval = jt.cookie(cookname);
        jt.log("cookie " + cookname + ": " + cval);
        if(cval) {
            cval = cval.split(cookdelim);
            processSignIn({emailin:cval[0].replace("%40", "@"),
                           authtok:cval[1]}); }
    }


    function forgotPassword () {
        var cred = readInputFieldValues(["emailin"]);
        if(cred) {
            jt.err("Not implemented yet"); }
    }


    function showSignInDialog () {
        var html;
        html = [["div", {id:"dlgtitlediv"},
                 [["a", {href:"#back", onclick:jt.fs("app.dlg.back()")},
                   ["img", {src:"img/backward.png", cla:"dlgbackimg"}]],
                  "Welcome"]],
                ["div", {cla:"dlgsignindiv"},
                 [["div", {cla:"dlgformline"},
                   [["label", {fo:"emailin", cla:"liflab", id:"labemailin"}, 
                     "Email"],
                    ["input", {type:"email", cla:"lifin", 
                               name:"emailin", id:"emailin",
                               placeholder:"nospam@example.com"}]]],
                  ["div", {cla:"dlgformline"},
                   [["label", {fo:"passwordin", cla:"liflab", 
                               id:"labpasswordin"}, 
                     "Password"],
                    ["input", {type:"password", cla:"lifin",
                               name:"passwordin", id:"passwordin",
                               onchange:jt.fs("app.dlg.login()")}]]]]],
                ["div", {id:"loginstatdiv"}],
                ["div", {id:"dlgbuttondiv"},
                 [["button", {type:"button", id:"newaccbutton",
                              onclick:jt.fs("app.dlg.newacc()")},
                   "Sign Up"],
                  "&nbsp;or&nbsp;",
                  ["button", {type:"button", id:"signinbutton",
                              onclick:jt.fs("app.dlg.login()")},
                   "Sign In"]]],
                ["div", {id:"forgotpassdiv"},
                 ["a", {href:"#forgotpassword",
                        onclick:jt.fs("app.dlg.forgotpw()")},
                  "forgot password"]]];
        displayDialog(null, jt.tac2html(html));
        jt.byId("emailin").focus();
    }


    function closeDialog (mode) {
        d3.select("#itemdispdiv")
            .style("visibility", "hidden");
        if(mode) {  //e.g. "reference"
            app.mode.chmode(mode); }
    }


    return {
        init: function (timeline) { tl = timeline; },
        start: function (clickfstr) { showStartDialog(clickfstr); },
        info: function (d, nextfstr) { showInfoDialog(d, nextfstr); },
        show: function (html) { displayDialog(null, html); },
        close: function (mode) { closeDialog(mode); },
        button: function (answer) { buttonPress(answer); },
        guessyear: function (year) { yearGuessButtonPress(year); },
        save: function (nextfstr) { showSaveConfirmationDialog(nextfstr); },
        nextColorTheme: function () { nextColorTheme(); },
        signin: function () { showSignInDialog(); },
        genentry: function () { showGenerationEntryForm(); },
        cascgen: function (id) { cascadeGenerationInfo(id); },
        closegenentry: function () { closeGenerationEntry(); },
        okgenentry: function () { saveGenerationInfo(); },
        newacc: function () { createAccount(); },
        myacc: function () { myAccount(); },
        updacc: function () { updateAccount(); },
        back: function () { closeDialog(); app.mode.chmode(); },
        login: function () { processSignIn(); },
        logout: function () { processSignOut(); },
        chkcook: function () { checkCookieSignIn(); },
        forgotpw: function () { forgotPassword(); }
    };
}());
