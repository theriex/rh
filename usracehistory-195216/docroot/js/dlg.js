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
        editPointFields = [
            {field:"date", type:"text", descf:"app.db.describeDateFormat", 
             place:"YYYY-MM-DD"},
            {field:"text", type:"bigtext", place:"Point Description Text"},
            {field:"codes", type:"codesel", multiple:true, options:[
                {value:"N", text:"Native American"},
                {value:"B", text:"African American"},
                {value:"L", text:"Latino/as"},
                {value:"A", text:"Asian American"},
                {value:"M", text:"Middle East and North Africa"},
                {value:"R", text:"Multiracial"},
                {value:"U", text:"Did you know?"},
                {value:"F", text:"Firsts"},
                {value:"D", text:"What year?"}]},
            {field:"keywords", type:"text", place:"tag1, tag2"},
            {field:"source", type:"text", place:"optional source id"},
            {field:"pic", type:"image"}],
        upldmon = null,
        cookname = "userauth",
        cookdelim = "..usracehistory..",
        lnfidx = 0,
        tl = null,
        dlgstack = [];


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
        html = "An introduction<br/>" +
            " to the history<br/>" +
            " of race and racism<br/>" +
            " in the United States<br/>";
        if(window.innerWidth < 400) {
            html = html.replace("<br/>", ""); }
        //no dialog dismissal option.  Use menu select to do something else.
        html = ["div", {id:"introdlgdiv"},
                [["div", {id:"introtitlediv"}, "U.S. Race History"],
                 ["table",
                  ["tr",
                   [["td",
                     ["div", {cla: "dlgtextdiv"}, html]],
                    ["td", 
                     ["div", {id: "startdiv", onclick: clickfstr},
                      ["div", {id: "startcontdiv"},
                       "Start"]]]]]]]];
        displayDialog(null, jt.tac2html(html));
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
            dp = tl.pts[idx];
            if(dp.start.year !== years[0]) {
                years.unshift(dp.start.year); }
            idx -= 1; }
        idx = pt.currdataindex + 1;
        while(idx < tl.pts.length && years.length <= 2 * flank) {
            dp = tl.pts[idx];
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
        var csv = "", stat = app.db.displayContext().stat;
        codes.split("").forEach(function (code) {
            csv.csvappend(stat[code].name); });
        return csv;
    }


    function infoButtons (d) {
        var ret = {tac:[], focid:"", date:""};
        if(d.codes.indexOf("U") >= 0) {
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
        else if(d.codes.indexOf("D") >= 0) {
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
                         pointCodeNamesCSV(d.codes)]],
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
        var buttons, pichtml = "", html;
        tl.dlgdat = d;
        if(d.pic) {
            pichtml = ["div", {cla:"dlgpicdiv", id:"dlgpicdiv"},
                       ["img", {cla:"infopic", 
                                src:"/ptpic?pointid=" + d.instid}]]; }
        buttons = infoButtons(d);
        html = [["div", {id:"genentrydiv"}],
                ["div", {id:"dlgdatediv"}, 
                 [buttons.date,
                  ["span", {id:"genindspan"}, generationIndicator(d)]]],
                ["div", {id:"dlgcontentdiv"},
                 ["div", {cla:"dlgtextdiv", id:"dlgtextdiv"},
                  [pichtml,
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
        var pt = tl.dlgdat,
            inter = pt.interact,
            ptid = pt.instid,
            prog = app.db.displayContext().prog,
            pstr = "";
        inter.end = new Date();
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
            if(pt.codes.indexOf("U") >= 0) {
                if(inter.answer === "yes") {
                    pstr += "k"; }
                if(inter.answer === "no") {
                    pstr += "u"; } }
            if(pt.codes.indexOf("D") >= 0) {
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
            pt.yearmisscount = pt.yearmisscount || 0;
            pt.yearmisscount += 1; }
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
        if(obj) {
            Object.keys(obj).forEach(function (field) {
                if(field.endsWith("in")) {
                    co[field.slice(0, -2)] = obj[field]; }
                else {
                    co[field] = obj[field]; } }); }
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
                        app.db.deserialize("AppUser", result[0]);
                        setAuthentication(cred.emailin, result);
                        app.dlg.close();
                        app.db.initTimelines();  //reset for user
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


    function popBack (dfunc) {
        if(dlgstack.length > 0) {
            return (dlgstack.pop())(); }
        if(dfunc) {
            return dfunc(); }
        app.mode.chmode();
    }


    function updateAccount () {
        var data = readInputFieldValues(["namein", "titlein", "webin"],
                                        ["none",   "none",    "none"]);
        if(data) {
            jt.out("loginstatdiv", "Updating account...");
            jt.call("POST", "updacc?" + authparams(), inputsToParams(data),
                    function (result) {
                        app.db.deserialize("AppUser", result[0]);
                        app.user.acc = result[0];
                        app.dlg.close();
                        popBack(app.db.nextInteraction); },
                    function (code, errtxt) {
                        jt.log("updateAccount " + code + ": " + errtxt);
                        jt.lut("loginstatdiv", errtxt); },
                    jt.semaphore("dlg.updateAccount")); }
    }


    function processSignIn (cred, bg) {
        //PENDING: Go with localStorage user instance if found, then redisplay
        //if any significant changes found after db retrieval.
        var params;
        cred = cred || readInputFieldValues(["emailin", "passwordin"]);
        params = inputsToParams(cred);
        jt.log("processSignIn params: " + params);
        if(cred) {
            jt.call("GET", "acctok?" + params, null,
                    function (result) {
                        app.db.deserialize("AppUser", result[0]);
                        setAuthentication(cred.emailin, result);
                        app.db.initTimelines();  //reset for user
                        //TEST: Uncomment to launch menu command post login
                        // setTimeout(function () { 
                        //     app.mode.menu(0, "newtl"); }, 200);
                        if(bg) {  //Background mode, leave UI/flow alone.
                            return; }
                        app.dlg.close();
                        popBack(app.db.nextInteraction); },
                    function (code, errtxt) {
                        jt.log("processSignIn: " + code + " " + errtxt);
                        setTimeout(function () {
                            if(!app.domfield("cbnewacc", "checked")) {
                                jt.out("loginstatdiv", errtxt); } }, 200); },
                    jt.semaphore("dlg.processSignIn")); }
    }


    function processSignOut () {
        app.user = {};
        jt.cookie(cookname, "", -1);
        app.mode.chmode();
    }


    function checkCookieSignIn (bg) {
        var cval = jt.cookie(cookname);
        jt.log("cookie " + cookname + ": " + cval);
        if(cval) {
            cval = cval.split(cookdelim);
            processSignIn({emailin:cval[0].replace("%40", "@"),
                           authtok:cval[1]}, bg); }
    }


    function forgotPassword () {
        var cred = readInputFieldValues(["emailin"]);
        if(cred) {
            jt.err("Not implemented yet"); }
    }


    function showSignInDialog () {
        var html, hd, cbi, fpd;
        cbi = {type:"checkbox", id:"cbnewacc", value:"na",
               onclick:jt.fs("app.dlg.signin()")};
        fpd = {id:"forgotpassdiv"};
        if(app.domfield("cbnewacc", "checked")) {
            hd = {f:jt.fs("app.dlg.newacc()"), b:"Sign Up"};
            cbi.checked = "checked";
            fpd.style = "visibility:hidden;"; }
        else {
            hd = {f:jt.fs("app.dlg.login()"), b:"Sign In"}; }
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
                 ["a", {href:"#forgotpassword",
                        onclick:jt.fs("app.dlg.forgotpw()")},
                  "forgot password"]]];
        displayDialog(null, jt.tac2html(html));
        jt.byId("emailin").focus();
    }


    function showSignInToSaveDialog () {
        var html;
        html = [["div", {id:"dlgtitlediv"}, "Save Progress"],
                ["div", {cla:"dlgsignindiv"},
                 ["div", {cla:"dlgformline"},
                  "Sign in to save your progress"]],
                ["div", {id:"dlgbuttondiv"},
                 [["button", {type:"button", id:"skipbutton",
                              onclick:jt.fs("app.dlg.contnosave()")},
                   "Skip"],
                  " &nbsp; ",
                  ["button", {type:"button", id:"signinbutton",
                              onclick:jt.fs("app.dlg.signin()")},
                   "Sign In"]]]];
        displayDialog(null, jt.tac2html(html));
        dlgstack.push(app.dlg.saveprog);
    }


    function continueToNext () {
        if(jt.byId("savestatspan")) {
            jt.out("savestatspan", "Continuing..."); }
        tl.pendingSaves = 0;
        nextColorTheme();
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


    function saveProgress () {
        var html, data,
            savestat = "Saving your progress...";
        if(!app.user.email) {
            return showSignInToSaveDialog(); }
        //jt.log("saving progress");
        html = [["div", {id:"dlgtitlediv"}, "Save Progress"],
                ["div", {cla:"dlgsignindiv"},
                 ["div", {cla:"dlgformline"},
                  ["span", {id:"savestatspan"}, savestat]]],
                ["div", {id:"dlgbuttondiv"},
                 buttons([["skipbutton", "Skip", "app.dlg.contnosave()"],
                          ["contbutton", "Continue", "app.dlg.signin()"]])]];
        displayDialog(null, jt.tac2html(html));
        jt.byId("contbutton").disabled = true;
        app.db.mergeProgToAccount();  //normalize current prog with db state
        data = app.db.postdata("AppUser", app.user.acc);
        jt.call("POST", "updacc?" + authparams(), data,
                function (result) {
                    jt.byId("contbutton").disabled = false;
                    jt.log("progress saved");
                    app.db.deserialize("AppUser", result[0]);
                    app.user.acc = result[0];
                    if(jt.byId("savestatspan") &&
                       jt.byId("savestatspan").innerHTML === savestat) {
                        continueToNext(); } },
                function (code, errtxt) {
                    jt.out("savstat", "Save failed. " + code + " " + errtxt);
                    jt.out("dlgbuttondiv", buttons([
                        ["skipbutton", "Skip", "app.dlg.contnosave()"],
                        ["retrybutton", "Retry", "app.dlg.saveprog()"]])); },
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


    function textInputTAC (fs, vo) {
        var inid, label, html;
        inid = fs.field + "in";
        label = fs.label || fs.field.capitalize();
        if(fs.descf) {
            label = ["a", {href:"#describe_" + label,
                           onclick:jt.fs("app.dlg.togfdesc('" +
                                         "fhdiv" + fs.field + "'," +
                                         fs.descf + ")")},
                     [label + "&nbsp;",
                      ["img", {src:"img/info.png"}],
                      "&nbsp;"]]; }
        html = ["div", {cla:"dlgformline"},
                [["div", {cla:"fieldhelpdiv", id:"fhdiv" + fs.field}],
                 ["label", {fo:inid, cla:"liflab", 
                            id:"lab" + inid}, label],
                 ["input", {type:fs.type, cla:"lifin", name:fs.field, id:inid,
                            value:(vo && vo[fs.field]) || "",
                            placeholder:fs.place || ""}]]];
        return html;
    }


    function largeTextInputTAC (fs, vo) {
        var html;
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


    function formValuesToObject (fields, ptid) {
        var obj = {};
        if(ptid) {
            obj.instid = ptid; }
        fields.forEach(function (fspec) {
            switch(fspec.type) {
            case "text": 
                obj[fspec.field] = jt.byId(fspec.field + "in").value;
                break;
            case "bigtext": 
                obj[fspec.field] = jt.byId(fspec.field + "ta").innerHTML;
                break;
            case "codesel":
                obj[fspec.field] = "";
                fspec.options.forEach(function (opt, idx) {
                    if(jt.byId(fspec.field + "opt" + idx).selected) {
                        obj[fspec.field] += opt.value; } });
                break;
            case "image":
                if(ptid && jt.byId(fspec.field + "in").files.length) {
                    obj[fspec.field] = "/ptpic?pointid=" + ptid; }
                break;
            default: jt.err("formValuesToObject unknown fspec " + fspec); } });
        return obj;
    }


    function codeselchg () {
        var pt;
        if(jt.byId("codeshin")) {
            pt = formValuesToObject(editPointFields);
            jt.byId("codeshin").value = pt.codes; }
    }


    function codeselInputTAC (fs, vo) {
        var inid, selopts, html = [];
        inid = fs.field + "sel";
        selopts = {id:inid, onchange:jt.fs("app.dlg.codeselchg()")};
        if(fs.multiple) {
            selopts.multiple = true; }
        fs.options.forEach(function (opt, idx) {
            var oao = {value:opt.value, id:fs.field + "opt" + idx};
            if(vo && vo[fs.field].indexOf(opt.value) >= 0) {
                oao.selected = "selected"; }
            html.push(["option", oao, opt.text]); });
        html = ["div", {cla:"dlgformline"},
                [["label", {fo:inid, cla:"liflab", id:"lab" + inid},
                  fs.label || fs.field.capitalize()],
                 ["select", selopts, html]]];
        return html;
    }


    function imageInputTAC (fs, vo) {
        var src, html;
        src = (vo && vo[fs.field]) || "";
        if(src) {
            src = "/ptpic?pointid=" + src; }
        else {
            src = "/img/picplaceholder.png"; }
        html = ["div", {cla:"dlgformline", style:"text-align:center;"},
                [["input", {type:"file", id:fs.field + "in", name:fs.field}],
                 ["img", {src:src, cla:"txtpicimg"}]]];
        return html;
    }


    function inputFieldTAC (fields, vo) {
        var html = [];
        fields.forEach(function (fspec) {
            switch(fspec.type) {
            case "text": html.push(textInputTAC(fspec, vo)); break;
            case "bigtext": html.push(largeTextInputTAC(fspec, vo)); break;
            case "codesel": html.push(codeselInputTAC(fspec, vo)); break;
            case "image": html.push(imageInputTAC(fspec, vo)); break;
            default: jt.err("inputFieldTAC unknown fspec " + fspec); } });
        return html;
    }


    function editPoint (ptid) {
        var pt, html;
        pt = app.db.pt4id(ptid);
        html = inputFieldTAC(editPointFields, pt);
        html = [["div", {id:"dlgtitlediv"}, "Edit Point"],
                ["div", {cla:"dlgsignindiv"},
                 ["form", {action:"/updpt", method:"post",
                           id:"editpointform", target: "subframe",
                           enctype: "multipart/form-data"},
                  [["input", {type:"hidden", name:"email", 
                              value:app.user.email}],
                   ["input", {type:"hidden", name:"authtok",
                              value:app.user.tok}],
                   ["input", {type:"hidden", id:"codeshin", name:"codes",
                              value:pt.codes}],
                   html,
                   ["div", {id:"updatestatdiv"}],
                   ["iframe", {id:"subframe", name:"subframe",
                               src:"/updpt"}],  //, style:"display:none"
                   ["div", {id:"dlgbuttondiv"},
                    [["button", {type:"button", id:"cancelbutton",
                                 onclick:jt.fs("app.dlg.close()")}, 
                      "Cancel"],
                     " &nbsp; ",
                     ["button", {type:"submit", id:"savebutton",
                                 onclick:jt.fs("app.dlg.ptsubclick()")},
                      "Save"]]]]]]];
        displayDialog(null, jt.tac2html(html));
    }


    function monitorPointUpdateSubmit () {
        var seconds, subframe, fc, txt, ptid, pt, 
            okpre = "ptid: ", errpre = "failed: ";
        seconds = Math.round(upldmon.count / 10);
        if(upldmon.count > 20) {
            jt.out("updatestatdiv", "Waiting for server response " + seconds); }
        subframe = jt.byId("subframe");
        if(subframe) {
            fc = subframe.contentDocument || subframe.contentWindow.document;
            if(fc && fc.body) {  //body unavailable if error write in progress
                txt = fc.body.innerHTML;
                if(txt.indexOf(okpre) === 0) {  //successful update
                    jt.out("savebutton", "Saved.");
                    ptid = txt.slice(okpre.length);
                    pt = formValuesToObject(editPointFields, ptid);
                    app.db.mergeUpdatedPointData(pt);
                    return app.dlg.close(); }
                if(txt.indexOf(errpre) >= 0) {
                    txt = txt.slice(txt.indexOf(errpre) + errpre.length);
                    jt.out("updatestatdiv", txt);  //display error
                    fc.body.innerHTML = "Reset.";  //reset status iframe
                    jt.byId("savebutton").disabled = false;
                    jt.out("savebutton", "Save");
                    return; } } }
        setTimeout(monitorPointUpdateSubmit, 100);
    }


    function ptsubclick () {
        jt.byId("savebutton").disabled = true;  //prevent multiple uploads
        jt.out("savebutton", "Saving...");
        upldmon = {count:0};
        setTimeout(monitorPointUpdateSubmit, 100);
        jt.byId("editpointform").submit();
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
        nextColorTheme: function () { nextColorTheme(); },
        signin: function () { showSignInDialog(); },
        genentry: function () { showGenerationEntryForm(); },
        cascgen: function (id) { cascadeGenerationInfo(id); },
        closegenentry: function () { closeGenerationEntry(); },
        okgenentry: function () { saveGenerationInfo(); },
        newacc: function () { createAccount(); },
        myacc: function () { myAccount(); },
        updacc: function () { updateAccount(); },
        back: function () { closeDialog(); popBack(); },
        login: function () { processSignIn(); },
        logout: function () { processSignOut(); },
        chkcook: function (bg) { checkCookieSignIn(bg); },
        forgotpw: function () { forgotPassword(); },
        saveprog: function () { saveProgress(); },
        contnosave: function () { continueToNext(); },
        ptedit: function (ptid) { editPoint(ptid); },
        ptsubclick: function () { ptsubclick(); },
        togfdesc: function (field, desc) { toggleFieldDesc(field, desc); },
        codeselchg: function () { codeselchg(); }
    };
}());
