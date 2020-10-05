/*jslint browser, white, fudge, for, long */
/*global app, window, jt, d3, alert */

app.tabular = (function () {
    "use strict";

    //options is a [] {value, text, selected, group}.  If group changes
    function makeSelect (domid, onchangestr, options) {
        var spec = {id:domid, chgstr:onchangestr, opts:options};
        return {
            ctrlHTML: function () {
                var st = {html:[], group:"", gopts:null};
                spec.opts.forEach(function (opt) {
                    var attributes = {value:opt.value, id:"opt" + opt.value};
                    if(opt.selected) {
                        attributes.selected = "selected"; }
                    if(opt.group) {  //push option into optgroup
                        if(opt.group !== st.group) {  //create new optgroup
                            st.group = opt.group;
                            st.gopts = [];
                            st.html.push(["optgroup", {label:opt.group},
                                          st.gopts]); }
                        st.gopts.push(["option", attributes, 
                                       opt.text || opt.value]); }
                    else {  //not grouped option
                        st.html.push(["option", attributes,
                                      opt.text || opt.value]); } });
                return jt.tac2html(["select", {name:spec.id, id:spec.id,
                                               onchange:spec.chgstr},
                                    st.html]); },
            setValue: function (val) {
                jt.byId(spec.id).value = val; },
            getValue: function () {
                var val = ""; var sel = jt.byId(spec.id);
                if(sel) {  //display might not be ready yet
                    val = sel.options[sel.selectedIndex].value; }
                return val; },
            domid: function () { return spec.id; } };
    }


    // function pointTotals (tl) {
    //     var sum = {pts:0, words:0, minutes:0}; var ids;
    //     if(tl.cids && tl.cids.length) {
    //         //as points are added or removed, only cids field is updated
    //         ids = tl.cids.split(",");
    //         sum.pts = ids.length;
    //         ids.forEach(function (ptid) {
    //             var pt = app.db.pt4id(ptid, tl.points);
    //             if(pt) {
    //                 sum.words += pt.text.split(" ").length; } }); }
    //     //People read english out loud at around ~200 wpm.  Point text is
    //     //fairly dense.  Figure about 4 seconds for button press.
    //     sum.minutes = Math.round(sum.words / 180) + 
    //         Math.round(sum.pts * 4 / 60);
    //     return sum;
    // }


    // function pointsTotalSummary (tl) {
    //     var ts = {pts:0, words:0, minutes:0}; var tls = [];
    //     if(tl.ctype === "Timelines" && tl.cids) {
    //         tl.cids.split(",").forEach(function (tlid) {
    //             tls.push(app.user.tls[tlid]); }); }
    //     else {
    //         tls.push(tl); }
    //     tls.forEach(function (ct) {
    //         var sum = pointTotals(ct);
    //         ts.pts += sum.pts;
    //         ts.words += sum.words;
    //         ts.minutes += sum.minutes; });
    //     return "pts: " + ts.pts + ", words: " + ts.words + ", ~" + 
    //         ts.minutes + " mins";
    // }


    // function notePointScrollPosition () {
    //     var outdiv = jt.byId("pointsdispdiv");
    //     if(!outdiv) {
    //         return; }
    //     ptflds.scrollpcnt = outdiv.scrollTop / outdiv.scrollHeight;
    //     //jt.log("notePointScrollPosition " + ptflds.scrollpcnt);
    // }


    // function restorePointScrollPosition () {
    //     var outdiv = jt.byId("pointsdispdiv");
    //     if(!outdiv) {
    //         return; }
    //     outdiv.scrollTop = Math.round(ptflds.scrollpcnt * outdiv.scrollHeight);
    //     //jt.log("restorePointScrollPosition " + outdiv.scrollTop);
    // }


    function mdfs (mgrfname, ...args) {
        var pstr = app.paramstr(args);
        mgrfname = mgrfname.split(".");
        var fstr = "app.tabular.managerDispatch('" + mgrfname[0] + "','" +
            mgrfname[1] + "'" + pstr + ")";
        if(pstr !== ",event") {  //don't return false from event hooks
            fstr = jt.fs(fstr); }
        return fstr;
    }


    function uifoc (domid) {
        setTimeout(function () {
            var focelem = jt.byId(domid);
            if(!focelem) {
                jt.log("uifoc " + domid + " dom element not found"); }
            else {
                jt.log("uifoc " + domid);
                focelem.focus(); }}, 200);
    }


    var acckwsrc = (function () {
        var fu = {communities:"community", regions:"region", 
                  categories:"category", tags:"tag"};
    return {
        getKeywords: function (fldname) {
            return jt.saferef(
                app, "user.?acc.?settings.?keywords.?" + fu[fldname]) || ""; },
        updateKeywords: function (fldname, kwds) {
            var acc = app.user.acc;
            var added = false;
            acc.settings = acc.settings || {};
            acc.settings.keywords = acc.settings.keywords || {};
            var sks = acc.settings.keywords[fu[fldname]] || "";
            kwds.csvarray().forEach(function (kw) {
                if(!sks.csvcontains(kw)) {
                    added = true;
                    sks = sks.csvappend(kw); } });
            if(added) {
                acc.settings.keywords[fu[fldname]] = sks;
                app.dlg.saveAccountSettings(); } }
        };
    }());


    //General container for all managers, used for dispatch
    var mgrs = {};


    function makeCSVManager (fldname, placeholder, keywordsource) {
        mgrs[fldname] = (function () {
            var fld = fldname;
            var plh = placeholder;
            var kwsrc = keywordsource || acckwsrc;
        return {
            getHTML: function (inst, sp) {
                if(sp.mode === "read") {  //other mode option is "edit"
                    return mgrs[fld].getReadHTML(inst, sp); }
                return mgrs[fld].getEditHTML(inst, sp); },
            getReadHTML: function (inst) {
                if(!inst[fld]) { return ""; }
                var divattrs = {cla:"csvmgrdiv"};
                mgrs.place.makeTogglable(divattrs, inst.dsId);
                return jt.tac2html(
                    ["div", divattrs,
                     [["span", {cla:"ptdetlabelspan"},
                       fld.capitalize() + ": "],
                      ["span", {cla:"ptdetvaluespan"},
                       inst[fld].replace(/,/g, ", ")]]]); },
            getEditHTML: function (inst) {
                if(!inst[fld] && !plh) { return ""; }
                var divid = "csvmgr" + inst.dsId + fld;
                return jt.tac2html(
                    ["div", {cla:"csvmgrdiv", id:divid + "div"},
                     [["span", {cla:"ptdetlabelspan"},
                       fld.capitalize() + ": "],
                      ["div", {cla:"edcsvdiv", id:divid + "valsdiv"},
                       mgrs[fld].edLinesHTML(inst.dsId, inst[fld])]]]); },
            edLinesHTML: function (instid, csv) {
                csv = csv || "";
                var kwds = csv.csvarray();
                kwds.push("");  //new keyword input
                return jt.tac2html(kwds.map(function (kwd, idx) {
                    var divid = "ed" + instid + fld + "valdiv" + idx;
                    return ["div", {cla:"edcsval", id:divid},
                            [["input", {type:"text", id:divid + "in",
                                        size:14, placeholder:plh,
                                        onchange:mdfs(fld + ".kwchg",
                                                      instid, idx),
                                        list:divid + "dl", value:kwd}],
                             ["datalist", {id:divid + "dl"},
                              mgrs[fld].kwoptionsTAC()]]]; })); },
            kwoptionsTAC: function () {
                return kwsrc.getKeywords(fld).csvarray().map(function (sk) {
                    return ["option", {value:sk}]; }); },
            kwchg: function (instid, idx) {
                var csv = mgrs[fld].getUIKeywords(instid);
                jt.out("csvmgr" + instid + fld + "valsdiv",
                       mgrs[fld].edLinesHTML(instid, csv));
                mgrs.help.checkForChanges(instid);
                uifoc("ed" + instid + fld + "valdiv" + (idx + 1) + "in"); },
            getUIKeywords: function (instid) {
                var parent = jt.byId("csvmgr" + instid + fld + "valsdiv");
                if(!parent) { return ""; }
                var kwds = ""; var i; var divid; var val;
                for(i = 0; i < parent.childNodes.length; i += 1) {
                    divid = "ed" + instid + fld + "valdiv" + i + "in";
                    val = jt.byId(divid).value.trim();
                    if(!kwds.csvcontains(val)) {
                        kwds = kwds.csvappend(val); } }
                return kwds; },
            appendChangedValue: function (ptd, pt) {
                var kwds = mgrs[fld].getUIKeywords(pt.dsId);
                if(kwds !== pt[fld]) {
                    kwsrc.updateKeywords(fld, kwds);
                    ptd[fld] = kwds; } }
            };
        }());
        return mgrs[fldname];
    }


    //Aggregation Manager handles which points are available for display.
    mgrs.agg = (function () {
        var state =  {tombstones:{}};
    return {
        getState: function () { return state; },
        init: function (mode) {
            //account status is private info so stripped from user.acc
            if(mode === "tledit" && app.user.status !== "Active") {
                jt.err("You need to activate your account before editing a timeline. Click the link sent to you in the account activation email.");
                mode = "refdisp"; }
            state.mode = mode;
            if(mode === "tledit") {
                jt.out("reftitlediv", jt.tac2html(
                    [["div", {cla:"tletldiv"}, "Edit Timeline"],
                     ["div", {cla:"tletrdiv"}, "Mix-In"]])); }
            else { //"refdisp"
                jt.out("reftitlediv", "Reference Mode"); }
            return state.mode; },
        urlTimeline: function () {
            return app.db.displayContext().lastTL; },
        getTLName: function (tlid) {
            var tl = app.refmgr.cached("Timeline", tlid);
            if(tl) { return tl.name; }
            if(state.tombstones[tlid]) {
                return tlid + " not retrievable"; }
            app.refmgr.getFull("Timeline", tlid, function (tl) {
                if(!tl) {
                    state.tombstones[tlid] = "getTLName"; }
                mgrs.agg.updateControls();
                mgrs.agg.tlchg(); });
            return tlid; },  //use the id as the name until retrieved
        getGrouping: function (tl) {
            switch(tl.featured) {
            case "Unlisted": return "Unlisted";
            case "Archived": return "Archived";
            case "Deleted": return "Deleted";
            default: return "Listed"; } },
        isEditableTL: function (tl) {
            return tl.editors && app.user.acc && 
                tl.editors.csvcontains(app.user.acc.dsId); },
        mergeKnownTLs: function (tls, ovrs) {
            ovrs = ovrs || {};
            state.knownTLs = state.knownTLs || {};
            if(!Array.isArray(tls)) {
                if(tls && Object.keys(tls).length) { tls = [tls]; }
                else { tls = []; } }
            tls.forEach(function (tl) {
                tl.dsType = "Timeline";
                tl.dsId = tl.dsId || tl.tlid;
                state.knownTLs[tl.dsId] = {
                    tlid:tl.dsId,
                    name:tl.name || mgrs.agg.getTLName(tl.dsId),
                    group:ovrs.group || mgrs.agg.getGrouping(tl),
                    edit:ovrs.editable || mgrs.agg.isEditableTL(tl)};
                if(state.knownTLs[tl.dsId].group === "Deleted") {
                    delete state.knownTLs[tl.dsId]; } }); },
        collectKnownTimelines: function () {
            if(app.user.acc) {
                //same timeline may be in more than one place, do editable last
                var accflds = ["started", "completed", "remtls", "built"];
                accflds.forEach(function (fld) {
                    if(!Array.isArray(app.user.acc[fld])) {
                        app.user.acc[fld] = []; }
                    mgrs.agg.mergeKnownTLs(
                        app.user.acc[fld], {editable:(fld === "built")}); }); }
            if(!state.ftls) {  //featured timelines not available yet
                state.ftls = [];  //continue with none for now
                app.mode.featuredTimelines(function (tls) {
                    state.ftls = tls;
                    mgrs.agg.updateControls();
                    mgrs.agg.tlchg(); }); }
            mgrs.agg.mergeKnownTLs(state.ftls, {group:"Featured"});
            mgrs.agg.mergeKnownTLs(mgrs.agg.urlTimeline(), 
                                      {group:"Current"});
            state.sktls = Object.values(state.knownTLs);
            var so = ["Current", "Featured", "Listed", "Unlisted", "Archived"];
            state.sktls.sort(function (a, b) {
                return so.indexOf(a.group) - so.indexOf(b.group); }); },
        makeTimelineSelector: function (sid, editable) {
            var opts = [];
            if(editable) {
                opts.push({value:"new", text:"New Timeline"}); }
            else {  //mix-in
                opts.push({value:"none", text:"None"}); }
            state.sktls.forEach(function (ktl) {
                if((editable && ktl.edit) ||
                   (!editable && ktl.tlid !== state.edsel.getValue())) {
                    opts.push({value:ktl.tlid, text:ktl.name,
                               group:ktl.group}); } });
            state[sid] = makeSelect(sid, mdfs("agg.tlchg", sid),
                                           opts); },
        //The controls are updated on initial display, then potentially
        //again after the current timeline is loaded, and again after the
        //featured timelines are loaded.  Also after a timeline is saved.
        updateControls: function () {
            if(state.mode === "tledit") {
                mgrs.agg.collectKnownTimelines();
                mgrs.agg.makeTimelineSelector("edsel", "edit");
                mgrs.agg.makeTimelineSelector("mixsel");
                if(!jt.byId("tletldiv")) {
                    jt.out("aggctrlsdiv", jt.tac2html(
                        [["div", {cla:"tletldiv", id:"tletldiv"}],
                         ["div", {cla:"tletrdiv", id:"tletrdiv"}],
                         ["div", {id:"tlsettingsdiv"}]])); }
                jt.out("tletldiv", jt.tac2html(
                    [state.edsel.ctrlHTML(),
                     mgrs.stg.ctrlHTML()]));
                jt.out("tletrdiv", jt.tac2html(
                    state.mixsel.ctrlHTML()));
                mgrs.agg.setControlValues(); }
            mgrs.filt.updateControls(); },
        rememberControlValues: function () {
            Object.keys(state.ctrvs).forEach(function (key) {
                if(state[key]) {  //have select control
                    state.ctrvs[key] = state[key].getValue(); }
            }); },
        setControlValues: function () {
            state.ctrvs = state.ctrvs || {edsel:"", mixsel:""};
            Object.keys(state.ctrvs).forEach(function (key) {
                if(state.ctrvs[key]) {
                    state[key].setValue(state.ctrvs[key]); } });
            if(!state.ctrvs.edsel) {  //no previous choice, pick default
                var tl = mgrs.agg.urlTimeline();
                if(mgrs.agg.isEditableTL(tl)) {
                    return state.edsel.setValue(tl.dsId); }
                tl = null;
                app.user.acc.built.forEach(function (btl) {
                    if(!tl || tl.modified < btl.modified) {
                        tl = btl; } });
                if(tl) {
                    state.edsel.setValue(tl.tlid); } } },
        tlchg: function (src) {
            if(src === "edsel") {  //new timeline selected for editing
                mgrs.agg.makeTimelineSelector("mixsel");  //rebuild
                jt.out("tletrdiv", jt.tac2html(
                    state.mixsel.ctrlHTML()));
                mgrs.stg.toggleSettings("open"); }  //rebuild settings
            mgrs.agg.rebuildPoints();
            mgrs.filt.updateControls();
            mgrs.disp.displayPoints(mgrs.filt.filterPoints());
            mgrs.stg.setFocus(); },
        getPoints: function () {
            if(!state.points) {
                mgrs.agg.rebuildPoints(); }
            return state.points; },
        mergePoints: function (sel) {
            var tlid = sel.getValue();
            if(Number(tlid)) {
                var tl = app.refmgr.cached("Timeline", tlid);
                if(tl) {
                    tl.preb.forEach(function (pt) {
                        if(!state.kpts[pt.dsId]) {  //not a dupe
                            //make a copy we can tag without affecting src tl
                            pt = JSON.parse(JSON.stringify(pt));
                            state.kpts[pt.dsId] = pt;
                            state.points.push(pt); } });
                    return; }
                if(state.tombstones[tlid]) { return; }
                app.refmgr.getFull("Timeline", tlid, function (tl) {
                    if(!tl) {
                        state.tombstones[tlid] = "mergePoints"; }
                    mgrs.agg.tlchg(sel.domid()); }); } },
        rebuildPoints: function () {
            if(state.mode !== "tledit") {
                state.points = mgrs.agg.urlTimeline().preb; }
            else {
                state.kpts = {};    //known preb points by dsId (avoids dupes)
                state.points = [];  //sortable working set of points
                mgrs.agg.mergePoints(state.edsel);
                mgrs.agg.noteMixinPoints(state.edsel.getValue());
                mgrs.agg.mergePoints(state.mixsel);
                mgrs.agg.sortPoints(); } },
        noteMixinPoints: function (tlid) {
            state.points.forEach(function (pt) {
                if(pt.srctl !== tlid) {
                    pt.mixin = true; } }); },
        sortPoints: function () {
            state.points.forEach(function (pt) {
                if(!pt.start) { app.db.parseDate(pt); } });
            state.points.sort(function (a, b) {
                return ((a.start.year - b.start.year) ||
                        (a.start.month - b.start.month) ||
                        (a.start.day - b.start.day)); }); },
        currTL: function (tsel) {
            switch(tsel) {
            case "edit": tsel = state.edsel.getValue; break;
            case "mix": tsel = state.mixsel.getValue; break;
            default: tsel = mgrs.agg.urlTimeline; }
            var tlid = tsel();
            if(Number(tlid)) {
                return app.refmgr.cached("Timeline", tlid); }
            return {dsType:"Timeline", dsId:tlid, editors:"", name:"",
                    slug:"", title:"", subtitle:"", featured:"Unlisted",
                    lang:"en-US", comment:"", about:"", kwds:"",
                    ctype:"Points", cids:"", rempts:"", svs:"", preb:[]}; },
        resolvePoint: function (pt, defltpt) {
            if(!pt) { return defltpt || null; }
            if(typeof pt === "string") {
                pt = state.points.find((tp) => pt === tp.dsId); }
            return pt; },
        addOrUpdatePoint: function (upd) {
            var pts = state.points.filter((pt) => pt.dsId !== upd.dsId);
            pts.push(upd);
            state.points = pts;
            mgrs.agg.sortPoints(); }
        };
    }());


    //Featured field entry manager
    mgrs.feat = (function () {
        var fos = [
            {t:"Unlisted", h:"Not featured in any general timeline listing."},
            {t:"Listed", h:"Ok to recommend to all users."},
            {t:"Obs M/D", h:"Promote annually around the date."},
            {t:"Obs M/W", h: "Promote annually by day of week in month."},
            {t:"Promoted", h:"Promote before Listed but after annuals."},
            {t:"Archived", h:"Unlisted, and sorted below general Unlisted."},
            {t:"Deleted", h:"Not shown, server data eventually cleared."}];
        var sels = {
            feat: {sel:null},
            month: {vals:{"-01":"Jan", "-02":"Feb", "-03":"Mar", "-04":"Apr",
                          "-05":"May", "-06":"Jun", "-07":"Jul", "-08":"Aug",
                          "-09":"Sep", "-10":"Oct", "-11":"Nov", "-12":"Dec"}},
            week: {vals:{"-W1":"1st", "-W2":"2nd", "-W3":"3rd",
                         "-W4":"4th"}},
            day: {vals: {"-D0":"Sun", "-D1":"Mon", "-D2":"Tue", "-D3":"Wed",
                         "-D4":"Thu", "-D5":"Fri", "-D6":"Sat"}}};
        var value = "Unlisted";
    return {
        initSelectors: function (tl) {
            Object.keys(sels).forEach(function (selkey) {
                var opts;
                if(selkey === "feat") {
                    opts = fos.map(function (fo) {
                        return {value:fo.t, text:fo.t,
                                selected:(tl && tl.featured === fo.t)}; }); }
                else {
                    opts = Object.entries(sels[selkey].vals)
                        .map(function ([code, disp]) {
                            return {value:code, text:disp}; }); }
                sels[selkey].sel = makeSelect(
                    selkey, mdfs("feat.featselChange"), opts); });
            value = "Unlisted";  //reset
            if(tl && tl.featured) {
                value = tl.featured; } },  //start with same value so no change
        getHTML: function (tl) {
            if(tl && !tl.featured) { tl.featured = "Unlisted"; }
            mgrs.feat.initSelectors(tl);  //rebuild in case tl changed
            return jt.tac2html(
                [["span", {id:"featselspan"}, sels.feat.sel.ctrlHTML()],
                 " ",  //break here if line too long
                 ["span", {id:"f2selspan"}]]); },
        verifyMonthDateVisible: function () {
            if(!jt.byId("datein")) {  //need to rebuild controls
                jt.out("f2selspan", jt.tac2html(
                    [sels.month.sel.ctrlHTML(),
                     ["input", {type:"number", id:"datein", value:1,
                                min:1, max:31}]])); } },
        verifyMonthWeekVisible: function () {
            if(!jt.byId("week")) {  //need to rebuild controls
                jt.out("f2selspan", jt.tac2html(
                    [sels.week.sel.ctrlHTML(),
                     sels.day.sel.ctrlHTML(),
                     sels.month.sel.ctrlHTML()])); } },
        setMonthDate: function (val) {
            var result = "";
            var match = val.match(/(-\d\d)-(\d\d)/);
            if(match) {
                mgrs.feat.verifyMonthDateVisible();
                sels.month.sel.setValue(
                    sels.month.vals[match[1]]);
                jt.byId("datein").value = Number(match[2]);
                result = "Obs M/D"; }
            return result; },
        setMonthWeek: function (val) {
            var result = "";
            var match = val.match(/(-\d\d)(-W\d)(-D\d)/);
            if(match) {
                mgrs.feat.verifyMonthWeekVisible();
                var selnames = ["month", "week", "day"];
                selnames.forEach(function (selname, idx) {
                    sels[selname].setValue(
                        sels[selname].vals[match[idx + 1]]); });
                result = "Obs M/W"; }
            return result; },
        setValue: function (val) {
            val = val || "Unlisted";
            value = (mgrs.feat.setMonthDate(val) || 
                             mgrs.feat.setMonthWeek(val) || val);
            mgrs.feat.updateHelp(); },
        getValue: function () {
            return value; },  //updated by featselChange
        featselChange: function () {
            value = sels.feat.sel.getValue();
            if(value === "Obs M/D") {
                mgrs.feat.verifyMonthDateVisible();
                var din = String(jt.byId("datein").value);
                if(din.length < 2) {
                    din = "0" + din; }
                value = sels.month.sel.getValue() + "-" + din; }
            else if(value === "Obs M/W") {
                mgrs.feat.verifyMonthWeekVisible();
                var selnames = ["month", "week", "day"];
                value = selnames.reduce(function (acc, sn) {
                    return acc + sels[sn].sel.getValue(); }, ""); }
            else {
                jt.out("f2selspan", ""); }
            mgrs.feat.updateHelp();
            mgrs.stg.checkForDataChanges(); },
        updateHelp: function () {
            var type = sels.feat.sel.getValue() || "Unlisted";
            var fd = fos.find((fd) => fd.t === type);
            jt.out("tlsfhdivfeatured", fd.h); }
        };
    }());


    //Text field entry manager
    mgrs.tf = {
        getHTML: function (tl, fld) {
            var val = "";
            if(tl) {  //may not be available if still fetching data
                val = tl[fld];
                if(fld === "name" && tl.name === "new") {
                    val = ""; } }
            var hfl = mdfs("tf.helpFocusListener", "event");
            var attrs = {cla:"tlsetfldvaldiv", id:"tlsfvd" + fld,
                         contentEditable:"true", "data-fld":fld,
                         onfocus:hfl, onblur:hfl};
            return jt.tac2html(["div", attrs, val]); },
        helpFocusListener: function (event) {
            //MacFF80.0.1 A blur triggered by a point switching to edit mode
            //must be handled very quickly, and side effects handled much
            //later, or it will blow off point focus handling.
            setTimeout(function () { 
                mgrs.tf.focusChange(event.type, event.target.dataset.fld); },
                       200); },
        focusChange: function (ftype, fld) {
            //jt.log("mgrs.tf.focusChange " + ftype + " " + fld);
            if(ftype === "blur") {
                jt.out("tlsfhdiv" + fld, "");
                if(mgrs.stg.getFDefs()[fld].si) {  //incremental save field
                    setTimeout(function () {
                        var fvold = mgrs.agg.currTL("edit")[fld] || "";
                        if(fld === "name" && fvold === "new") {
                            fvold = ""; }
                        var fvin = jt.byId("tlsfvd" + fld);
                        if(!fvin) { return; }
                        var fvnew = fvin.innerText.trim();
                        if(fvold !== fvnew) {
                            mgrs.stg.save("interim"); } }, 100); } }
            else if(ftype === "focus") {
                jt.out("tlsfhdiv" + fld, mgrs.stg.getFDefs()[fld].h); }
            setTimeout(mgrs.stg.checkForDataChanges, 400); },
        getValue: function (fld) {
            return jt.byId("tlsfvd" + fld).innerText.trim(); }
    };


    mgrs.ellip = {
        getHTML: function () {
            return jt.tac2html(
                ["a", {href:"#timelineactions", title:"Timeline Actions",
                       id:"ellipmenulink",
                       onclick:mdfs("ellip.toggleEllipsisMenu")},
                 "&#x2026;"]); },  //horizontal ellipsis
        toggleEllipsisMenu: function (cmd) {
            var emd = jt.byId("ellipmenudiv");
            if(cmd === "open" || (!cmd && emd.style.display === "none")) {
                emd.style.display = "block";
                jt.byId("ellipmenulink").style.fontWeight = "bold";
                mgrs.ellip.rebuildEllipActions(); }
            else {
                emd.style.display = "none";
                jt.byId("ellipmenulink").style.fontWeight = "normal"; } },
        rebuildEllipActions: function () {
            var mas = [
                {id:"rldtl", tx:"Reload Timeline",
                 ti:"Refetch Timeline from server", cond:true},
                {id:"renkey", tx:"Rename Keyword",
                 ti:"Change keyword name for all points in timeline",
                 cond:(mgrs.srch.getSelectionKeywords().length &&
                       !Number(mgrs.agg.currTL("mix").dsId))}];
            mas = mas.filter((ma) => ma.cond);
            jt.out("ellipmenudiv", jt.tac2html(
                mas.map(function (ma) {
                    return ["div", {cla:"ellipchoicediv"},
                            ["a", {href:"#" + ma.id, title:ma.ti,
                                   onclick:mdfs("ellip." + ma.id)},
                             ma.tx]]; }))); },
        rldtl: function () {
            var tl = mgrs.agg.currTL("edit");
            app.refmgr.uncache("Timeline", tl.dsId);
            app.refmgr.getFull("Timeline", tl.dsId, function () {
                mgrs.agg.tlchg("edsel"); }); },
        renkey: function () {
            jt.out("ellipmenudiv", jt.tac2html(
                [["div", {cla:"subformtitlediv"}, "Rename Keyword"],
                 ["div", {cla:"subformlinediv", id:"renkeyfromdiv"},
                  [["label", {fo:"renkeyfromin", cla:"subformlab"}, "From:"],
                   ["input", {type:"text", id:"renkeyfromin", size:20,
                              placeholder:"Old keyword", value:"",
                              list:"renkeyfromdl"}],
                   ["datalist", {id:"renkeyfromdl"},
                    mgrs.srch.getSelectionKeywords().map(function (kw) {
                        return ["option", {value:kw}]; })]]],
                 ["div", {cla:"subformlinediv", id:"renkeytodiv"},
                  [["label", {fo:"renkeytoin", cla:"subformlab"}, "To:"],
                   ["input", {type:"text", id:"renkeytoin", size:20,
                              placeholder:"New keyword", value:""}]]],
                 ["div", {id:"renkeystatmsgdiv"}],
                 ["div", {id:"renkeyworkdiv", style:"display:none"}],
                 ["div", {cla:"subformbuttonsdiv", id:"renkeybuttonsdiv"},
                  [["button", {type:"button",
                               onclick:mdfs("ellip.toggleEllipsisMenu",
                                            "open")},
                    "Cancel"],
                   ["button", {type:"button",
                               onclick:mdfs("ellip.renameKeyword")},
                    "Rename"]]]])); },
        renameKeyword: function () {
            var kwr = {from:jt.byId("renkeyfromin").value,
                       to:jt.byId("renkeytoin").value, idx:0, repl:0};
            if(!kwr.from || !kwr.to) {
                return jt.out("renkeystatmsgdiv",
                              "From and To keyword values both required."); }
            jt.out("renkeybuttonsdiv", "");
            mgrs.ellip.updateAllKeywords(kwr); },
        updateAllKeywords: function (kwr) {
            var aggpts = mgrs.agg.getPoints();
            if(!aggpts || kwr.idx >= aggpts.length) {
                mgrs.ellip.toggleEllipsisMenu("close");
                return mgrs.ptd.rebuildTimelinePoints(null); }
            jt.out("renkeystatmsgdiv",
                   "Checked " + kwr.idx + ", Updated " + kwr.repl + " points");
            var prebp = aggpts[kwr.idx];
            kwr.idx += 1;
            mgrs.edit.pt4id(prebp.dsId, function (pt) {
                var repl = "";
                mgrs.srch.pointKeywordFields().forEach(function (kwf) {
                    if(pt[kwf] && pt[kwf].csvcontains(kwr.from)) {
                        kwr.repl += 1;
                        repl = pt[kwf].csvremove(kwr.from);
                        repl = repl.csvappend(kwr.to);
                        mgrs.ellip.setKeywordWorkingInput(pt, kwf, repl); } });
                if(!repl) {
                    return mgrs.ellip.updateAllKeywords(kwr); }
                mgrs.edit.saveFullPoint(pt, function () {
                    mgrs.ellip.updateAllKeywords(kwr); }); }); },
        setKeywordWorkingInput: function (pt, kwf, repl) {
            //set up input field for getUIKeywords to find the updated value
            jt.out("renkeyworkdiv", jt.tac2html(
                ["div", {id:"csvmgr" + pt.dsId + kwf + "valsdiv"},
                 ["input", {id:"ed" + pt.dsId + kwf + "valdiv0in",
                            type:"text", value:repl}]])); }
    };


    //Settings Manager handles timeline fields and update.
    mgrs.stg = (function () {
        var fdefs = {
            name: {si:true, h:"Unique timeline name for reference."},
            slug: {si:true, h:"Unique URL identifier (no spaces, short.)"},
            title: {h:"Timeline name to display in start dialog."},
            subtitle: {h:"Optional second line text for start dialog."},
            comment: {h:"Optional popup text to display when the timeline starts. The name of the continue button can be specified in brackets at the end.  e.g. This timeline is about 10 minutes long [Start]"},
            about: {h:"Additional text to include in the timeline full description, as shown on the completion page."},
            featured: {mgr:mgrs.feat, h:"How this timeline may be recommended to others."}};
    return {
        getFDefs: function () { return fdefs; },
        ctrlHTML: function () {
            return jt.tac2html(
                ["a", {href:"#settings", title:"Toggle Timeline field settings",
                       onclick:mdfs("stg.toggleSettings")},
                 ["img", {src:app.dr("img/settings.png"),
                          cla:"formicoimg"}]]); },
        setFocus: function () {
            var sd = jt.byId("tlsettingsdiv");
            if(sd && sd.style.display === "block") {  //settings are visible
                uifoc("tlsfvdname"); } },
        toggleSettings: function (cmd) {
            var sd = jt.byId("tlsettingsdiv");
            if(cmd === "open" || (sd.style.display === "none" &&
                                  cmd !== "closed") || !sd.innerHTML) {
                sd.style.display = "block";
                sd.innerHTML = mgrs.stg.fieldHTML();
                setTimeout(function () {
                    var tl = mgrs.agg.currTL("edit");
                    if(tl) {  //might not have finished loading yet
                        mgrs.feat.setValue(tl.featured); }
                    mgrs.stg.setFocus(); }, 50); }
            else {  //was visible, toggle off.
                sd.style.display = "none"; } },
        fieldHTML: function () {
            var tl = mgrs.agg.currTL("edit");
            var html = [];
            Object.entries(fdefs).forEach(function ([fld, def]) {
                var mgr = def.mgr || mgrs.tf;
                html.push(
                    ["div", {cla:"tlsetfielddiv"},
                     [["div", {cla:"tlsfhdiv", id:"tlsfhdiv" + fld}],
                      ["div", {cla:"tlsetfldentrydiv"},
                       [["div", {cla:"tlsetfldnamediv"}, fld.capitalize()],
                        ["div", {cla:"tlsetfldvalcontdiv"},
                         mgr.getHTML(tl, fld)]]]]]); });
            html.push(["div", {id:"stgsavediv"},
                       [["div", {id:"elliplinkdiv"},
                         mgrs.ellip.getHTML()],  //horizontal ellipsis
                        ["div", {id:"stgsavemsgdiv"}],
                        ["div", {id:"stgsavebdiv", style:"display:none"},
                         ["button", {type:"button", id:"tlsetsavebutton",
                                     title:"Save Timeline Settings",
                                     onclick:mdfs("stg.save")},
                          "Save"]]]]);
            html.push(["div", {id:"ellipmenudiv", style:"display:none;"}]);
            return jt.tac2html(html); },
        save: function (how) {
            var ui = {bdiv:jt.byId("stgsavebdiv")};
            if(ui.bdiv) {
                jt.out("stgsavemsgdiv", "");  //clear any previous message
                ui.bh = ui.bdiv.innerHTML;    //save button html
                ui.bdiv.innerHTML = "Saving..."; }
            var tldat = mgrs.stg.settingsData();
            tldat = app.refmgr.postdata(tldat);
            jt.call("POST", "/api/updtl?" + app.auth(), tldat,
                    function (obs) {
                        var tl = app.refmgr.put(app.refmgr.deserialize(obs[0]));
                        mgrs.stg.verifyUserBuilt(tl);  //update user if needed
                        mgrs.agg.rememberControlValues();  //mix-in selection
                        mgrs.agg.updateControls();  //rebuild display name
                        mgrs.agg.getState().edsel.setValue(tl.dsId);
                        if(how === "interim") {
                            ui.bdiv.innerHTML = ui.bh;
                            mgrs.stg.toggleSettings("open"); }
                        else {
                            mgrs.stg.toggleSettings("closed");
                            //redisplay points to be able to add new
                            mgrs.disp.displayPoints(mgrs.filt.filterPoints()); }
                    },
                    function (code, errtxt) {
                        jt.log("stg.save " + code + ": " + errtxt);
                        if(ui.bdiv) {
                            jt.out("stgsavemsgdiv", errtxt);
                            ui.bdiv.innerHTML = ui.bh; } },
                    jt.semaphore("stgmr.save")); },
        settingsData: function () {
            var tl = mgrs.agg.currTL("edit");
            var dat = {dsId:tl.dsId || "", dsType:"Timeline"};
            if(dat.dsId === "new") {
                dat.dsId = ""; }
            if(tl.dsId) {
                dat.modified = tl.modified; }
            Object.entries(fdefs).forEach(function ([fld, def]) {
                var mgr = def.mgr || mgrs.tf;
                dat[fld] = mgr.getValue(fld, def) || "NOVAL"; });
            return dat; },
        verifyUserBuilt: function (tl) {
            app.user.acc.built = app.user.acc.built || [];
            if(!Array.isArray(app.user.acc.built)) {  //json fields init to {}
                app.user.acc.built = []; }
            var ub = app.user.acc.built.find((b) => b.tlid === tl.dsId);
            if(!ub) {
                ub = {tlid:tl.dsId};
                app.user.acc.built.push(ub); }
            if(ub.modified !== tl.modified) {
                ub.name = tl.name;
                ub.featured = tl.featured;
                ub.modified = tl.modified;
                mgrs.stg.updateUser(); } },
        updateUser: function () {
            var data = app.refmgr.postdata(app.user.acc);
            jt.call("POST", "/api/updacc?" + app.auth(), data,
                    function (obs) {
                        app.user.acc = app.refmgr.put(
                            app.refmgr.deserialize(obs[0]));
                        jt.log("stg.updateUser success"); },
                    function (code, errtxt) {
                        jt.log("stg.updateUser " + code + ": " + errtxt); },
                    jt.semaphore("stg.updateUser")); },
        changedFields: function () {
            var tl = mgrs.agg.currTL("edit");
            if(!tl) { return ""; }
            var changed = "";
            Object.entries(fdefs).forEach(function ([fld, def]) {
                var mgr = def.mgr || mgrs.tf;
                var val = mgr.getValue(fld);
                if(val !== tl[fld]) {
                    changed = changed.csvappend(fld); } });
            return changed; },
        checkForDataChanges: function () {
            var changed = mgrs.stg.changedFields();
            if(changed) {
                jt.log("Timeline fields changed: " + changed);
                jt.byId("stgsavebdiv").style.display = "block"; }
            else {
                jt.byId("stgsavebdiv").style.display = "none"; } },
        saveIfModified: function () {
            var changed = mgrs.stg.changedFields();
            if(changed) {
                mgrs.stg.save(); }
            else {
                mgrs.stg.toggleSettings("closed"); } }
        };
    }());


    //Year Range Manager provides start/end year bounding if relevent.
    mgrs.yr = (function () {
        var state = {};
    return {
        reset: function () {
            state = {active:false, yrmin:0, yrmax:0};
            var pts = mgrs.agg.getPoints();
            if(pts.length > 1) {
                state.active = true;
                state.yrmin = pts[0].start.year;
                state.yrmax = pts[pts.length - 1].start.year; } },
        valchanged: function () {
            state.yrmin = jt.byId("yearstartin").value;
            state.yrmax = jt.byId("yearendin").value;
            if(state.yrmin > state.yrmax) {
                state.yrmin = state.yrmax;
                jt.byId("yearstartin").value = state.yrmin; }
            if(state.yrmax < state.yrmin) {
                state.yrmax = state.yrmin;
                jt.byId("yearendin").value = state.yrmaz; }
            mgrs.disp.displayPoints(mgrs.filt.filterPoints()); },
        makeYearInput: function (domid, val) {
            return jt.tac2html(
                ["input", {type:"number", cla:"yearin", value:val,
                           onchange:mdfs("yr.valchanged"),
                           id:domid, name:domid,
                           min:state.yrmin, max:state.yrmax}]); },
        ctrlHTML: function () {
            if(!state.active) { return ""; }
            return jt.tac2html(
                [mgrs.yr.makeYearInput("yearstartin", state.yrmin),
                 ["span", {id:"srchinspan"}, "&nbsp;to&nbsp;"],
                 mgrs.yr.makeYearInput("yearendin", state.yrmax)]); },
        isMatchingPoint: function (pt) {
            if(!state.active) { return true; }
            return ((pt.start.year >= state.yrmin) &&
                    (pt.start.year <= state.yrmax)); }
        };
    }());


    //Search Manager provides keyword and general text search
    mgrs.srch = (function () {
        var state = {};
        var ptkfs = ["communities", "regions", "categories", "tags"];
    return {
        pointKeywordFields: function () { return ptkfs; },
        reset: function () {
            state = {all:{}, selkeys:[], qstr:"", pqs:{}};
            mgrs.agg.getPoints().forEach(function (pt) {
                ptkfs.forEach(function (fld) {
                    var fldkcsv = pt[fld] || "";
                    fldkcsv.csvarray().forEach(function (val) {
                        state.all[val.toLowerCase()] = val; }); }); });
            Object.keys(state.all).forEach(function (ak) {
                state.selkeys.push(state.all[ak]); });
            state.selkeys.sort(); },
        ctrlHTML: function () {
            var srchinattrs = {type:"search", id:"srchin", size:26,
                               placeholder:"Search text",
                               onchange:mdfs("srch.valchanged"),
                               value:""};  //value set by UI interaction only
            var dlos = [];  //datalist options from keywords, if available
            state.selkeys.forEach(function (sk) {
                sk = sk.trim();  //verify no surrounding whitespace
                if(sk) {
                    if(/\S+\s\S+/.test(sk)) {  //keyword has a space in it
                        sk = "&quot;" + sk + "&quot;"; }
                    dlos.push(["option", {value:sk}]); } });
            if(dlos.length) {
                srchinattrs.list = "srchinoptsdl"; }
            var divcontents = [["input", srchinattrs]];
            if(dlos.length) {
                divcontents.push(["datalist", {id:"srchinoptsdl"}, dlos]); }
            divcontents.push(
                ["a", {href:"#search", id:"srchlink", title:"Search items",
                       onclick:mdfs("srch.valchanged")},
                 ["img", {src:app.dr("img/search.png")}]]);
            return jt.tac2html(["div", {id:"srchmgrdiv"}, divcontents]); },
        valchanged: function () {
            state.qstr = jt.byId("srchin").value || "";
            state.qstr = state.qstr.trim();
            if(!state.pqs[state.qstr]) {
                mgrs.srch.parseSearch(state.qstr); }
            mgrs.disp.displayPoints(mgrs.filt.filterPoints()); },
        //A search can consist of simple strings and/or quoted strings,
        //possibly preceded by a "+" indicating that the string should be
        //treated as an additional filter.
        parseSearch: function (qstr) {
            var pq = {toks:[], pfts:[]};  //tokens and post-match filter tokens
            pq.toks = qstr.toLowerCase().match(/\+?"[^"]*"*|\S+/g);
            pq.pfts = pq.toks.filter((tok) => tok.indexOf("+") === 0);
            pq.toks = pq.toks.filter((tok) => tok && tok.indexOf("+") !== 0);
            pq.pfts = pq.pfts.map((tok) => mgrs.srch.opstrip(tok));
            pq.toks = pq.toks.map((tok) => mgrs.srch.opstrip(tok));
            state.pqs[qstr] = pq; },
        opstrip: function (tok) {
            if(tok.indexOf("+") === 0) {
                tok = tok.slice(1); }
            if(tok.indexOf("\"") === 0) {
                tok = tok.slice(1, -1); }
            return tok; },
        verifySearchFilterText: function (pt) {
            if(pt.srchFiltTxt) { return; }
            var flds = ["source", "text", "refs", "communities", "regions",
                        "categories", "tags"];
            pt.srchFiltTxt = flds.reduce((a, c) => a + " " + pt[c], "");
            pt.srchFiltTxt = pt.srchFiltTxt.toLowerCase(); },
        isMatchingPoint: function (pt) {
            if(!state.qstr) { return true; }
            mgrs.srch.verifySearchFilterText(pt);
            var pq = state.pqs[state.qstr];
            if(pq.toks.some((tok) => pt.srchFiltTxt.indexOf(tok) >= 0) &&
               pq.pfts.every((pft) => pt.srchFiltTxt.indexOf(pft) >= 0)) {
                return true; }
            return false; },
        getSelectionKeywords: function () {
            return state.selkeys; }
        };
    }());


    //Download Manager provides for downloading selected points
    mgrs.dl = (function () {
        var fmts = {
            html:{name:"HTML Page", action:"Download", title:"Download as HTML page", help:"Download the text of all displayed points as a single HTML page. Best choice for copying points into a text document."},
            pdf:{name:"PDF Document", action:"Print", title:"Print to PDF", help:"Print the displayed points to a PDF file, including both images and text. Quality is platform dependent."},
            tsv:{name:"TSV Spreadsheet", action:"Download", title:"Download TSV spreadsheet file", help:"Download the text of all displayed points in Tab Separated Value (TSV) format suitable for importing into a spreadsheet."},
            txt:{name:"TXT Slides Outline", action:"Download", title:"Download TXT slides outline", help:"Download the text of all displayed points in outline format suitable for importing into a slide presentation."},
            json:{name:"JSON Data File", action:"Download", title:"Download JSON point data", help:"Download all displayed points in standard web data format."}};
        var dlsel = null;
    return {
        ctrlHTML: function () {
            return jt.tac2html(
                ["div", {id:"downloadlinkdiv"},
                 ["a", {href:"#Download", id:"downloadlink",
                        title:"Download displayed points",
                        onclick:mdfs("dl.togdlg")},
                  ["img", {src:app.dr("img/download.png"),
                           cla:"downloadlinkimg"}]]]); },
        togdlg: function (cmd) {
            var dldiv = jt.byId("dldlgdiv");
            if(cmd === "close" || dldiv.style.display === "block") {
                dldiv.style.display = "none"; }
            else {
                if(!dldiv.innerHTML) {
                    dldiv.innerHTML = mgrs.dl.dlgHTML(); }
                dldiv.style.display = "block";
                mgrs.dl.selchg(); } },  //show link and help if no change event
        dlgHTML: function () {
            if(!dlsel) {
                var opts = Object.entries(fmts).map(function ([f, d]) {
                    return {value:f, text:d.name}; });
                dlsel = makeSelect("dlsel", mdfs("dl.selchg"), opts); }
            return jt.tac2html(
                ["div", {id:"dldlgcontdiv"},
                 [["div", {id:"dldlgtitlediv"}, "Download displayed points"],
                  ["div", {id:"dldlgfmtdiv"},
                   [["label", {fo:"dlsel"}, "as: "],
                    dlsel.ctrlHTML()]],
                  ["div", {id:"dldlgactiondiv"}],  //data URI link contents
                  ["div", {id:"dldlghelpdiv"}]]]); },
        selchg: function () {
            var fmt = dlsel.getValue();
            var linkattrs = {id:"downloadactionlink", 
                             title:fmts[fmt].title,
                             //close the dialog without trapping click event
                             onclick:mdfs("dl.togdlg", "event")};
            if(fmt === "pdf") {
                linkattrs.href = "#printToPDF";
                linkattrs.onclick += ";window.print();"; }
            else {
                linkattrs.href = mgrs.dl["get" + fmt.toUpperCase() + "DataURI"]();
                linkattrs.download = mgrs.dl.dlfnb() + "." + fmt; }
            jt.out("dldlgactiondiv", jt.tac2html(
                ["a", linkattrs,
                 ["span", {cla:"buttonspan", id:"downloadactiontextspan"},
                  fmts[fmt].action]]));
            jt.out("dldlghelpdiv", fmts[fmt].help); },
        dlfnb: function () {
            var tl = mgrs.agg.currTL("edit");
            return tl.slug || "pastkey"; },
        getHTMLDataURI: function () {
            var html = "<!doctype html><html><head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" /><title>" + mgrs.dl.dlfnb() + "</title></head><body>";
            mgrs.filt.points().forEach(function (pt) {
                html += "\n" + jt.tac2html(
                    ["div", {cla:"dlptdiv"},
                     [["div", {cla:"dlptdatediv"}, pt.date],
                      ["div", {cla:"dlpttextdiv"}, pt.text],
                      ["div", {cla:"dlptrefsdiv"},
                       pt.refs.join("<br/>")]]]); });
            html += "</body></html>";
            return "data:text/html;charset=utf-8," + jt.enc(html); },
        getTSVDataURI: function () {
            var tsv = "Date\tText\n";
            mgrs.filt.points().forEach(function (pt) {
                var cleantext = pt.text.replace(/[\t\n]/g, " ");
                tsv += pt.date + "\t" + cleantext + "\n"; });
            return "data:text/html;charset=utf-8," + jt.enc(tsv); },
        getTXTDataURI: function () {
            var txt = "";
            mgrs.filt.points().forEach(function (pt) {
                txt += pt.date + "\n";
                var paras = pt.text.split("\n");
                paras.forEach(function (para) {
                    txt += "    " + para + "\n"; });
                txt += "\n"; });
            return "data:text/html;charset=utf-8," + jt.enc(txt); },
        getJSONDataURI: function () {
            return "data:text/html;charset=utf-8," +
                jt.enc(JSON.stringify(mgrs.filt.points())); }
        };
    }());


    //Supplemental Visualizations manager handles associating Timeline SVs
    mgrs.sv = (function () {
        var state = {};
    return {
        initCurrSVs: function () {
            state.svs = "";
            if(mgrs.agg.getState().mode.edsel) {
                var tl = mgrs.agg.currTL("edit");
                if(tl && tl.svs) {
                    state.svs = tl.svs; } } },
        svmodules: function () {
            return app.modules.filter((md) => md.type === "sv"); },
        displayVisualizations: function (divid) {
            mgrs.sv.initCurrSVs();
            var html = mgrs.sv.svmodules().map(function (md) {
                var si = "";
                if(mgrs.agg.getState().mode === "tledit") {
                    si = {type:"checkbox", id:"cb" + md.name,
                          onchange:mdfs("sv.togsvsel")};
                    if(state.svs.csvcontains(md.name)) {
                        si.checked = "checked"; }
                    si = ["span", {cla:"ptseldiv"},
                          [["label", {fo:"cb" + md.name}, "Include"],
                           ["input", si]]]; }
                return jt.tac2html(
                    ["div", {cla:"svlistdiv"},
                     [["div", {cla:"svlistnamediv"},
                       [si,
                        ["a", {href:"#sv=" + md.name,
                               onclick:mdfs("sv.run", md.name)},
                         ["span", {cla:"svlistnamespan"}, md.title]]]],
                      //PENDING: "more..." link to sv about text.
                      ["div", {cla:"svlistdescdiv"}, md.desc]]]); });
            if(mgrs.agg.getState().mode === "tledit") {
                html.push(["div", {id:"svsavemsgdiv"}]);
                html.push(["div", {id:"svsavebdiv", style:"display:none;"},
                           ["button", {type:"button", id:"svsaveb",
                                       title:"Save Selected Visualizations",
                                       onclick:mdfs("sv.save")}, "Save"]]); }
            html = ["div", {id:"svsdispdiv"}, html];
            jt.out(divid, jt.tac2html(html)); },
        togsvsel: function () {
            //rewrite the svs each time so the order stays consistent
            state.svs = mgrs.sv.svmodules().reduce(function (acc, md) {
                if(jt.byId("cb" + md.name).checked) {
                    acc = acc.csvappend(md.name); }
                return acc; }, "");
            var tlsvs = "";
            var tl = mgrs.agg.currTL("edit");
            if(tl && tl.svs) {
                tlsvs = tl.svs; }
            if(state.svs !== tlsvs) {
                jt.byId("svsavebdiv").style.display = "block"; }
            else {
                jt.byId("svsavebdiv").style.display = "none"; } },
        save: function () {
            var tl = mgrs.agg.currTL("edit");
            if(!tl || !tl.dsId || !tl.modified) {
                return jt.out("svsavemsgdiv", "Save timeline first"); }
            jt.out("svsavemsgdiv", "Saving...");
            jt.byId("svsavebdiv").style.display = "none";
            jt.call("POST", "/api/updtl?" + app.auth(), app.refmgr.postdata(
                {dsType:"Timeline", dsId:tl.dsId, modified:tl.modified,
                 svs:state.svs || "NOVAL"}),
                    function (obs) {
                        app.refmgr.put(app.refmgr.deserialize(obs[0]));
                        jt.out("svsavemsgdiv", "");
                        mgrs.sv.togsvsel(); },
                    function (code, errtxt) {
                        jt.out("svsavemsgdiv", code + ": " + errtxt);
                        mgrs.sv.togsvsel(); },
                    jt.semaphore("sv.save")); },
        run: function (svname) {
            app.tabular.runsv(svname); }
        };
    }());


    //Filter Manager handled which available points are currently displayed.
    mgrs.filt = (function () {
        var state = {};
    return {
        updateControls: function () {
            state.dispsel = makeSelect(
                "dispsel", mdfs("filt.updateDisplay"), [
                    {value:"Timeline", text:"Timeline Points"},
                    {value:"Suppviz", text:"Visualizations"}]);
            mgrs.yr.reset();
            mgrs.srch.reset();
            jt.out("filtctrlsdiv", jt.tac2html(
                [["div", {id:"ftrdiv"},  //filter timeline and range
                  [state.dispsel.ctrlHTML(),
                   ["div", {id:"yrmgrctrlsdiv"},
                    mgrs.yr.ctrlHTML()]]],
                 ["div", {id:"fsddiv"},  //filter search and download
                  [mgrs.srch.ctrlHTML(),
                   mgrs.dl.ctrlHTML(),
                   ["div", {id:"dldlgdiv", style:"display:none;"}]]]])); },
        updateDisplay: function () {
            if(state.dispsel.getValue() === "Timeline") {
                jt.byId("yrmgrctrlsdiv").style.display = "inline-block";
                jt.byId("fsddiv").style.display = "block";
                mgrs.disp.displayPoints(mgrs.filt.filterPoints()); }
            else {  //Suppviz
                jt.byId("yrmgrctrlsdiv").style.display = "none";
                jt.byId("fsddiv").style.display = "none";
                mgrs.sv.displayVisualizations("pointsdispdiv"); } },
        filterPoints: function () {
            var pts = [];
            mgrs.agg.getPoints().forEach(function (pt) {
                if(mgrs.yr.isMatchingPoint(pt) &&
                   mgrs.srch.isMatchingPoint(pt)) {
                    pts.push(pt); } });
            state.pts = pts;
            return pts; },
        points: function () {
            return state.pts; }
        };
    }());


    //Picture manager handles point pic display and upload
    mgrs.pic = {
        picsrc: function (pt) {
            var src = app.dr("img/ptplaceholder.png");
            if(pt.pic) {
                src = app.dr("/api/obimg") + "?dt=Point&di=" + pt.dsId +
                    "&v=" + app.vtag(pt.modified); }
            return src; },
        getHTML: function (pt) {
            var attrs = {cla:"ptdpic", id:"ptdpic" + pt.dsId,
                         title:"Point " + pt.dsId,
                         src:mgrs.pic.picsrc(pt)};
            if(mgrs.edit.status(pt).editable) {
                attrs.style = "cursor:pointer;";
                attrs.onclick = mdfs("pic.prepUpload", pt.dsId); }
            return jt.tac2html(["img", attrs]); },
        prepUpload: function (ptid) {
            if(mgrs.kebab.showingMenu(ptid)) {
                mgrs.kebab.toggleKebabMenu(ptid, "close"); }
            //deal with outstanding edits before uploading to avoid sync issues
            else if(mgrs.edit.saveButtonDisplayed(ptid)) {
                mgrs.edit.save(ptid); }
            //only show upload menu if point already exists.
            else if(ptid && ptid !== "Placeholder") {
                mgrs.pic.togglePicUpload(ptid, "show"); } },
        togglePicUpload: function (ptid, cmd) {
            var div = jt.byId("picuploaddiv" + ptid);
            if(cmd === "hide" || div.style.display === "block") {
                div.style.display = "none";
                return; }
            div.style.display = "block";
            div.innerHTML = jt.tac2html(
                ["div", {cla:"picuploadformdiv", id:"picuploadformdiv" + ptid},
                 [["div", {cla:"cancelxdiv"},
                   ["a", {href:"#close", title:"Close pic upload",
                          onclick:mdfs("pic.togglePicUpload", ptid)}, "x"]],
                  ["form", {id:"picuploadform" + ptid, action:"/api/upldpic",
                            method:"post", target:"pumif" + ptid,
                            enctype:"multipart/form-data"},
                   [["input", {type:"hidden", name:"an", value:app.user.email}],
                    ["input", {type:"hidden", name:"at", value:app.user.tok}],
                    ["input", {type:"hidden", name:"ptid", value:ptid}],
                    ["label", {fo:"picfilein" + ptid}, "Upload point pic"],
                    ["input", {type:"file", id:"picfilein" + ptid, 
                               name:"picfilein", accept:"image/*",
                               onchange:mdfs("pic.enableUpldBtn", ptid)}],
                    //PENDING: image attribution input. Public domain for now.
                    ["div", {cla:"picupstatdiv", id:"picupstatdiv" + ptid}],
                    ["div", {cla:"picupfbsdiv", id:"picupfbsdiv" + ptid},
                     ["button", {type:"submit", id:"picuploadbutton" + ptid,
                                 //initially disabled via script below
                                 onclick:mdfs("pic.monitorUpload", 
                                              ptid, true)},
                      "Upload"]]]],
                  ["iframe", {id:"pumif" + ptid, name:"pumif" + ptid,
                              src:"/api/upldpic", style:"display:none"}]]]);
            jt.byId("picuploadbutton" + ptid).disabled = true; },
        enableUpldBtn: function (ptid) {
            jt.byId("picuploadbutton" + ptid).disabled = false; },
        monitorUpload: function (ptid, submit) {
            var iframe = jt.byId("pumif" + ptid);
            if(!iframe) {
                return jt.log("pic.monitorUpload exiting, no iframe"); }
            jt.byId("picuploadbutton" + ptid).disabled = true;
            if(submit) {
                jt.byId("picuploadform" + ptid).submit(); }
            var picstatdiv = jt.byId("picupstatdiv" + ptid);
            if(!picstatdiv.innerHTML) {
                picstatdiv.innerHTML = "Uploading"; }
            else {  //add a monitoring dot
                picstatdiv.innerHTML = picstatdiv.innerHTML + "."; }
            var txt = iframe.contentDocument || iframe.contentWindow.document;
            if(!txt || !txt.body || txt.body.innerHTML.indexOf("Ready") >= 0) {
                return setTimeout(function () {
                    mgrs.pic.monitorUpload(ptid); }, 1000); }
            //upload complete, update image or report error
            txt = txt.body.innerHTML;
            if(txt.indexOf("Done: ") >= 0) {
                mgrs.pic.uploadComplete(ptid); }
            else {
                mgrs.pic.togglePicUpload(ptid, "hide");
                jt.err(txt); } },
        uploadComplete: function (ptid) {
            jt.out("picupstatdiv" + ptid, "Done.");
            app.refmgr.uncache("Point", ptid);
            app.refmgr.getFull("Point", ptid, function (pt) {
                jt.byId("ptdpic" + pt.dsId).src = mgrs.pic.picsrc(pt);
                mgrs.pic.togglePicUpload(pt.dsId, "hide");
                //need to update the timeline preb to include the pic info.
                //mgrs.edit.save flow is overkill, but simpler to follow.
                mgrs.agg.addOrUpdatePoint(pt);
                mgrs.ptd.rebuildTimelinePoints(pt); }); },
        appendChangedValue: function () {
            return "No value appended, pic upload handled separately."; }
    };


    //Help display manager handles field level help display
    mgrs.help = (function () {
        var state = {};
    return {
        updateHelp: function (event) {
            if(!event.target.dataset.helpsrc) { return; }
            var ptid = event.target.dataset.ptid;
            var help = {mgrname:event.target.dataset.helpsrc};
            help.hdat = app.tabular.managerDispatch(help.mgrname, "help");
            help.divid = help.mgrname + "help" + ptid;
            if(!jt.byId(help.divid)) { //create help div if not existing
                help.tdiv = jt.byId("ecbdiv" + ptid);
                help.tdiv.innerHTML = jt.tac2html(
                    ["div", {cla:"placehelpdiv", id:help.divid}]) +
                    help.tdiv.innerHTML; }
            if(event.type === "blur") {
                jt.out(help.divid, ""); }
            else if(event.type === "focus") {
                jt.out(help.divid, jt.tac2html(
                    [["div", {cla:"helpfieldnamediv"}, help.hdat.fpn],
                     ["div", {cla:"helptextdiv"}, help.hdat.txt]])); } },
        checkForChanges: function (ptid) {
            if(state.chgchkt) {
                clearTimeout(state.chgchkt); }
            state.chgchkt = setTimeout(function () {
                mgrs.edit.pt4id(ptid, function (pt) {
                    //jt.log("checkForChanges updating save button");
                    mgrs.edit.updateSaveButtonDisplay(pt);
                    state.chgchkt = null; }); }, 500); }
        };
    }());


    //Placeholder manager handles filling and removal of placeholder div text
    mgrs.place = {
        makeTogglable: function (attrs, ptid) {
            attrs.onclick = mdfs("edit.togedit", ptid, "edit", attrs.id);
            attrs.style = "cursor:pointer;"; },
        makeEditable: function (attrs, ptid, placetext, helpsrcname) {
            attrs.contentEditable = "true";
            attrs["data-ptid"] = ptid;
            attrs["data-placetext"] = placetext;
            if(helpsrcname) {
                attrs["data-helpsrc"] = helpsrcname; }
            var focfstr = mdfs("place.placeholdercheck", "event");
            attrs.onfocus = focfstr;
            attrs.onblur = focfstr;
            var chgfstr = mdfs("help.checkForChanges", ptid);
            attrs.onkeyup = chgfstr; },
        placeholdercheck: function (event) {
            var ptxt = event.target.dataset.placetext;
            //jt.log("placeholdercheck " + event.type + " " + event.target.id);
            if(event.type === "blur" && !event.target.innerText.trim()) {
                event.target.innerText = ptxt; }
            else if(event.type === "focus") {
                if(event.target.innerText === ptxt) {
                    event.target.innerHTML = ""; } }
            mgrs.help.updateHelp(event); },
        togtext: function (divid, text) {
            var div = jt.byId(divid);
            if(div) {
                if(div.innerText.trim() === text) {
                    div.innerHTML = ""; }
                else {
                    div.innerHTML = text; } } }
    };


    //Date manager handles date input field
    mgrs.date = (function () {
        var placeholder = "";
    return {
        getHTML: function (pt, sp) {
            var attrs = {cla:"ptddatediv", id:"ptddatediv" + pt.dsId};
            if(sp.mode === "edit") {
                placeholder = sp.def.place;
                mgrs.place.makeEditable(attrs, pt.dsId, sp.def.place, "date"); }
            else if(mgrs.edit.status(pt).editable) {
                mgrs.place.makeTogglable(attrs, pt.dsId); }
            return jt.tac2html(["div", attrs, pt.date || sp.def.place]); },
        help: function () {
            return {fpn:"Date", txt:"A date in general YYYY-MM-DD format.  Month and day can be omitted.  For years before the common era, use a preceding minus sign or a trailing ' BCE'. To make a timespan, put ' to ' between two dates.  Years can be decorated with a trailing 's' or '+' to indicate decades or beginnings e.g. 1920s or 1855+."}; },
        getValue: function (ptid) {
            var val = jt.byId("ptddatediv" + ptid).innerText || "";
            val = val.trim();
            if(val === placeholder) {
                val = ""; }
            return val; },
        appendChangedValue: function (ptd, pt) {
            var val = mgrs.date.getValue(pt.dsId);
            if(val !== pt.date) {
                ptd.date = val; } },
        validate: function (ptid) {
            return mgrs.date.validateValue(mgrs.date.getValue(ptid)); },
        validateValue: function (val) {
            var res = {valid:false, msg:"A Date value is required."};
            if(!val) { return res; }
            var pd = mgrs.date.parseDateExpression(val);
            if(!pd.start) {
                res.msg = "Date value not recognized.";
                return res; }
            res.valid = mgrs.date.canonicalDate(pd.start);
            if(pd.end) {
                res.valid += " to " + mgrs.date.canonicalDate(pd.end); }
            res.msg = "";
            if(res.valid !== val) {
                res.msg = "Date value adjusted for validity."; }
            return res; },
        parseDateExpression: function (val) {
            var st; var en;
            [st, en] = val.split(" to ").map((d) => mgrs.date.parseDate(d));
            return {start:st, end:en}; },
        parseDate: function (dv) {
            var res = null;
            var match = dv.match(/(-?)(\d+)([s+])?(-\d\d)?(-\d\d)?(\sBCE)?/);
            if(match && match[2]) {  //have at least year
                res = {negation:match[1], year:Number(match[2]),
                       decoration:match[3] || "", month:match[4], day:match[5],
                       bce:match[6]};
                if(res.negation || res.bce) { res.year *= -1; }
                if(res.month) { res.month = Number(res.month.slice(1)); }
                if(res.day) { res.day = Number(res.day.slice(1)); } }
            return res; },
        canonicalDate: function (pd) {
            var val = String(Math.abs(pd.year)) + pd.decoration + 
                mgrs.date.mdpart(pd.month) + mgrs.date.mdpart(pd.day);
            if(pd.year < 0) { val += " BCE"; }
            return val; },
        mdpart: function (mdval) {
            var val = "";
            if(mdval) {
                val += "-";
                if(mdval < 10) {
                    val += "0"; }
                val += String(mdval); }
            return val; },
        test: function () {
            var testdates = [
                "16000 BCE", "7000 BCE", "-600", "4 BCE", "1970-1", "foo",
                "1970-01", "1970-01-01", "1980s", "1980's", "1970+",
                "1983 to 1987", "1980s to 1990s", "1970-01-01 to 1980-01-01"];
            testdates.forEach(function (td) {
                jt.log(td + " -> " +
                       JSON.stringify(mgrs.date.validateValue(td))); }); }
        };
    }());


    //Text manager handles point text entry
    mgrs.txt = (function () {
        var placeholder = "";
    return {
        getHTML: function (pt, sp) {
            var attrs = {cla:"pttextdiv", id:"pttextdiv" + pt.dsId};
            var disp = pt.text || sp.def.place;
            if(sp.mode === "edit") {
                placeholder = sp.def.place;
                mgrs.place.makeEditable(attrs, pt.dsId, sp.def.place, "txt"); }
            else if(mgrs.edit.status(pt).editable) {
                mgrs.place.makeTogglable(attrs, pt.dsId);
                disp = app.db.ptt2html(pt, mgrs.agg.getPoints(),
                                       "app.tabular.linkclick"); }
            return jt.tac2html(["div", attrs, disp]); },
        help: function () {
            return {fpn:"Text", txt:"Key fact and impact. Max 1200 chars. First few words followed by ':' is a title. *<i>italic</i>*. **<b>bold</b>**. [text for link to previous point](prevPtSource)"}; },
        getValue: function (ptid) {
            //Server cleans up any embedded HTML if any sneaks through
            var val = jt.byId("pttextdiv" + ptid).innerText || "";
            val = val.trim();
            if(val === placeholder) {
                val = ""; }
            return val; },
        appendChangedValue: function (ptd, pt) {
            var val = mgrs.txt.getValue(pt.dsId);
            if(val !== pt.text) {
                ptd.text = val; } },
        validate: function (ptid) {
            var val = mgrs.txt.getValue(ptid);
            var res = {valid:false, msg:"Text description is required."};
            if(!val) { return res; }
            if(val.length > 1200) {
                res.msg = "Text too long.";
                return res; }
            return {valid:true}; }
        };
    }());


    //Point Reference Manager.  To add a reference, fill in the blank
    //reference field, then hit return or blur to trigger the creation of
    //another blank reference field.  To delete a reference, delete all the
    //text in it.  An actual input control would allow a proper onchange
    //listener, but looks clunkier and doesn't allow for line wrapping.
    mgrs.pr = {
        verifyPointRefs: function (pt) {
            if(!pt.refs) { pt.refs = []; }
            if(typeof pt.refs === "string") {
                pt.dsType = "Point";  //verify dsType was set
                app.refmgr.deserialize(pt); }
            if(!Array.isArray(pt.refs)) {  //might have defaulted to {}
                pt.refs = []; } },
        getHTML: function (pt, sp) {
            var dm = sp.mode || "read";
            if(dm === "read" && mgrs.edit.status(pt).editable) {
                dm = "editable"; }
            mgrs.pr.verifyPointRefs(pt);
            return jt.tac2html(
                ["div", {cla:"ptrefsdiv", id:"ptrefsdiv" + pt.dsId},
                 mgrs.pr.refshtml(pt.dsId, pt.refs, sp.def.place, dm)]); },
        refshtml: function (ptid, refs, plt, mode) {
            mode = mode || "edit";
            var html = refs.map(function (refstr, idx) {
                return mgrs.pr.refhtml(ptid, idx, refstr, plt, mode); });
            if(mode === "edit") { //append blank reference field for adding
                html.push(mgrs.pr.refhtml(ptid, refs.length, plt, plt)); }
            return jt.tac2html(html); },
        refhtml: function (ptid, idx, txt, plt, mode) {
            if(mode && mode !== "edit") {
                var attrs = mgrs.pr.rdas(ptid, idx);
                if(mode === "editable") {
                    mgrs.place.makeTogglable(attrs, ptid); }
                return ["div", attrs, jt.linkify(txt)]; }
            return ["div", mgrs.pr.rdas(ptid, idx, plt), txt]; },
        rdas: function (ptid, idx, place) {
            var divattrs = {cla:"ptrefstrdiv", id:"ptrefstrdiv" + ptid + idx};
            if(place) {  //editing
                mgrs.place.makeEditable(divattrs, ptid, place, "pr");
                divattrs["data-idx"] = idx;  //data-ptid set by makeEditable
                divattrs.onkeyup = mdfs("pr.refinput", "event"); }
            return divattrs; },
        refinput: function (event) {
            var ptid = event.target.dataset.ptid;
            var plt = event.target.dataset.placetext;
            mgrs.help.checkForChanges(ptid);
            if(event.key === "Enter") {
                var refs = mgrs.pr.refsFromHTML(ptid, plt);
                jt.out("ptrefsdiv" + ptid, mgrs.pr.refshtml(ptid, refs, plt));
                uifoc("ptrefstrdiv" + ptid + refs.length); } },
        help: function () {
            return {fpn:"References", txt:"Each reference is a single line citation or full URL. References are strongly recommended for validation and further learning."}; },
        refsFromHTML: function (ptid, plt) {
            var pdiv = jt.byId("ptrefsdiv" + ptid);
            var refs = Array.from(pdiv.children).map((c) => c.innerText.trim());
            refs = refs.filter((x) => x && x !== plt);  //remove empty refs
            return refs; },
        appendChangedValue: function (ptd, pt, det) {
            var refs = mgrs.pr.refsFromHTML(pt.dsId, det.def.place);
            if(JSON.stringify(refs) !== JSON.stringify(pt.refs)) {
                ptd.refs = refs; } }
    };


    //Question type manager handles point question type setting
    mgrs.qt = (function () {
        var qts ={
            C:{txt:"Continue", hlp:"Standard 'click to continue' response"},
            U:{txt:"Did You Know?", hlp:"New information Yes/No response"},
            D:{txt:"What Year?", hlp:"Click correct year to continue"},
            F:{txt:"Firsts", hlp:"'click to continue' response"}};
    return {
        getHTML: function (pt, sp) {
            pt.qtype = pt.qtype || "C";
            var divattrs = {cla:"ptqtdiv"};
            if(mgrs.edit.status(pt).editable) {
                mgrs.place.makeTogglable(divattrs, pt.dsId); }
            var valhtml = qts[pt.qtype].txt || qts.C.txt;
            if(sp.mode === "edit") {
                var huf = mdfs("help.updateHelp", "event");
                var chf = mdfs("help.checkForChanges", pt.dsId);
                valhtml = jt.tac2html(
                    ["select", {id:"qtsel" + pt.dsId, "data-helpsrc":"qt",
                                "data-ptid":pt.dsId, onfocus:huf, onblur:huf,
                                onchange:chf},
                     Object.entries(qts).map(function ([key, def]) {
                         var attrs = {value:key};
                         if(key === pt.qtype) {
                             attrs.selected = "selected"; }
                         return ["option", attrs, def.txt]; })]); }
            return jt.tac2html(
                ["div", divattrs,
                 [["span", {cla:"ptdetlabelspan"}, "Question Type: "],
                  ["span", {cla:"ptdetvaluespan"}, valhtml]]]); },
        help: function () {
            var dt = Object.values(qts).map(function (qt) {
                return ["tr", [["td", qt.txt], ["td", qt.hlp]]]; });
            return {fpn:"Question Type", txt:"The style of user interaction for this point." + jt.tac2html(["table", dt])}; },
        appendChangedValue: function (ptd, pt) {
            var sel = jt.byId("qtsel" + pt.dsId);
            if(sel) {
                var val = sel.options[sel.selectedIndex].value;
                if(val !== pt.qtype) {
                    ptd.qtype = val; } } }
        };
    }());


    //Source manager handles point source entry
    mgrs.src = (function () {
        var placeholder = "";
    return {
        getHTML: function (pt, sp) {
            if(!pt.source && sp.mode !== "edit") { return ""; }
            var valattrs = {cla:"ptdetvaluespan", id:"srcdivspan" + pt.dsId};
            var divattrs = {cla:"ptsourcediv"};
            if(sp.mode === "edit") {
                placeholder = sp.def.place;
                mgrs.place.makeEditable(valattrs, pt.dsId, sp.def.place,
                                        "src"); }
            else {
                mgrs.place.makeTogglable(divattrs, pt.dsId); }
            return jt.tac2html(
                ["div", divattrs,
                 [["span", {cla:"ptdetlabelspan"}, "Source: "],
                  ["span", valattrs, (pt.source || sp.def.place)]]]); },
        help: function () {
            return {fpn:"Source Id", 
                    txt:"Optional external source identifier text"}; },
        getValue: function (ptid) {
            var val = "";
            var span = jt.byId("srcdivspan" + ptid);
            if(span) {
                val = span.innerText || "";
                if(val) {
                    val = val.trim();
                    if(val === placeholder) {
                        val = ""; } } }
            return val; },
        appendChangedValue: function (ptd, pt) {
            var span = jt.byId("srcdivspan" + pt.dsId);
            if(span) {
                var val = mgrs.src.getValue(pt.dsId);
                if(val !== pt.source) {
                    ptd.source = val; } } }
        };
    }());


    //Point data manager handles point data entry and update
    mgrs.ptd = (function () {
        var ptfd = {
            pic:{dv:"", mgr:mgrs.pic},
            date:{dv:"", mgr:mgrs.date, place:"YYYY-MM-DD"},
            text:{dv:"", mgr:mgrs.txt, place:"Concise event description"},
            refs:{dv:[], mgr:mgrs.pr, place:"[+ref]"},
            qtype:{dv:"C", mgr:mgrs.qt},
            source:{dv:"", mgr:mgrs.src, place:"Id"},
            communities:{dv:"", mgr:makeCSVManager("communities")},
            regions:{dv:"",     mgr:makeCSVManager("regions")},
            categories:{dv:"",  mgr:makeCSVManager("categories")},
            tags:{dv:"",        mgr:makeCSVManager("tags", "keyword")},
            editors:{dv:""},  //server initializes on first save
            srclang:{dv:"en-US"},
            translations:{dv:""}};
    return {
        verifyFields: function (pt) {
            Object.entries(ptfd).forEach(function ([fld, def]) {
                pt[fld] = pt[fld] || def.dv; }); },
        pointHTML: function (pt, m) {
            var html = [];
            Object.entries(ptfd).forEach(function ([f, d]) {
                if(d.mgr) {
                    html.push(d.mgr.getHTML(pt, {fld:f, def:d,
                                                 mode:(m || "read")})); } });
            return jt.tac2html(html); },
        redisplay: function (pt, mode) {
            mgrs.ptd.verifyFields(pt);
            jt.out("pddiv" + pt.dsId, mgrs.ptd.pointHTML(pt, mode));
            var disp = (mode === "read" ? "none" : "");
            mgrs.edit.updateSaveButtonDisplay(pt, disp); },
        pointChangeData: function (pt) {
            var ptd = {dsType:"Point",
                       dsId:pt.dsId || "",
                       modified:pt.modified || "",
                       editors:pt.editors || app.user.acc.dsId,
                       srctl:pt.srctl || mgrs.agg.currTL("edit").dsId};
            Object.entries(ptfd).forEach(function ([f, d]) {
                if(d.mgr) {
                    d.mgr.appendChangedValue(ptd, pt, {fld:f, def:d}); } });
            if(ptd.dsId === "Placeholder") { ptd.dsId = ""; }
            return ptd; },
        fieldsChanged: function (pt) {
            var ptd = mgrs.ptd.pointChangeData(pt);
            return Object.entries(ptfd)
                .some(function ([k, d]) { return d.mgr && ptd[k]; }); },
        rebuildTimelinePoints: function (updpt) {
            var tl = mgrs.agg.currTL("edit");
            var pts = mgrs.agg.getPoints()
                .filter((pt) => pt.srctl === tl.dsId || pt.mixin);
            var cids = pts.map((pt) => pt.dsId).join(",");
            mgrs.ptd.updateTimelinePoints(updpt, cids); },
        updateTimelinePoints: function (updpt, updcids) {
            var tl = mgrs.agg.currTL("edit");
            var tldat = {dsType:"Timeline", dsId:tl.dsId, modified:tl.modified,
                         name:tl.name, slug:tl.slug,  //verified on each save
                         cids:updcids || "NOVAL"};
            tldat = app.refmgr.postdata(tldat);
            jt.call("POST", "/api/updtl?" + app.auth(), tldat,
                    function (obs) {
                        app.refmgr.put(app.refmgr.deserialize(obs[0]));
                        if(updpt) {
                            mgrs.disp.displayPoints(mgrs.filt.filterPoints()); }
                        else {  //rebuild display. kwds might have changed
                            mgrs.agg.tlchg("edsel"); } },
                    function (code, errtxt) {
                        //PENDING: Admin mail explaining that the timeline
                        //cids will need to be rebuilt from from the Points
                        //referencing by srctl. Then the preb will need to
                        //be rebuilt.  If this was a network hiccup, there
                        //is a chance they could retry and have it work. Put
                        //this in a recovery dialog.
                        jt.err("Timeline points rebuild failed " + code +
                               ": " + errtxt);
                        mgrs.edit.updateSaveButtonDisplay(updpt); },
                    jt.semaphore("ptd.rebuildTimelinePoints")); }
        };
    }());


    //Kebab menu manager handles display and actions from the vertical ellipsis
    mgrs.kebab = (function () {
        var state = {lkcs:""}; //last known timeline cids for revert
    return {
        getHTML: function (pt) {
            return jt.tac2html(
                ["a", {href:"#moreactions", title:"More actions...",
                       id:"kebaba" + pt.dsId,
                       onclick:mdfs("kebab.toggleKebabMenu", pt.dsId)},
                 "&#x22EE;"]); },  //vertical ellipsis
        showingMenu: function (ptid) {
            var kmd = jt.byId("kebabmenudiv" + ptid);
            return kmd && kmd.style.display === "block"; },
        toggleKebabMenu: function (ptid, cmd) {
            var kmd = jt.byId("kebabmenudiv" + ptid);
            if(cmd === "open" || kmd.style.display === "none") {
                kmd.style.display = "block";
                jt.byId("kebaba" + ptid).style.fontWeight = "bold";
                mgrs.edit.pt4id(ptid, mgrs.kebab.rebuildKebabActions); }
            else {
                kmd.style.display = "none";
                jt.byId("kebaba" + ptid).style.fontWeight = "normal"; } },
        rebuildKebabActions: function (pt) {
            var edst = mgrs.edit.status(pt);
            var mas = [
                {id:"incla", tx:"Include All", ti:"Include all selected points",
                 cond:!edst.editable},
                {id:"undin", tx:"Revert Include", ti:"Revert to last included",
                 cond:!edst.editable && state.lkcs},
                {id:"noinc", tx:"Include None", ti:"Uninclude all points",
                 cond:!edst.editable},
                {id:"copy", tx:"Copy Point", ti:"Copy data to a new point",
                 cond:!edst.editable},
                {id:"edit", tx:"Edit", ti:"Edit this point",
                 cond:edst.editable && !edst.editing},
                {id:"noadd", tx:"Cancel Add", ti:"Discard unsaved changes",
                 cond:edst.editing && !edst.cancelable},
                {id:"cancel", tx:"Cancel Edit", ti:"Discard unsaved changes",
                 cond:edst.editing && edst.cancelable},
                {id:"delete", tx:"Delete Point", ti:"Delete this point",
                 cond:edst.editable && edst.cancelable}];
            mas = mas.filter((ma) => ma.cond);
            jt.out("kebabmenudiv" + pt.dsId, jt.tac2html(
                mas.map(function (ma) {
                    return ["div", {cla:"kebabchoicediv"},
                            ["a", {href:"#" + ma.id, title:ma.ti,
                                   onclick:mdfs("kebab." + ma.id, pt.dsId)},
                             ma.tx]]; }))); },
        incla: function (ptid) {
            mgrs.kebab.toggleKebabMenu(ptid, "close");
            var tl = mgrs.agg.currTL("edit");
            if(!state.lkcs) { state.lkcs = tl.cids; }
            mgrs.filt.points().forEach(function (pt) {
                if(!tl.cids.csvcontains(pt.dsId)) {
                    pt.mixin = true;
                    tl.cids = tl.cids.csvappend(pt.dsId); } });
            mgrs.ptd.updateTimelinePoints(ptid, tl.cids); },
        undin: function (ptid) {
            mgrs.kebab.toggleKebabMenu(ptid, "close");
            mgrs.ptd.updateTimelinePoints(ptid, state.lkcs); },
        noinc: function (ptid) {
            mgrs.kebab.toggleKebabMenu(ptid, "close");
            var tl = mgrs.agg.currTL("edit");
            if(!state.lkcs) { state.lkcs = tl.cids; }
            mgrs.filt.points().forEach(function (pt) {
                pt.mixin = false;
                tl.cids = tl.cids.csvremove(pt.dsId); });
            mgrs.ptd.updateTimelinePoints(ptid, tl.cids); },
        copy: function (ptid) {
            mgrs.kebab.toggleKebabMenu(ptid, "close");
            jt.err("Copy point not implemented yet"); },
        edit: function (ptid) {
            mgrs.kebab.toggleKebabMenu(ptid, "close");
            mgrs.edit.togedit(ptid, "edit"); },
        noadd: function () {
            mgrs.kebab.toggleKebabMenu("Placeholder", "close");
            jt.byId("trowdivPlaceholder").remove(); },
        cancel: function (ptid) {
            mgrs.kebab.toggleKebabMenu(ptid, "close");
            mgrs.edit.togedit(ptid, "read"); },
        delete: function (ptid) {
            mgrs.kebab.toggleKebabMenu(ptid, "close");
            jt.err("Delete point not implemented yet"); }
        };
    }());


    //Edit manager handles the point editing process
    mgrs.edit = {
        editing: function (ptid) {
            var datediv = jt.byId("ptddatediv" + ptid);
            return (datediv && datediv.isContentEditable); },
        status: function (pt) {
            var state = {editable:false, cancelable:false, editing:false};
            if(app.user && app.user.acc) {
                pt.editors = pt.editors || "";  //legacy compiled points
                if((!pt.dsId || pt.dsId === "Placeholder") ||
                   (pt.editors.csvcontains(app.user.acc.dsId) &&
                    (mgrs.agg.currTL("edit").dsId === pt.srctl))) {
                    state.editable = true; }
                if(mgrs.edit.editing(pt.dsId)) {
                    state.editing = true; }
                if(pt.dsId && pt.dsId !== "Placeholder") {
                    state.cancelable = true; } }
            return state; },
        pt4id: function (ptid, cbf) {
            if(ptid === "Placeholder") {
                return cbf({dsType:"Point", dsId:"Placeholder"}); }
            if(!Number(ptid)) {
                return jt.log("pt4id ignored ptid: " + ptid); }
            var pt = app.refmgr.cached("Point", ptid);
            if(pt) { return cbf(pt); }
            jt.out("saveprocmsgdiv" + ptid, "Fetching full Point data...");
            app.refmgr.getFull("Point", ptid, function (pt) {
                jt.out("saveprocmsgdiv" + ptid, "");
                if(!pt) {
                    return jt.err("Point data retrieval failed."); }
                cbf(pt); }); },
        editCtrlsSideHTML: function (pt) {
            if(mgrs.agg.getState().mode !== "tledit") { return ""; }
            return jt.tac2html(
                [["div", {cla:"ecscbdiv"}, mgrs.edit.cbIncHTML(pt)],
                 ["div", {cla:"ecskmdiv"}, mgrs.kebab.getHTML(pt)],
                 ["div", {cla:"ecspldiv"}, mgrs.edit.plusHTML(pt)]]); },
        editCtrlsBottomHTML: function (pt) {
            return jt.tac2html(
                ["div", {cla:"ecbcdiv", id:"ecbcdiv" + pt.dsId},
                 [["div", {id:"saveprocmsgdiv" + pt.dsId}],
                  ["div", {cla:"saveptbdiv", id:"saveptbdiv" + pt.dsId},
                   ["button", {type:"button", id:"saveptb" + pt.dsId,
                               style:"display:none;",
                               onclick:mdfs("edit.save", pt.dsId)},
                    "Save"]]]]); },
        updateSaveButtonDisplay: function (pt, disp) {
            if(!disp) {
                if(pt.dsId === "Placeholder" || mgrs.ptd.fieldsChanged(pt)) {
                    disp = "inline"; }
                else {
                    disp = "none"; } }
            jt.byId("saveptb" + pt.dsId).style.display = disp;
            if(disp === "inline") {
                jt.byId("ecbdiv" + pt.dsId).style.minHeight = "40px"; }
            else {
                jt.byId("ecbdiv" + pt.dsId).style.minHeight = "0px"; } },
        saveButtonDisplayed: function (ptid) {
            var sb = jt.byId("saveptb" + ptid);
            if(sb && sb.style.display === "inline") {
                return true; }
            return false; },
        validate: function (ptid) {
            var tl = mgrs.agg.currTL("edit");
            if(!tl.dsId || tl.dsId === "new") {
                jt.out("saveprocmsgdiv" + ptid,
                       "Save timeline to write points to it.");
                return false; }
            var vds = [mgrs.date, mgrs.txt]; var vm = {valid:true};
            vds.forEach(function (vd) {
                if(vm.valid) {
                    vm = vd.validate(ptid); } });
            if(!vm.valid) {
                jt.out("saveprocmsgdiv" + ptid, vm.msg);
                return false; }
            return true; },
        save: function (ptid) {
            if(!mgrs.edit.validate(ptid)) { return; }
            jt.out("saveprocmsgdiv" + ptid, "Saving...");
            mgrs.edit.updateSaveButtonDisplay({dsId:ptid}, "none");
            mgrs.edit.pt4id(ptid, function (pt) {
                mgrs.edit.saveFullPoint(pt, function (updpt) {
                    mgrs.agg.addOrUpdatePoint(updpt);
                    mgrs.ptd.rebuildTimelinePoints(updpt); }); }); },
        saveFullPoint: function (pt, contf) {
            var ptdat = mgrs.ptd.pointChangeData(pt);
            ptdat = app.refmgr.postdata(ptdat);
            jt.call("POST", "/api/updpt?" + app.auth(), ptdat,
                    function (obs) {
                        jt.log("Point " + obs[0].dsId + " saved.");
                        jt.out("saveprocmsgdiv" + pt.dsId,
                               "Saved. Updating Timeline...");
                        app.refmgr.put(app.refmgr.deserialize(obs[0]));
                        contf(obs[0]); },
                    function (code, errtxt) {
                        mgrs.edit.updateSaveButtonDisplay(pt, "inline");
                        jt.out("saveprocmsgdiv" + pt.dsId, "Error " + code +
                               ": " + errtxt); },
                    jt.semaphore("mgrs.edit.saveFullPoint")); },
        cbIncHTML: function (pt) {
            //pt may be from previous mix-in from another url
            if(mgrs.edit.status(pt).editable) { return ""; }
            return jt.tac2html(
                ["input", {type:"checkbox", id:"cbinc" + pt.dsId,
                           value:pt.dsId, title:"Include Point in Timeline",
                           checked:jt.toru(pt.mixin),
                           onchange:mdfs("edit.toginc", pt.dsId)}]); },
        toginc: function (ptid) {
            var pt = mgrs.agg.getPoints().find((pt) => pt.dsId === ptid);
            pt.mixin = jt.byId("cbinc" + pt.dsId).checked;
            mgrs.ptd.rebuildTimelinePoints(ptid); },
        plusHTML: function (pt) {
            if(pt.dsId === "Placeholder") { return ""; }
            return jt.tac2html(
                ["a", {href:"#add", title:"Add new point",
                       onclick:mdfs("edit.addNewPoint", pt.dsId)},
                 "+"]); },
        addNewPoint: function (pt) {
            var pp = {dsType:"Point", dsId:"Placeholder"};
            pt = mgrs.agg.resolvePoint(pt, pp);
            var parentdiv = jt.byId("pointsdispdiv");
            var ptdiv = jt.byId("trowdiv" + pt.dsId);
            var placediv = jt.byId("trowdivPlaceholder");
            if(placediv) {  //already created
                parentdiv.removeChild(placediv); }
            else {  //make a placeholder div
                placediv = mgrs.disp.makePointDiv(pp); }
            if(ptdiv) {  //put placeholder after current point
                ptdiv.after(placediv); }
            else { //put placeholder first
                var pts = mgrs.agg.getPoints();
                ptdiv = null;
                if(pts.length) {
                    ptdiv = jt.byId("trowdiv" + pts[0].dsId); }
                if(ptdiv) { //first row already rendered
                    ptdiv.before(placediv); }
                else {
                    parentdiv.appendChild(placediv); } }
            mgrs.edit.togedit("Placeholder", "edit", "ptddatedivPlaceholder"); },
        togedit: function (ptid, mode, focdivid) {
            //jt.log("togedit " + ptid + " " + mode + " " + mgrname);
            var curredit = mgrs.edit.editing(ptid);
            var togedit = !curredit;
            if(mode) {
                if(mode === "read") { togedit = false; }
                if(mode === "edit") { togedit = true; } }
            if(togedit && !curredit) {
                mgrs.stg.saveIfModified(); }
            //only redisplay if the mode has changed. keep interim state.
            if(curredit !== togedit || focdivid) {
                //canceling current edit or starting a new edit, redisplay
                mgrs.edit.pt4id(ptid, function (pt) {
                    mgrs.ptd.redisplay(pt, mode);
                    if(focdivid) {
                        uifoc(focdivid); } }); } }
    };


    //Points display manager handles the points display area
    mgrs.disp = {
        display: function (mode) {
            //mgrs.date.test();
            app.mode.chmode("reference");  //verify screen elements visible
            mode = mgrs.agg.init(mode || "refdisp");
            jt.out("tcontdiv", jt.tac2html(
                [["div", {id:"tcontheaddiv"},
                  [["div", {id:"aggctrlsdiv"}],
                   ["div", {id:"filtctrlsdiv"}],
                   ["div", {id:"editctrlsdiv"}]]],
                 ["div", {id:"pointsdispdiv"}]]));
            mgrs.agg.updateControls();  //calls mgrs.filt.updateControls
            mgrs.disp.adjustPointsAreaDisplayHeight();
            mgrs.agg.tlchg((mode === "tledit")? "edsel" : ""); }, //update display
        adjustPointsAreaDisplayHeight: function () {
            var ptsh = window.innerHeight - 
                (jt.byId("tcontheaddiv").offsetHeight + 30);
            jt.byId("pointsdispdiv").style.height = String(ptsh) + "px"; },
        displayPoints: function (pts) {
            jt.out("pointsdispdiv", "");  //reset content
            if(!pts || !pts.length) {
                if(mgrs.agg.getState().mode === "tledit") {
                    var tl = mgrs.agg.currTL("edit");
                    if(tl && Number(tl.dsId)) {  //have saved timeline
                        return mgrs.edit.addNewPoint(); } }
                return jt.out("pointsdispdiv", "No timeline points."); }
            var outdiv = jt.byId("pointsdispdiv");
            pts.forEach(function (pt) {
                if(!pt.stats || pt.stats.status !== "deleted") {
                    var ptdiv = mgrs.disp.makePointDiv(pt);
                    outdiv.appendChild(ptdiv); } }); },
        makePointDiv: function (pt) {
            var ptdiv = document.createElement("div");
            ptdiv.className = "trowdiv";
            ptdiv.id = "trowdiv" + pt.dsId;
            ptdiv.innerHTML = mgrs.disp.pointHTML(pt);
            return ptdiv; },
        pointHTML: function (pt) {
            return jt.tac2html(
                [["div", {cla:"pddiv", id:"pddiv" + pt.dsId},
                  mgrs.ptd.pointHTML(pt)],
                 ["div", {cla:"ecbdiv", id:"ecbdiv" + pt.dsId},
                  mgrs.edit.editCtrlsBottomHTML(pt)],
                 ["div", {cla:"ecsidediv", id:"ecsidediv" + pt.dsId},
                  mgrs.edit.editCtrlsSideHTML(pt)],
                 ["div", {cla:"kebabmenudiv", id:"kebabmenudiv" + pt.dsId,
                          style:"display:none"}],
                 ["div", {cla:"picuploaddiv", id:"picuploaddiv" + pt.dsId,
                          style:"display:none"}]]); }
    };


    return {
        display: function (mode) { mgrs.disp.display(mode); },
        runsv: function (svmodule) { app[svmodule].display(); },
        linkclick: function (rid, sid) {
            jt.log("tabular.linkclick refid: " + rid + ", srcid: " + sid); },
        makeCSVManager: function (f, p, k) { return makeCSVManager(f, p, k); },
        managerDispatch: function (mgrname, fname, ...args) {
            //best to just crash on a bad reference, easier to see
            return mgrs[mgrname][fname].apply(app.tabular, args); }
    };
}());
