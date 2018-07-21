/*jslint browser, multivar, white, fudge, for, long */
/*global app, jt, d3, confirm */

app.dlg = (function () {
    "use strict";

    var lnfs = [
        {name: "parchment", dlgbg: "#f8e6a0", textbg: "#fff5ce", 
         datebg: "#fff0b7", buttonbg: "#ffe278"},
        {name: "slate", dlgbg: "#beddb9", textbg: "#d8f2d3", 
         datebg: "#ddfad8", buttonbg: "#aec8aa"},
        {name: "sky", dlgbg: "#c6deff", textbg: "#e7f1ff",
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
        edptflds = [
            {field:"date", layout:"main", type:"text", 
             descf:"app.db.describeDateFormat", place:"YYYY-MM-DD",
             reqd:"Please enter a valid date value."},
            {field:"text", layout:"main", type:"bigtext", 
             place:"Point Description Text",
             reqd:"Please provide some descriptive text."},
            {field:"codes", layout:"detail", type:"codesel", hin:"codeshin",
             multiple:true, options:[
                {value:"N", text:"Native American"},
                {value:"B", text:"African American"},
                {value:"L", text:"Latino/as"},
                {value:"A", text:"Asian American"},
                {value:"M", text:"Middle East and North Africa"},
                {value:"R", text:"Multiracial"},
                {value:"U", text:"Did you know?"},
                {value:"F", text:"Firsts"},
                {value:"D", text:"What year?"}],
             reqd:"Please select all applicable point codes."},
            {field:"keywords", layout:"detail", type:"text", 
             place:"tag1, tag2"},
            {field:"refs", pname:"References", layout:"ref", type:"txtlst",
             place:"reference citation and/or URL"},
            {field:"source", layout:"detail", type:"text", 
             place:"unique id for point"},
            {field:"pic", layout:"pic", type:"image"}],
        upldmon = null,
        cookname = "userauth",
        cookdelim = "..usracehistory..",
        lnfidx = 0,
        tl = null,
        editpt = null,
        dlgstack = [];


    function nextColorTheme () {
        lnfidx += 1;
        lnfidx = lnfidx % lnfs.length;
    }


    function setDialogColors () {
        var ct = lnfs[lnfidx];
        d3.select("#itemdispdiv").style("background", ct.dlgbg);
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
        var ph = 166,  //default infopic max-height from css
            resids = ["dlgdatediv", "dlgbuttondiv"],
            img, mh;
        //Set min text area height equal img height so pic not squished.
        if(d && d.pic) {
            img = jt.byId("dlgpicimg");
            if(img && img.offsetHeight) {
                ph = img.offsetHeight; }
            jt.byId("dlgtextdiv").style.minHeight = ph + "px";
            //pad 4 margin-top 2 === 10, extra in case === 12
            jt.byId("dlgcontentdiv").style.minHeight = (ph + 12) + "px"; }
        //Set max text area height equal to max dlg height - header/footer
        mh = dlgdim.h;
        resids.forEach(function (id) {
            var elem = jt.byId(id);
            if(elem) {
                mh -= elem.offsetHeight; } });
        mh -= 10;  //avoid off-by-one calcs, default margins..
        d3.select("#dlgcontentdiv")  //text and img areas together
            .style("max-height", mh + "px");
    }


    function verticallyPositionDialog (d, dim) {
        var y = dim.myt,
            dd = jt.byId("itemdispdiv"),
            xa, bump;
        if(d && dd && ((dd.offsetHeight - 10) < dim.h)) {
            xa = tl.y(tl.pts[0].vc);  //first point should be on x-axis
            y = tl.y(d.vc) - xa;  //start with logical offset value
            y *= -1;  //invert so more chance circle is visible
            y = xa + y;
            //if y is close to the x-axis, then bump it upwards or downwards
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
    }


    function displayDialog (d, html) {
        var dim;
        if(d) {
            jt.log("displayDialog " + d.instid + " " + 
                   d.text.slice(0, 50) + "..."); }
        dim = constrainDialogToChartDims();
        //Verify the dialog is hidden so there is no blink when the content
        //gets updated.
        jt.byId("itemdispdiv").style.visibility = "hidden";
        jt.out("itemdispdiv", html);
        constrainTextToDialogHeight(d, dim);
        verticallyPositionDialog(d, dim);
        setDialogColors();
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


    function wrapText (txt, cc) {
        var line = "", res = [], words = txt.split(/\s/);
        words.forEach(function (word) {
            if(line.length + word.length < cc) {
                line += " " + word; }
            else {
                if(line) {  //have previously appended words
                    res.push(line); }
                line = word; } });
        if(line) {  //append any remainder
            res.push(line); }
        return res.join("<br/> ").trim();
    }
        // html = "An introduction<br/>" +
        //     " to the history<br/>" +
        //     " of race and racism<br/>" +
        //     " in the United States<br/>";


    function showStartDialog (title, subtitle, clickfstr) {
        var html = wrapText(subtitle || "", 18);
        if(window.innerWidth < 400) {
            html = html.replace(/<br\/>/g, ""); }
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
        var pti, idx = 0, dp, off, years = [pt.start.year];
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


    function pointCodeNamesCSV (pt) {
        var csv = "", stat = app.db.displayContext().mrcl.tl.stat;
        pt.codes.split("").forEach(function (code) {
            //processing codes ('U', 'F', 'D') and uknown codes are ignored
            if(stat[code]) {
                csv = csv.csvappend(stat[code].name); } });
        return csv;
    }


    function infoButtons (d, inter) {
        var ret = {tac:[], focid:"", date:""};
        if(!inter) {
            ret.tac = [["div", {cla:"buttonptcodesdiv"},
                        [["span", {cla:"buttonptcodeslabelspan"}, 
                          "Groups: "],
                         pointCodeNamesCSV(d)]],
                       ["button", {type:"button", id:"backbutton",
                                   onclick:jt.fs("app.dlg.button('back')")},
                        "Return To Interactive"]];
            ret.focid = "backbutton";
            ret.date = ["span", {id:"dlgdatespan"}, d.dispdate]; }
        else if(d.codes.indexOf("U") >= 0) {
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
            ret.tac = [["div", {cla:"buttonptcodesdiv"},
                        [["span", {cla:"buttonptcodeslabelspan"}, 
                          "Groups: "],
                         pointCodeNamesCSV(d)]],
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


    function setFocus (elemid) {
        jt.byId(elemid).focus();
        //try again in a moment in case the element wasn't ready.  Typically
        //isn't due to displayDialog transitions and timeouts.
        setTimeout(function () {
            jt.byId(elemid).focus(); }, 1200);
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
        var buttons, pichtml = "", refshtml, html;
        tl.dlgdat = d;
        if(d.pic) {
            pichtml = ["div", {cla:"dlgpicdiv", id:"dlgpicdiv"},
                       ["img", {cla:"infopic", id:"dlgpicimg",
                                src:"/ptpic?pointid=" + d.instid}]]; }
        refshtml = [["a", {onclick:jt.fs("app.dlg.search()")},
                     ["img", {cla:"searchicoimg", src:"img/search.png"}]]];
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
            if(answer !== "back") {
                inter.answer = answer;
                if(answer !== buttonText.yes) {
                    tl.dlgdat.remembered = jt.byId("cbremember").checked; } } }
        if(answer !== "back") {
            app.mode.updqrc(-1); }
        closeInteractionTimeTracking();
        transitionToNext();
    }


    function yearGuessButtonPress (year) {
        var pt = tl.dlgdat, button;
        if(pt.start.year === year) {
            app.mode.updqrc(-1);
            closeInteractionTimeTracking();
            jt.out("dlgdatediv", jt.tac2html(
                ["span", {id:"dlgdatespan"}, pt.dispdate]));
            pt.yearguesses.forEach(function (year) {
                jt.byId(yearButtonId(year)).disabled = true; });
            setTimeout(transitionToNext, 1000); }
        else {
            button = jt.byId(yearButtonId(year));
            button.disabled = true;
            button.innerHTML = "x";
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
                      "regionsin", "categoriesin", "tagsin", "updorgbutton"];
        if(app.user.acc.lev !== 2) {
            disids.forEach(function (id) {
                var elem = jt.byId(id);
                if(elem) {
                    elem.disabled = true; } }); }
    }


    function showOrgMembers () {
        var url, oms = app.orgmembers || [app.user.acc],
            labels = ["Members:", "Contributors:", "Administrators:"],
            html = [];
        if(!jt.byId("orgmembersdiv")) {
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
        jt.out("orgmembersdiv", jt.tac2html(html));
        if(!app.orgmembers) {
            jt.out("loginstatdiv", "Fetching members...");
            url = "orgmembers?" + app.auth() + "&orgid=" + app.user.acc.orgid + 
                jt.ts("&cb=", "second");
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
        var om = app.omids[instid], verified = true, data;
        if(chg === -1 && instid === app.user.acc.instid &&
           !confirm("Are you sure you want to resign as an Administrator?")) {
            verified = false; }
        if(chg === -1 && om.lev === 0 &&
           !confirm("Completely remove member from organization?")) {
            verified = false; }
        if(verified) {
            app.dlg.omexp(instid);  //hide buttons so no double click.
            jt.out("loginstatdiv", "Updating membership...");
            data = jt.objdata({orgid:app.user.acc.orgid,
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
        var div, user = app.omids[instid], html = [];
        div = jt.byId("om" + instid + "detdiv");
        if(!div) { return; }
        if(div.innerHTML) {  //have content, toggle off
            div.innerHTML = "";
            return; }
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


    function orgEditMembersContent () {
        var html, buttons;
        html = [["div", {cla:"dlgformline", id:"orgemodediv"},
                 ["a", {href:"#members", 
                        onclick:jt.fs("app.dlg.editorg('details')")},
                  "Show Details"]],
                ["div", {cla:"dlgscrollarea", id:"orgmembersdiv"}],
                ["div", {cla:"dlgformline"}, ["em", "Add user by email"]],
                ["div", {cla:"dlgformline"},
                 [["label", {fo:"emailin", cla:"liflab", id:"labemailin"},
                   "Email"],
                  ["input", {type:"text", cla:"lifin",
                             name:"emailin", id:"emailin"}]]]];
        buttons = [["button", {type:"button", id:"addmemberbutton",
                               onclick:jt.fs("app.dlg.addmem()")},
                    "Add"]];
        return {html:html, buttons:buttons};
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


    function orgEditDetailsContent () {
        var html, buttons;
        html = [["div", {cla:"dlgformline", id:"orgemodediv"},
                 ["a", {href:"#members", 
                        onclick:jt.fs("app.dlg.editorg('members')")},
                  "Show Members"]],
                ["div", {cla:"dlgformline"},
                 [["label", {fo:"namein", cla:"liflab", id:"labnamein"},
                   "Name"],
                  ["input", {type:"text", cla:"lifin",
                             name:"namein", id:"namein",
                             value:app.user.org.name}]]],
                ["div", {cla:"dlgformline"},
                 [["label", {fo:"codein", cla:"liflab", id:"labcodein"},
                   "Code"],
                  ["input", {type:"text", cla:"lifin",
                             name:"codein", id:"codein",
                             placeholder:"Initials or short name",
                             value:app.user.org.code}]]],
                ["div", {cla:"dlgformline"},
                 [["label", {fo:"contacturlin", cla:"liflab", 
                             id:"labcontacturlin"},
                   "Contact"],
                  ["input", {type:"text", cla:"lifin",
                             name:"contacturlin", id:"contacturlin",
                             placeholder:"https://yoursite.org",
                             value:app.user.org.contacturl}]]],
                ["div", {cla:"dlgformline"},
                 [["label", {fo:"projecturlin", cla:"liflab", 
                             id:"labprojecturlin"},
                   "Project"],
                  ["input", {type:"text", cla:"lifin",
                             name:"projecturlin", id:"projecturlin",
                             placeholder:"https://.../projectpage",
                             value:app.user.org.projecturl}]]],
                ["div", {cla:"dlgformline"},
                 [["label", {fo:"regionsin", cla:"liflab", id:"labregionsin"},
                   "Regions"],
                  ["input", {type:"text", cla:"lifin",
                             name:"regionsin", id:"regionsin",
                             placeholder:"Boston, West Coast, ...",
                             value:app.user.org.regions}]]],
                ["div", {cla:"dlgformline"},
                 [["label", {fo:"categoriesin", cla:"liflab", 
                             id:"labcategoriesin"},
                   "Categories"],
                  ["input", {type:"text", cla:"lifin",
                             name:"categoriesin", id:"categoriesin",
                             placeholder:"Core, Stats, Awards, ...",
                             value:app.user.org.categories}]]],
                ["div", {cla:"dlgformline"},
                 [["label", {fo:"tagsin", cla:"liflab", id:"labtagsin"},
                   "Tags"],
                  ["input", {type:"text", cla:"lifin",
                             name:"tagsin", id:"tagsin",
                             placeholder:"Keyword1, Keyword2, ...",
                             value:app.user.org.tags}]]]];
        buttons = [["button", {type:"button", id:"updorgbutton",
                               onclick:jt.fs("app.dlg.updorg()")},
                    "Ok"]];
        return {html:html, buttons:buttons};
    }


    function editOrganization (mode) {
        var html, content;
        mode = mode || "details";
        if(mode === "members") {
            content = orgEditMembersContent(); }
        else {
            content = orgEditDetailsContent(); }
        html = [["div", {id:"dlgtitlediv"},
                 [["a", {href:"#back", onclick:jt.fs("app.dlg.back()")},
                   ["img", {src:"img/backward.png", cla:"dlgbackimg"}]],
                  "Organization"]],
                ["div", {cla:"dlgsignindiv", id:"orgecdiv"},
                 content.html],
                ["div", {id:"loginstatdiv"}],
                ["div", {id:"dlgbuttondiv"},
                 content.buttons]];
        displayDialog(null, jt.tac2html(html));
        dlgstack.push(app.dlg.myacc);
        disableFieldsIfNotOrgAdmin();
        showOrgMembers();
    }


    function updateOrganization () {
        var data = readInputFieldValues(
            ["namein", "codein", "contacturlin", "projecturlin", "regionsin", 
             "categoriesin", "tagsin"],
            [null,     "none",   "none",         "none",         "none",
             "none", "none"]);
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


    function myAccount () {
        var html;
        html = [["div", {id:"dlgtitlediv"},
                 [["a", {href:"#back", onclick:jt.fs("app.dlg.back()")},
                   ["img", {src:"img/backward.png", cla:"dlgbackimg"}]],
                  "Account"]],
                ["div", {cla:"dlgsignindiv"},
                 [["div", {cla:"dlgformline"},
                   ["em",
                    "Private information:"]],
                  ["div", {cla:"dlgformline"},
                   [["label", {fo:"updemailin", cla:"liflab", 
                               id:"labupdemailin"},
                     "Email"],
                    ["input", {type:"text", cla:"lifin",
                               name:"updemailin", id:"updemailin",
                               value:app.user.email}]]],
                  ["div", {cla:"dlgformline"},
                   [["label", {fo:"updpasswordin", cla:"liflab", 
                               id:"labupdpasswordin"},
                     "Password"],
                    ["input", {type:"password", cla:"lifin",
                               name:"updpasswordin", id:"updpasswordin"}]]],
                  ["div", {cla:"dlgformline", id:"orglinkdiv"}],
                  ["div", {cla:"dlgformline"},
                   ["em",
                    "Public information:"]],
                  ["div", {cla:"dlgformline"},
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
        setFocus("namein");
        if(app.db.getOrgId(app.user.acc)) {
            showOrgLink(); }
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
            jt.byId("updaccbutton").disabled = true;
            jt.call("POST", "updacc?" + app.auth(), inputsToParams(data),
                    function (result) {
                        app.db.deserialize("AppUser", result[0]);
                        app.user.acc = result[0];
                        app.dlg.close();
                        popBack(app.db.nextInteraction); },
                    function (code, errtxt) {
                        jt.log("updateAccount " + code + ": " + errtxt);
                        jt.out("loginstatdiv", errtxt); },
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
                        if(bg) {  //Background mode, leave UI/flow alone.
                            return; }
                        app.dlg.close();
                        app.linear.display(); },
                    function (code, errtxt) {
                        jt.log("processSignIn: " + code + " " + errtxt);
                        setTimeout(function () {
                            if(!app.domfield("cbnewacc", "checked")) {
                                jt.out("loginstatdiv", errtxt); } }, 200); },
                    jt.semaphore("dlg.processSignIn")); }
    }


    function processSignOut () {
        jt.cookie(cookname, "", -1);
        //while it seems a bit wasteful to go back to the server to fetch
        //the timeline again, it's important to nuke all context.
        app.init2();
    }


    function checkCookieSignIn (bg) {
        var cval = jt.cookie(cookname);
        jt.log("cookie " + cookname + ": " + cval);
        if(cval) {
            cval = cval.split(cookdelim);
            processSignIn({emailin:cval[0].replace("%40", "@"),
                           authtok:cval[1]}, bg); }
    }


    function displayEmailSent (emaddr) {
        var html;
        html = ["div", {id:"passemdiv"},
                [["p", "Your password has been emailed to " + emaddr +
                 " and should arrive in a few minutes.  If it doesn't" +
                 " show up, please"],
                ["ol",
                 [["li", "Make sure your email address is spelled correctly"],
                  ["li", "Check your spam folder"],
                  ["li", "Confirm the email address you entered is the same" +
                        " one you used when you created your account."]]],
                ["div", {id: "dlgbuttondiv"},
                 ["button", {type: "button", id: "okbutton",
                             onclick: jt.fs("app.dlg.close()")},
                  "Ok"]]]];
        displayDialog(null, jt.tac2html(html));
    }


    function forgotPassword () {
        var cred = readInputFieldValues(["emailin"]);
        if(!cred || !jt.isProbablyEmail(cred.emailin)) {
            jt.out("loginstatdiv", "Please fill in your email address...");
            return; }
        jt.call("POST", "mailcred", inputsToParams(cred),
                function () {
                    jt.out("loginstatdiv", "");
                    displayEmailSent(cred.emailin); },
                function (code, errtxt) {
                    jt.log("mailcred call failed " + code + " " + errtxt);
                    jt.out("loginstatdiv", "mail send failed: " + errtxt); },
                jt.semaphore("forgotPassword"));
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
        setFocus("emailin");
    }


    function showSignInToSaveDialog () {
        var html;
        html = [["div", {id:"dlgtitlediv"}, "Save Progress"],
                ["div", {cla:"dlgsignindiv"},
                 ["div", {cla:"dlgformline"},
                  "Sign in to keep your progress."]],
                ["div", {id:"dlgbuttondiv"},
                 [["button", {type:"button", id:"skipbutton",
                              onclick:jt.fs("app.dlg.contnosave()")},
                   "Skip"],
                  " &nbsp; ",
                  ["button", {type:"button", id:"signinbutton",
                              onclick:jt.fs("app.dlg.signin()")},
                   "Sign In"]]]];
        displayDialog(null, jt.tac2html(html));
        setFocus("signinbutton");
        dlgstack.push(app.dlg.saveprog);
    }


    function continueToNext () {
        if(jt.byId("savestatspan")) {
            jt.out("savestatspan", "Continuing..."); }
        tl.pendingSaves = 0;
        nextColorTheme();
        app.dlg.close();
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
        jt.call("POST", "updacc?" + app.auth(), data,
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


    function textInputTAC (fs, mode, vo) {
        var inid, label, html;
        if(mode === "list") {
            return ["div", {cla:"fldvaldiv"}, vo[fs.field]]; }
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


    function largeTextInputTAC (fs, mode, vo) {
        var html;
        if(mode === "list") {
            return ["div", {cla:"fldvaldiv"}, vo[fs.field]]; }
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
        var i, count, inel, val, txts = [];
        for(i = 0; i < 50; i += 1) {
            count = i + 1;
            inel = jt.byId(field + count + "in");
            if(!inel) {  //no more text inputs found
                break; }
            val = inel.value.trim();
            if(val) {
                txts.push(val); } }
        editpt[field] = txts;
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
                obj[fspec.field] = jt.byId(fspec.field + "ta").value;
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
            case "txtlst":
                readTextListInputFields(fspec.field);
                obj[fspec.field] = editpt[fspec.field];
                break;
            default: jt.err("formValuesToObject unknown fspec " + fspec); } });
        return obj;
    }


    function codeselchg () {
        var pt;
        if(jt.byId("codeshin")) {
            pt = formValuesToObject(edptflds);
            jt.byId("codeshin").value = pt.codes; }
    }


    function codeselInputTAC (fs, mode, vo) {
        var inid, selopts, html = [];
        if(mode === "list") {
            fs.options.forEach(function (opt) {
                if(vo && vo[fs.field] && vo[fs.field].indexOf(opt.value) >= 0) {
                    html.push(["div", {cla:"buttonptcodesdiv"}, 
                               opt.text]); } });
            return html; }
        inid = fs.field + "sel";
        selopts = {id:inid, onchange:jt.fs("app.dlg.codeselchg()")};
        if(fs.multiple) {
            selopts.multiple = true; }
        fs.options.forEach(function (opt, idx) {
            var oao = {value:opt.value, id:fs.field + "opt" + idx};
            if(vo && vo[fs.field] && vo[fs.field].indexOf(opt.value) >= 0) {
                oao.selected = "selected"; }
            html.push(["option", oao, opt.text]); });
        html = [["div", {cla:"dlgformline"},
                 [["label", {fo:inid, cla:"liflab", id:"lab" + inid},
                   fs.label || fs.field.capitalize()],
                  ["select", selopts, html]]],
                ["input", {type:"hidden", id:"codeshin", name:"codes",
                           value:vo.codes}]];  //updated in codeselchg
        return html;
    }


    function imageInputTAC (fs, mode, vo) {
        var src, html;
        src = (vo && vo[fs.field]) || "";
        if(src) {
            src = "/ptpic?pointid=" + src; }
        else {
            src = "/img/picplaceholder.png"; }
        if(mode === "list") {
            return ["div", {cla:"fldvaldiv"}, 
                    ["img", {src:src, cla:"txtpicimg"}]]; }
        html = ["div", {cla:"dlgformline", style:"text-align:center;"},
                [["input", {type:"file", id:fs.field + "in", name:fs.field}],
                 ["img", {src:src, cla:"txtpicimg"}]]];
        return html;
    }


    function textListEditContentTAC (fs, txts) {
        var html = [], fname = fs.pname || fs.field.capitalize();
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
        var html, txts = pt[fs.field] || [];
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
        case "codesel": return codeselInputTAC(fspec, mode, pt);
        case "image": return imageInputTAC(fspec, mode, pt);
        case "txtlst": return textListInputTAC(fspec, mode, pt);
        default: jt.log("fieldTAC unknown fspec " + fspec); }
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
        html = [
            ["div", {id:"dlgdatediv"}, "Edit Point"],
            ["div", {id:"dlgcontentdiv"},
             ["form", {action:"/updpt", method:"post", id:"editpointform", 
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
                           src:"/updpt", style:"display:none"}]]]],
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
        //Only compare fields included in the tl.preb instance data or the
        //separately fetched point will always be different.  Could probably
        //get by just comparing the modified time, but may as well be
        //comprehensive for now.
        var ptflds = ["date", "text", "codes", "orgid", "keywords",
                      "source", "refs", "modified"];
        return !ptflds.every(function (fld) { return pt[fld] === dbpt[fld]; });
    }


    function noteUpdatedPoint (pt) {
        app.db.mergeUpdatedPointData(pt);
        app.dbpts[pt.instid] = pt;
        app.tabular.redispt(pt);
    }


    function fetchPointFromServer (ptid, contf) {
        var url;
        jt.out("editlink" + ptid, "fetching point data...");
        app.dbpts = app.dbpts || {};
        url = "ptdat?" + app.auth() + "&pointid=" + ptid + 
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
            jt.out("editlink" + pt.instid, "[edit updated point]");
            return; }  //click updated link to edit updated point
        editLoadedPoint(pt);
    }


    function monitorPointUpdateSubmit () {
        var seconds, subframe, fc, txt, ptid,
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
                    app.dlg.close();
                    fetchPointFromServer(ptid, noteUpdatedPoint);
                    return; }
                if(txt.indexOf(errpre) >= 0) {
                    txt = txt.slice(txt.indexOf(errpre) + errpre.length);
                    jt.out("updatestatdiv", txt);  //display error
                    fc.body.innerHTML = "Reset.";  //reset status iframe
                    jt.byId("savebutton").disabled = false;
                    jt.out("savebutton", "Save");
                    return; } } }
        setTimeout(monitorPointUpdateSubmit, 100);
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


    function ptsubclick () {
        var subobj, i, fs, nopictxt, picin;
        subobj = makePointFormSubmitObject();
        jt.out("updatestatdiv", "");
        for(i = 0; i < edptflds.length; i += 1) {
            fs = edptflds[i];
            if(fs.reqd && !subobj[fs.field]) {
                jt.out("updatestatdiv", fs.reqd);
                if(fs.layout === "detail") {
                    app.dlg.togptdet("detail", true); }
                return;  } }
        nopictxt = "Uploading a public domain picture for your point will give it more impact and help people remember it. Are you sure you want to save without a pic?";
        picin = jt.byId("picin");
        if(picin && !picin.value && editpt && !editpt.instid && !editpt.pic && 
           !confirm(nopictxt)) {
            app.dlg.togptdet("pic", true);
            return; }
        jt.byId("refshin").value = subobj.refs;
        disablePointEditButtons();
        jt.out("savebutton", "Saving...");
        upldmon = {count:0};
        setTimeout(monitorPointUpdateSubmit, 100);
        jt.byId("editpointform").submit();
    }


    function ptdelclick () {
        var subobj, vertext;
        vertext = "Timelines with this point will still have the data available until they are next edited.  Are you sure you want to delete this point?";
        if(!confirm(vertext)) {
            return; }
        subobj = makePointFormSubmitObject();
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
        var qstr = tl.dlgdat.text.split(" ").slice(0, 10).join("+"),
            url = "https://duckduckgo.com/?q=" + qstr;
        window.open(url);
    }


    return {
        init: function (timeline) { tl = timeline; },
        start: function (t, s, f) { showStartDialog(t, s, f); },
        info: function (d, inter) { showInfoDialog(d, inter); },
        show: function (html) { displayDialog(null, html); },
        close: function (mode) { closeDialog(mode); },
        verifyClosed: function () { verifyClosed(); },
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
        ptdelclick: function () { ptdelclick(); },
        togfdesc: function (field, desc) { toggleFieldDesc(field, desc); },
        codeselchg: function () { codeselchg(); },
        editorg: function (mode) { editOrganization(mode); },
        updorg: function () { updateOrganization(); },
        omexp: function (instid) { expandOrganizationMember(instid); },
        modmem: function (instid, chg) { modifyMemberLevel(instid, chg); },
        addmem: function () { addOrgMemberByEmail(); },
        togptdet: function (sect, req) { togglePointDetailSection(sect, req); },
        addtxt: function (field) { addTextListElement(field); },
        search: function () { searchForPoint(); },
        refsListHTML: function (refs) { return refsListHTML(refs); }
    };
}());
