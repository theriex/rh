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
            jt.log("uifoc " + domid);
            jt.byId(domid).focus(); }, 200);
    }


    //Aggregation Manager handles which points are available for display.
    var aggmgr = {
        state: {tombstones:{}},
        init: function (mode) {
            //account status is private info so stripped from user.acc
            if(mode === "tledit" && app.user.status !== "Active") {
                jt.err("You need to activate your account before editing a timeline. Click the link sent to you in the account activation email.");
                mode = "refdisp"; }
            aggmgr.state.mode = mode;
            if(mode === "tledit") {
                jt.out("reftitlediv", jt.tac2html(
                    [["div", {cla:"tletldiv"}, "Edit Timeline"],
                     ["div", {cla:"tletrdiv"}, "Mix-In"]])); }
            else { //"refdisp"
                jt.out("reftitlediv", "Reference Mode"); }
            return aggmgr.state.mode; },
        urlTimeline: function () {
            return app.db.displayContext().lastTL; },
        getTLName: function (tlid) {
            var tl = app.refmgr.cached("Timeline", tlid);
            if(tl) { return tl.name; }
            if(aggmgr.state.tombstones[tlid]) {
                return tlid + " not retrievable"; }
            app.refmgr.getFull("Timeline", tlid, function (tl) {
                if(!tl) {
                    aggmgr.state.tombstones[tlid] = "getTLName"; }
                aggmgr.updateControls();
                aggmgr.tlchg(); });
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
            aggmgr.state.knownTLs = aggmgr.state.knownTLs || {};
            if(!Array.isArray(tls)) {
                if(tls && Object.keys(tls).length) { tls = [tls]; }
                else { tls = []; } }
            tls.forEach(function (tl) {
                tl.dsType = "Timeline";
                tl.dsId = tl.dsId || tl.tlid;
                aggmgr.state.knownTLs[tl.dsId] = {
                    tlid:tl.dsId,
                    name:tl.name || aggmgr.getTLName(tl.dsId),
                    group:ovrs.group || aggmgr.getGrouping(tl),
                    edit:ovrs.editable || aggmgr.isEditableTL(tl)};
                if(aggmgr.state.knownTLs[tl.dsId].group === "Deleted") {
                    delete aggmgr.state.knownTLs[tl.dsId]; } }); },
        collectKnownTimelines: function () {
            if(app.user.acc) {
                //same timeline may be in more than one place, do editable last
                var accflds = ["started", "completed", "remtls", "built"];
                accflds.forEach(function (fld) {
                    if(!Array.isArray(app.user.acc[fld])) {
                        app.user.acc[fld] = []; }
                    aggmgr.mergeKnownTLs(app.user.acc[fld],
                                         {editable:(fld === "built")}); }); }
            if(!aggmgr.state.ftls) {  //featured timelines not available yet
                aggmgr.state.ftls = [];  //continue with none for now
                app.mode.featuredTimelines(function (tls) {
                    aggmgr.state.ftls = tls;
                    aggmgr.updateControls();
                    aggmgr.tlchg(); }); }
            aggmgr.mergeKnownTLs(aggmgr.state.ftls, {group:"Featured"});
            aggmgr.mergeKnownTLs(aggmgr.urlTimeline(), {group:"Current"});
            aggmgr.state.sktls = Object.values(aggmgr.state.knownTLs);
            var so = ["Current", "Featured", "Listed", "Unlisted", "Archived"];
            aggmgr.state.sktls.sort(function (a, b) {
                return so.indexOf(a.group) - so.indexOf(b.group); }); },
        makeTimelineSelector: function (sid, editable) {
            var opts = [];
            if(editable) {
                opts.push({value:"new", text:"New Timeline"}); }
            else {  //mix-in
                opts.push({value:"none", text:"None"}); }
            aggmgr.state.sktls.forEach(function (ktl) {
                if((editable && ktl.edit) || (!editable && !ktl.edit)) {
                    opts.push({value:ktl.tlid, text:ktl.name,
                               group:ktl.group}); } });
            aggmgr.state[sid] = makeSelect(sid, mdfs("aggmgr.tlchg", sid),
                                           opts); },
        //The controls are updated on initial display, then potentially
        //again after the current timeline is loaded, and again after the
        //featured timelines are loaded.  Also after a timeline is saved.
        updateControls: function () {
            if(aggmgr.state.mode === "tledit") {
                aggmgr.collectKnownTimelines();
                aggmgr.makeTimelineSelector("edsel", "edit");
                aggmgr.makeTimelineSelector("mixsel");
                if(!jt.byId("tletldiv")) {
                    jt.out("aggctrlsdiv", jt.tac2html(
                        [["div", {cla:"tletldiv", id:"tletldiv"}],
                         ["div", {cla:"tletrdiv", id:"tletrdiv"}],
                         ["div", {id:"tlsettingsdiv"}]])); }
                jt.out("tletldiv", jt.tac2html(
                    [aggmgr.state.edsel.ctrlHTML(),
                     stgmgr.ctrlHTML()]));
                jt.out("tletrdiv", jt.tac2html(
                    aggmgr.state.mixsel.ctrlHTML()));
                aggmgr.setControlValues(); }
            filtmgr.updateControls(); },
        rememberControlValues: function () {
            Object.keys(aggmgr.state.ctrvs).forEach(function (key) {
                if(aggmgr.state[key]) {  //have select control
                    aggmgr.state.ctrvs[key] = aggmgr.state[key].getValue(); }
            }); },
        setControlValues: function () {
            aggmgr.state.ctrvs = aggmgr.state.ctrvs || {edsel:"", mixsel:""};
            Object.keys(aggmgr.state.ctrvs).forEach(function (key) {
                if(aggmgr.state.ctrvs[key]) {
                    aggmgr.state[key].setValue(aggmgr.state.ctrvs[key]); } });
            if(!aggmgr.state.ctrvs.edsel) {  //no previous choice, pick default
                var tl = aggmgr.urlTimeline();
                if(aggmgr.isEditableTL(tl)) {
                    return aggmgr.state.edsel.setValue(tl.dsId); }
                tl = null;
                app.user.acc.built.forEach(function (btl) {
                    if(!tl || tl.modified < btl.modified) {
                        tl = btl; } });
                if(tl) {
                    aggmgr.state.edsel.setValue(tl.tlid); } } },
        tlchg: function (src) {
            if(src === "edsel") {  //new timeline selected for editing
                //PENDING: rebuild mixsel to include all editable timelines
                //not currently selected so you can remix your own stuff.
                stgmgr.toggleSettings("open"); }  //rebuild settings
            aggmgr.rebuildPoints();
            filtmgr.updateControls();
            dispmgr.displayPoints(filtmgr.filterPoints());
            stgmgr.setFocus(); },
        getPoints: function () {
            if(!aggmgr.state.points) {
                aggmgr.rebuildPoints(); }
            return aggmgr.state.points; },
        mergePoints: function (sel) {
            var tlid = sel.getValue();
            if(tlid.match(/\d+/)) {
                var tl = app.refmgr.cached("Timeline", tlid);
                if(tl) {
                    var pts = tl.preb;
                    pts.forEach(function (pt) {
                        pt.srctl = pt.srctl || tl.dsId;  //fill in if legacy
                        if(pt.srctl !== tl.dsId) {
                            pt.mixin = true; } });
                    aggmgr.state.points = aggmgr.state.points.concat(pts);
                    return; }
                if(aggmgr.state.tombstones[tlid]) { return; }
                app.refmgr.getFull("Timeline", tlid, function (tl) {
                    if(!tl) {
                        aggmgr.state.tombstones[tlid] = "mergePoints"; }
                    aggmgr.tlchg(sel.domid()); }); } },
        rebuildPoints: function () {
            if(aggmgr.state.mode !== "tledit") {
                aggmgr.state.points = aggmgr.urlTimeline().preb; }
            else {
                aggmgr.state.points = [];
                aggmgr.mergePoints(aggmgr.state.edsel);
                aggmgr.mergePoints(aggmgr.state.mixsel);
                aggmgr.sortPoints(); } },
        sortPoints: function () {
            aggmgr.state.points.forEach(function (pt) {
                if(!pt.start) { app.db.parseDate(pt); } });
            aggmgr.state.points.sort(function (a, b) {
                return ((a.start.year - b.start.year) ||
                        (a.start.month - b.start.month) ||
                        (a.start.day - b.start.day)); }); },
        currTL: function (tsel) {
            switch(tsel) {
            case "edit": tsel = aggmgr.state.edsel.getValue; break;
            case "mix": tsel = aggmgr.state.mixsel.getValue; break;
            default: tsel = aggmgr.urlTimeline; }
            var tlid = tsel();
            if(tlid.match(/\d+/)) {
                return app.refmgr.cached("Timeline", tlid); }
            return {dsType:"Timeline", dsId:tlid, editors:"", name:tlid,
                    slug:"", title:"", subtitle:"", featured:"", lang:"en-US",
                    comment:"", about:"", kwds:"", ctype:"Points", cids:"",
                    rempts:"", svs:"", preb:[]}; },
        resolvePoint: function (pt, defltpt) {
            if(!pt) { return defltpt || null; }
            if(typeof pt === "string") {
                pt = aggmgr.state.points.find((tp) => pt === tp.dsId); }
            return pt; },
        addOrUpdatePoint: function (upd) {
            var pts = aggmgr.state.points.filter((pt) => pt.dsId !== upd.dsId);
            pts.push(upd);
            aggmgr.state.points = pts;
            aggmgr.sortPoints(); }
    };


    //Featured field entry manager
    var featmgr = {
        fos: [
            {t:"Unlisted", h:"Not featured in any general timeline listing."},
            {t:"Listed", h:"Ok to recommend to all users."},
            {t:"Obs M/D", h:"Promote annually around the date."},
            {t:"Obs M/W", h: "Promote annually by day of week in month."},
            {t:"Promoted", h:"Promote before Listed but after annuals."},
            {t:"Archived", h:"Unlisted, and sorted below general Unlisted."},
            {t:"Deleted", h:"Not shown, server data eventually cleared."}],
        sels: {
            feat: {sel:null},
            month: {vals:{"-01":"Jan", "-02":"Feb", "-03":"Mar", "-04":"Apr",
                          "-05":"May", "-06":"Jun", "-07":"Jul", "-08":"Aug",
                          "-09":"Sep", "-10":"Oct", "-11":"Nov", "-12":"Dec"}},
            week: {vals:{"-W1":"1st", "-W2":"2nd", "-W3":"3rd",
                         "-W4":"4th"}},
            day: {vals: {"-D0":"Sun", "-D1":"Mon", "-D2":"Tue", "-D3":"Wed",
                         "-D4":"Thu", "-D5":"Fri", "-D6":"Sat"}}},
        value: "Unlisted",
        initSelectors: function () {
            Object.keys(featmgr.sels).forEach(function (selkey) {
                var opts;
                if(selkey === "feat") {
                    opts = featmgr.fos.map(function (fo) {
                        return {value:fo.t, text:fo.t}; }); }
                else {
                    opts = Object.entries(featmgr.sels[selkey].vals)
                        .map(function ([code, disp]) {
                            return {value:code, text:disp}; }); }
                featmgr.sels[selkey].sel = makeSelect(
                    selkey, mdfs("featmgr.featselChange"), opts); }); },
        getHTML: function (tl) {
            if(tl && !tl.featured) { tl.featured = "Unlisted"; }
            if(!featmgr.sels.feat.sel) {
                featmgr.initSelectors(); }
            return jt.tac2html(
                [["span", {id:"featselspan"}, featmgr.sels.feat.sel.ctrlHTML()],
                 " ",  //break here if line too long
                 ["span", {id:"f2selspan"}]]); },
        verifyMonthDateVisible: function () {
            if(!jt.byId("datein")) {  //need to rebuild controls
                jt.out("f2selspan", jt.tac2html(
                    [featmgr.sels.month.sel.ctrlHTML(),
                     ["input", {type:"number", id:"datein", value:1,
                                min:1, max:31}]])); } },
        verifyMonthWeekVisible: function () {
            if(!jt.byId("week")) {  //need to rebuild controls
                jt.out("f2selspan", jt.tac2html(
                    [featmgr.sels.week.sel.ctrlHTML(),
                     featmgr.sels.day.sel.ctrlHTML(),
                     featmgr.sels.month.sel.ctrlHTML()])); } },
        setMonthDate: function (val) {
            var result = "";
            var match = val.match(/(-\d\d)-(\d\d)/);
            if(match) {
                featmgr.verifyMonthDateVisible();
                featmgr.sels.month.sel.setValue(
                    featmgr.sels.month.vals[match[1]]);
                jt.byId("datein").value = Number(match[2]);
                result = "Obs M/D"; }
            return result; },
        setMonthWeek: function (val) {
            var result = "";
            var match = val.match(/(-\d\d)(-W\d)(-D\d)/);
            if(match) {
                featmgr.verifyMonthWeekVisible();
                var selnames = ["month", "week", "day"];
                selnames.forEach(function (selname, idx) {
                    featmgr.sels[selname].setValue(
                        featmgr.sels[selname].vals[match[idx + 1]]); });
                result = "Obs M/W"; }
            return result; },
        setValue: function (val) {
            val = val || "Unlisted";
            featmgr.value = (featmgr.setMonthDate(val) || 
                             featmgr.setMonthWeek(val) || val);
            featmgr.updateHelp(); },
        getValue: function () {
            return featmgr.value; },  //updated by featselChange
        featselChange: function () {
            featmgr.value = featmgr.sels.feat.sel.getValue();
            if(featmgr.value === "Obs M/D") {
                featmgr.verifyMonthDateVisible();
                var din = String(jt.byId("datein").value);
                if(din.length < 2) {
                    din = "0" + din; }
                featmgr.value = featmgr.sels.month.sel.getValue() + "-" + din; }
            else if(featmgr.value === "Obs M/W") {
                featmgr.verifyMonthWeekVisible();
                var selnames = ["month", "week", "day"];
                featmgr.value = selnames.reduce(function (acc, sn) {
                    return acc + featmgr.sels[sn].sel.getValue(); }, ""); }
            else {
                jt.out("f2selspan", ""); }
            featmgr.updateHelp();
            stgmgr.checkForDataChanges(); },
        updateHelp: function () {
            var type = featmgr.sels.feat.sel.getValue() || "Unlisted";
            var fd = featmgr.fos.find((fd) => fd.t === type);
            jt.out("tlsfhdivfeatured", fd.h); }
    };


    //Text field entry manager
    var tfmgr = {
        getHTML: function (tl, fld) {
            var val = "";
            if(tl) {  //may not be available if still fetching data
                val = tl[fld];
                if(fld === "name" && tl.name === "new") {
                    val = ""; } }
            var hfl = mdfs("tfmgr.helpFocusListener", "event");
            var attrs = {cla:"tlsetfldvaldiv", id:"tlsfvd" + fld,
                         contentEditable:"true", "data-fld":fld,
                         onfocus:hfl, onblur:hfl};
            return jt.tac2html(["div", attrs, val]); },
        helpFocusListener: function (event) {
            //MacFF80.0.1 A blur triggered by a point switching to edit mode
            //must be handled very quickly, and side effects handled much
            //later, or it will blow off point focus handling.
            setTimeout(function () { 
                tfmgr.focusChange(event.type, event.target.dataset.fld); },
                       200); },
        focusChange: function (ftype, fld) {
            //jt.log("tfmgr.focusChange " + ftype + " " + fld);
            if(ftype === "blur") {
                jt.out("tlsfhdiv" + fld, "");
                if(stgmgr.fdefs[fld].si) {  //incremental save field
                    setTimeout(function () {
                        var fvold = aggmgr.currTL("edit")[fld] || "";
                        if(fld === "name" && fvold === "new") {
                            fvold = ""; }
                        var fvin = jt.byId("tlsfvd" + fld);
                        if(!fvin) { return; }
                        var fvnew = fvin.innerText.trim();
                        if(fvold !== fvnew) {
                            stgmgr.save("interim"); } }, 100); } }
            else if(ftype === "focus") {
                jt.out("tlsfhdiv" + fld, stgmgr.fdefs[fld].h); }
            setTimeout(stgmgr.checkForDataChanges, 400); },
        getValue: function (fld) {
            return jt.byId("tlsfvd" + fld).innerText.trim(); }
    };


    //Settings Manager handles timeline fields and update.
    var stgmgr = {
        fdefs: {
            name: {si:true, h:"Unique timeline name for reference."},
            slug: {si:true, h:"Unique URL identifier (no spaces, short.)"},
            title: {h:"Timeline name to display in start dialog."},
            subtitle: {h:"Optional second line text for start dialog."},
            comment: {h:"Optional popup text to display when the timeline starts. The name of the continue button can be specified in brackets at the end.  e.g. This timeline is about 10 minutes long [Start]"},
            about: {h:"Optional additional html to include in the timeline full description, as shown on the finish page and elsewhere."},
            featured: {mgr:featmgr, h:"How this timeline may be recommended to others."}},
            //kwds: {custom:"kwdsHTML", h:"Optional types and keywords for use in timeline points.\nCommunities: e.g. African American, Native, Latinx, Asian American\nRegions: e.g. Boston, Puerto Rico, Hawai'i, Southwest\nCategories: e.g. Stats, Awards, Stereotypes\nTags: other timeline specific grouping keywords."}},
        ctrlHTML: function () {
            return jt.tac2html(
                ["a", {href:"#settings", title:"Toggle Timeline field settings",
                       onclick:mdfs("stgmgr.toggleSettings")},
                 ["img", {src:app.dr("img/settings.png"),
                          cla:"formicoimg"}]]); },
        setFocus: function () {
            var sd = jt.byId("tlsettingsdiv");
            if(sd && sd.style.display === "block") {  //settings are visible
                var namediv = jt.byId("tlsfvdname");
                if(namediv && !namediv.innerText) {
                    uifoc("tlsfvdname"); }
                else {
                    uifoc("tlsfvdtitle"); } } },
        toggleSettings: function (cmd) {
            var sd = jt.byId("tlsettingsdiv");
            if(cmd === "open" || (sd.style.display === "none" &&
                                  cmd !== "closed") || !sd.innerHTML) {
                sd.style.display = "block";
                sd.innerHTML = stgmgr.fieldHTML();
                setTimeout(function () {
                    var tl = aggmgr.currTL("edit");
                    if(tl) {  //might not have finished loading yet
                        featmgr.setValue(tl.featured); }
                    stgmgr.setFocus(); }, 50); }
            else {  //was visible, toggle off
                sd.style.display = "none"; } },
        fieldHTML: function () {
            var tl = aggmgr.currTL("edit");
            var html = [];
            Object.entries(stgmgr.fdefs).forEach(function ([fld, def]) {
                var mgr = def.mgr || tfmgr;
                html.push(
                    ["div", {cla:"tlsetfielddiv"},
                     [["div", {cla:"tlsfhdiv", id:"tlsfhdiv" + fld}],
                      ["div", {cla:"tlsetfldentrydiv"},
                       [["div", {cla:"tlsetfldnamediv"}, fld.capitalize()],
                        ["div", {cla:"tlsetfldvalcontdiv"},
                         mgr.getHTML(tl, fld)]]]]]); });
            html.push(["div", {id:"stgsavediv"},
                       [["div", {id:"stgsavemsgdiv"}],
                        ["div", {id:"stgsavebdiv", style:"display:none"},
                         ["button", {type:"button", id:"tlsetsavebutton",
                                     title:"Save Timeline Settings",
                                     onclick:mdfs("stgmgr.save")},
                          "Save"]]]]);
            return jt.tac2html(html); },
        save: function (how) {
            var ui = {bdiv:jt.byId("stgsavebdiv")};
            if(ui.bdiv) {
                jt.out("stgsavemsgdiv", "");  //clear any previous message
                ui.bh = ui.bdiv.innerHTML;    //save button html
                ui.bdiv.innerHTML = "Saving..."; }
            var tldat = stgmgr.settingsData();
            tldat = app.refmgr.postdata(tldat);
            jt.call("POST", "/api/updtl?" + app.auth(), tldat,
                    function (obs) {
                        var tl = app.refmgr.put(app.refmgr.deserialize(obs[0]));
                        stgmgr.verifyUserBuilt(tl);  //update user if needed
                        aggmgr.rememberControlValues();  //mix-in selection
                        aggmgr.updateControls();     //rebuild the display name
                        aggmgr.state.edsel.setValue(tl.dsId);  //if created
                        if(how === "interim") {
                            ui.bdiv.innerHTML = ui.bh;
                            stgmgr.toggleSettings("open"); }
                        else {
                            stgmgr.toggleSettings("closed"); } },
                    function (code, errtxt) {
                        jt.log("stgmgr.save " + code + ": " + errtxt);
                        if(ui.bdiv) {
                            jt.out("stgsavemsgdiv", errtxt);
                            ui.bdiv.innerHTML = ui.bh; } },
                    jt.semaphore("stgmr.save")); },
        settingsData: function () {
            var tl = aggmgr.currTL("edit");
            var dat = {dsId:tl.dsId || "", dsType:"Timeline"};
            if(dat.dsId === "new") {
                dat.dsId = ""; }
            if(tl.dsId) {
                dat.modified = tl.modified; }
            Object.entries(stgmgr.fdefs).forEach(function ([fld, def]) {
                var mgr = def.mgr || tfmgr;
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
                stgmgr.updateUser(); } },
        updateUser: function () {
            var data = app.refmgr.postdata(app.user.acc);
            jt.call("POST", "/api/updacc?" + app.auth(), data,
                    function (obs) {
                        app.user.acc = app.refmgr.put(
                            app.refmgr.deserialize(obs[0]));
                        jt.log("stgmgr.updateUser success"); },
                    function (code, errtxt) {
                        jt.log("stgmgr.updateUser " + code + ": " + errtxt); },
                    jt.semaphore("stgmgr.updateUser")); },
        changedFields: function () {
            var tl = aggmgr.currTL("edit");
            if(!tl) { return ""; }
            var changed = "";
            Object.entries(stgmgr.fdefs).forEach(function ([fld, def]) {
                var mgr = def.mgr || tfmgr;
                var val = mgr.getValue(fld);
                if(val !== tl[fld]) {
                    changed = changed.csvappend(fld); } });
            return changed; },
        checkForDataChanges: function () {
            var changed = stgmgr.changedFields();
            if(changed) {
                jt.log("Timeline fields changed: " + changed);
                jt.byId("stgsavebdiv").style.display = "block"; }
            else {
                jt.byId("stgsavebdiv").style.display = "none"; } },
        saveIfModified: function () {
            var changed = stgmgr.changedFields();
            if(changed) {
                stgmgr.save(); }
            else {
                stgmgr.toggleSettings("closed"); } }
    };


    //Year Range Manager provides start/end year bounding if relevent.
    var yrmgr = {
        state: {},
        reset: function () {
            yrmgr.state = {active:false, yrmin:0, yrmax:0};
            var pts = aggmgr.getPoints();
            if(pts.length > 1) {
                yrmgr.state.active = true;
                yrmgr.state.yrmin = pts[0].start.year;
                yrmgr.state.yrmax = pts[pts.length - 1].start.year; } },
        valchanged: function () {
            yrmgr.state.yrmin = jt.byId("yearstartin").value;
            yrmgr.state.yrmax = jt.byId("yearendin").value;
            if(yrmgr.state.yrmin > yrmgr.state.yrmax) {
                yrmgr.state.yrmin = yrmgr.state.yrmax;
                jt.byId("yearstartin").value = yrmgr.state.yrmin; }
            if(yrmgr.state.yrmax < yrmgr.state.yrmin) {
                yrmgr.state.yrmax = yrmgr.state.yrmin;
                jt.byId("yearendin").value = yrmgr.state.yrmaz; }
            dispmgr.displayPoints(filtmgr.filterPoints()); },
        makeYearInput: function (domid, val) {
            return jt.tac2html(
                ["input", {type:"number", cla:"yearin", value:val,
                           onchange:mdfs("yrmgr.valchanged"),
                           id:domid, name:domid,
                           min:yrmgr.state.yrmin, max:yrmgr.state.yrmax}]); },
        ctrlHTML: function () {
            if(!yrmgr.state.active) { return ""; }
            return jt.tac2html(
                [yrmgr.makeYearInput("yearstartin", yrmgr.state.yrmin),
                 ["span", {id:"srchinspan"}, "&nbsp;to&nbsp;"],
                 yrmgr.makeYearInput("yearendin", yrmgr.state.yrmax)]); },
        isMatchingPoint: function (pt) {
            if(!yrmgr.state.active) { return true; }
            return ((pt.start.year >= yrmgr.state.yrmin) &&
                    (pt.start.year <= yrmgr.state.yrmax)); }
    };


    //Search Manager provides keyword and general text search
    var srchmgr = {
        state: {},
        ptkfs: ["communities", "regions", "categories", "tags"],
        reset: function () {
            srchmgr.state = {all:{}, selkeys:[], qstr:"", pqs:{}};
            aggmgr.getPoints().forEach(function (pt) {
                srchmgr.ptkfs.forEach(function (fld) {
                    var fldkcsv = pt[fld] || "";
                    fldkcsv.csvarray().forEach(function (val) {
                        srchmgr.state.all[val.toLowerCase()] = val; }); }); });
            Object.keys(srchmgr.state.all).forEach(function (ak) {
                srchmgr.state.selkeys.push(srchmgr.state.all[ak]); });
            srchmgr.state.selkeys.sort(); },
        ctrlHTML: function () {
            var srchinattrs = {type:"search", id:"srchin", size:26,
                               placeholder:"Search text",
                               onchange:mdfs("srchmgr.valchanged"),
                               value:""};  //value set by UI interaction only
            var dlos = [];  //datalist options from keywords, if available
            srchmgr.state.selkeys.forEach(function (sk) {
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
                       onclick:mdfs("srchmgr.valchanged")},
                 ["img", {src:app.dr("img/search.png")}]]);
            return jt.tac2html(["div", {id:"srchmgrdiv"}, divcontents]); },
        valchanged: function () {
            srchmgr.state.qstr = jt.byId("srchin").value || "";
            srchmgr.state.qstr = srchmgr.state.qstr.trim();
            if(!srchmgr.state.pqs[srchmgr.state.qstr]) {
                srchmgr.parseSearch(srchmgr.state.qstr); }
            dispmgr.displayPoints(filtmgr.filterPoints()); },
        //A search can consist of simple strings and/or quoted strings,
        //possibly preceded by a "+" indicating that the string should be
        //treated as an additional filter.
        parseSearch: function (qstr) {
            var pq = {toks:[], pfts:[]};  //tokens and post-match filter tokens
            pq.toks = qstr.toLowerCase().match(/\+?"[^"]*"*|\S+/g);
            pq.pfts = pq.toks.filter((tok) => tok.indexOf("+") === 0);
            pq.toks = pq.toks.filter((tok) => tok && tok.indexOf("+") !== 0);
            pq.pfts = pq.pfts.map((tok) => srchmgr.opstrip(tok));
            pq.toks = pq.toks.map((tok) => srchmgr.opstrip(tok));
            srchmgr.state.pqs[qstr] = pq; },
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
            if(!srchmgr.state.qstr) { return true; }
            srchmgr.verifySearchFilterText(pt);
            var pq = srchmgr.state.pqs[srchmgr.state.qstr];
            if(pq.toks.some((tok) => pt.srchFiltTxt.indexOf(tok) >= 0) &&
               pq.pfts.every((pft) => pt.srchFiltTxt.indexOf(pft) >= 0)) {
                return true; }
            return false; }
    };


    //Download Manager provides for downloading selected points
    var dlmgr = {
        fmts: {
            html:{name:"HTML Page", action:"Download", title:"Download as HTML page", help:"Download the text of all displayed points as a single HTML page. Best choice for copying points into a text document."},
            pdf:{name:"PDF Document", action:"Print", title:"Print to PDF", help:"Print the displayed points to a PDF file, including both images and text. Quality is platform dependent."},
            tsv:{name:"TSV Spreadsheet", action:"Download", title:"Download TSV spreadsheet file", help:"Download the text of all displayed points in Tab Separated Value (TSV) format suitable for importing into a spreadsheet."},
            txt:{name:"TXT Slides Outline", action:"Download", title:"Download TXT slides outline", help:"Download the text of all displayed points in outline format suitable for importing into a slide presentation."},
            json:{name:"JSON Data File", action:"Download", title:"Download JSON point data", help:"Download all displayed points in standard web data format."}},
        dlsel:null,
        ctrlHTML: function () {
            return jt.tac2html(
                ["div", {id:"downloadlinkdiv"},
                 ["a", {href:"#Download", id:"downloadlink",
                        title:"Download displayed points",
                        onclick:mdfs("dlmgr.togdlg")},
                  ["img", {src:app.dr("img/download.png"),
                           cla:"downloadlinkimg"}]]]); },
        togdlg: function (cmd) {
            var dldiv = jt.byId("dldlgdiv");
            if(cmd === "close" || dldiv.style.display === "block") {
                dldiv.style.display = "none"; }
            else {
                if(!dldiv.innerHTML) {
                    dldiv.innerHTML = dlmgr.dlgHTML(); }
                dldiv.style.display = "block";
                dlmgr.selchg(); } },  //show link and help if no change event
        dlgHTML: function () {
            if(!dlmgr.dlsel) {
                var opts = Object.entries(dlmgr.fmts).map(function ([f, d]) {
                    return {value:f, text:d.name}; });
                dlmgr.dlsel = makeSelect("dlsel", mdfs("dlmgr.selchg"), opts); }
            return jt.tac2html(
                ["div", {id:"dldlgcontdiv"},
                 [["div", {id:"dldlgtitlediv"}, "Download displayed points"],
                  ["div", {id:"dldlgfmtdiv"},
                   [["label", {fo:"dlsel"}, "as: "],
                    dlmgr.dlsel.ctrlHTML()]],
                  ["div", {id:"dldlgactiondiv"}],  //data URI link contents
                  ["div", {id:"dldlghelpdiv"}]]]); },
        selchg: function () {
            var fmt = dlmgr.dlsel.getValue();
            var linkattrs = {id:"downloadactionlink", 
                             title:dlmgr.fmts[fmt].title,
                             //close the dialog without trapping click event
                             onclick:mdfs("dlmgr.togdlg", "event")};
            if(fmt === "pdf") {
                linkattrs.href = "#printToPDF";
                linkattrs.onclick += ";window.print();"; }
            else {
                linkattrs.href = dlmgr["get" + fmt.toUpperCase() + "DataURI"]();
                linkattrs.download = dlmgr.dlfnb() + "." + fmt; }
            jt.out("dldlgactiondiv", jt.tac2html(
                ["a", linkattrs,
                 ["span", {cla:"buttonspan", id:"downloadactiontextspan"},
                  dlmgr.fmts[fmt].action]]));
            jt.out("dldlghelpdiv", dlmgr.fmts[fmt].help); },
        dlfnb: function () {
            var tl = aggmgr.currTL("edit");
            return tl.slug || "pastkey"; },
        getHTMLDataURI: function () {
            var html = "<!doctype html><html><head><meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" /><title>" + dlmgr.dlfnb() + "</title></head><body>";
            filtmgr.points().forEach(function (pt) {
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
            filtmgr.points().forEach(function (pt) {
                var cleantext = pt.text.replace(/[\t\n]/g, " ");
                tsv += pt.date + "\t" + cleantext + "\n"; });
            return "data:text/html;charset=utf-8," + jt.enc(tsv); },
        getTXTDataURI: function () {
            var txt = "";
            filtmgr.points().forEach(function (pt) {
                txt += pt.date + "\n";
                var paras = pt.text.split("\n");
                paras.forEach(function (para) {
                    txt += "    " + para + "\n"; });
                txt += "\n"; });
            return "data:text/html;charset=utf-8," + jt.enc(txt); },
        getJSONDataURI: function () {
            return "data:text/html;charset=utf-8," +
                jt.enc(JSON.stringify(filtmgr.points())); }
    };


    var svmgr = {
        state:{},
        initCurrSVs: function () {
            svmgr.state.svs = "";
            var tl = aggmgr.currTL("edit");
            if(tl && tl.svs) {
                svmgr.state.svs = tl.svs; } },
        svmodules: function () {
            return app.modules.filter((md) => md.type === "sv"); },
        displayVisualizations: function (divid) {
            svmgr.initCurrSVs();
            var html = svmgr.svmodules().map(function (md) {
                var si = "";
                if(aggmgr.state.mode === "tledit") {
                    si = {type:"checkbox", id:"cb" + md.name,
                          onchange:mdfs("svmgr.togsvsel")};
                    if(svmgr.state.svs.csvcontains(md.name)) {
                        si.checked = "checked"; }
                    si = ["span", {cla:"ptseldiv"},
                          [["label", {fo:"cb" + md.name}, "Include"],
                           ["input", si]]]; }
                return jt.tac2html(
                    ["div", {cla:"svlistdiv"},
                     [["div", {cla:"svlistnamediv"},
                       [si,
                        ["a", {href:"#run" + md.name,
                               onclick:mdfs("svmgr.run", md.name)},
                         ["span", {cla:"svlistnamespan"}, md.title]]]],
                      //PENDING: "more..." link to sv about text.
                      ["div", {cla:"svlistdescdiv"}, md.desc]]]); });
            if(aggmgr.state.mode === "tledit") {
                html.push(["div", {id:"svsavemsgdiv"}]);
                html.push(["div", {id:"svsavebdiv", style:"display:none;"},
                           ["button", {type:"button", id:"svsaveb",
                                       title:"Save Selected Visualizations",
                                       onclick:mdfs("svmgr.save")}, "Save"]]); }
            html = ["div", {id:"svsdispdiv"}, html];
            jt.out(divid, jt.tac2html(html)); },
        togsvsel: function () {
            //rewrite the svs each time so the order stays consistent
            svmgr.state.svs = svmgr.svmodules().reduce(function (acc, md) {
                if(jt.byId("cb" + md.name).checked) {
                    acc = acc.csvappend(md.name); }
                return acc; }, "");
            var tlsvs = "";
            var tl = aggmgr.currTL("edit");
            if(tl && tl.svs) {
                tlsvs = tl.svs; }
            if(svmgr.state.svs !== tlsvs) {
                jt.byId("svsavebdiv").style.display = "block"; }
            else {
                jt.byId("svsavebdiv").style.display = "none"; } },
        save: function () {
            var tl = aggmgr.currTL("edit");
            if(!tl || !tl.dsId || !tl.modified) {
                return jt.out("svsavemsgdiv", "Save timeline first"); }
            jt.out("svsavemsgdiv", "Saving...");
            jt.byId("svsavebdiv").style.display = "none";
            jt.call("POST", "/api/updtl?" + app.auth(), app.refmgr.postdata(
                {dsType:"Timeline", dsId:tl.dsId, modified:tl.modified,
                 svs:svmgr.state.svs || "NOVAL"}),
                    function (obs) {
                        app.refmgr.put(app.refmgr.deserialize(obs[0]));
                        jt.out("svsavemsgdiv", "");
                        svmgr.togsvsel(); },
                    function (code, errtxt) {
                        jt.out("svsavemsgdiv", code + ": " + errtxt);
                        svmgr.togsvsel(); },
                    jt.semaphore("svmgr.save")); },
        run: function (svname) {
            app.tabular.runsv(svname); }
    };


    //Filter Manager handled which available points are currently displayed.
    var filtmgr = {
        state: {},
        updateControls: function () {
            filtmgr.state.dispsel = makeSelect(
                "dispsel", mdfs("filtmgr.updateDisplay"), [
                    {value:"Timeline", text:"Timeline Points"},
                    {value:"Suppviz", text:"Visualizations"}]);
            yrmgr.reset();
            srchmgr.reset();
            jt.out("filtctrlsdiv", jt.tac2html(
                [["div", {id:"ftrdiv"},  //filter timeline and range
                  [filtmgr.state.dispsel.ctrlHTML(),
                   ["div", {id:"yrmgrctrlsdiv"},
                    yrmgr.ctrlHTML()]]],
                 ["div", {id:"fsddiv"},  //filter search and download
                  [srchmgr.ctrlHTML(),
                   dlmgr.ctrlHTML(),
                   ["div", {id:"dldlgdiv", style:"display:none;"}]]]])); },
        updateDisplay: function () {
            if(filtmgr.state.dispsel.getValue() === "Timeline") {
                jt.byId("yrmgrctrlsdiv").style.display = "inline-block";
                jt.byId("fsddiv").style.display = "block";
                dispmgr.displayPoints(filtmgr.filterPoints()); }
            else {  //Suppviz
                jt.byId("yrmgrctrlsdiv").style.display = "none";
                jt.byId("fsddiv").style.display = "none";
                svmgr.displayVisualizations("pointsdispdiv"); } },
        filterPoints: function () {
            var pts = [];
            aggmgr.getPoints().forEach(function (pt) {
                if(yrmgr.isMatchingPoint(pt) &&
                   srchmgr.isMatchingPoint(pt)) {
                    pts.push(pt); } });
            filtmgr.state.pts = pts;
            return pts; },
        points: function () {
            return filtmgr.state.pts; }
    };


    var picmgr = {
        picsrc: function (pt) {
            var src = app.dr("img/ptplaceholder.png");
            if(pt.pic) {
                src = app.dr("/api/obimg") + "?dt=Point&di=" + pt.dsId +
                    "&v=" + app.vtag(pt.modified); }
            return src; },
        getHTML: function (pt) {
            var attrs = {cla:"ptdpic", id:"ptdpic" + pt.dsId,
                         title:"Point " + pt.dsId,
                         src:picmgr.picsrc(pt)};
            if(editmgr.status(pt).editable) {
                attrs.style = "cursor:pointer;";
                attrs.onclick = mdfs("picmgr.prepUpload", pt.dsId); }
            return jt.tac2html(["img", attrs]); },
        prepUpload: function (ptid) {
            if(kebabmgr.showingMenu(ptid)) {
                kebabmgr.toggleKebabMenu(ptid, "close"); }
            //deal with outstanding edits before uploading to avoid sync issues
            else if(editmgr.saveButtonDisplayed(ptid)) {
                editmgr.save(ptid); }
            //only show upload menu if point already exists.
            else if(ptid && ptid !== "Placeholder") {
                picmgr.togglePicUpload(ptid, "show"); } },
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
                          onclick:mdfs("picmgr.togglePicUpload", ptid)}, "x"]],
                  ["form", {id:"picuploadform" + ptid, action:"/api/upldpic",
                            method:"post", target:"pumif" + ptid,
                            enctype:"multipart/form-data"},
                   [["input", {type:"hidden", name:"an", value:app.user.email}],
                    ["input", {type:"hidden", name:"at", value:app.user.tok}],
                    ["input", {type:"hidden", name:"ptid", value:ptid}],
                    ["label", {fo:"picfilein" + ptid}, "Upload point pic"],
                    ["input", {type:"file", id:"picfilein" + ptid, 
                               name:"picfilein", accept:"image/*",
                               onchange:mdfs("picmgr.enableUpldBtn", ptid)}],
                    //PENDING: image attribution input. Public domain for now.
                    ["div", {cla:"picupstatdiv", id:"picupstatdiv" + ptid}],
                    ["div", {cla:"picupfbsdiv", id:"picupfbsdiv" + ptid},
                     ["button", {type:"submit", id:"picuploadbutton" + ptid,
                                 //initially disabled via script below
                                 onclick:mdfs("picmgr.monitorUpload", 
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
                return jt.log("picmgr.monitorUpload exiting, no iframe"); }
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
                    picmgr.monitorUpload(ptid); }, 1000); }
            //upload complete, update image or report error
            txt = txt.body.innerHTML;
            if(txt.indexOf("Done: ") >= 0) {
                picmgr.uploadComplete(ptid); }
            else {
                picmgr.togglePicUpload(ptid, "hide");
                jt.err(txt); } },
        uploadComplete: function (ptid) {
            jt.out("picupstatdiv" + ptid, "Done.");
            app.refmgr.uncache("Point", ptid);
            app.refmgr.getFull("Point", ptid, function (pt) {
                jt.byId("ptdpic" + pt.dsId).src = picmgr.picsrc(pt);
                picmgr.togglePicUpload(pt.dsId, "hide");
                //need to update the timeline preb to include the pic info.
                //editmgr.save flow is overkill, but simpler to follow.
                aggmgr.addOrUpdatePoint(pt);
                ptdmgr.rebuildTimelinePoints(pt); }); },
        appendChangedValue: function () {
            return "No value appended, pic upload handled separately."; }
    };


    var helpmgr = {
        state: {},
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
            if(helpmgr.state.chgchkt) {
                clearTimeout(helpmgr.state.chgchkt); }
            helpmgr.state.chgchkt = setTimeout(function () {
                editmgr.pt4id(ptid, function (pt) {
                    //jt.log("checkForChanges updating save button");
                    editmgr.updateSaveButtonDisplay(pt);
                    helpmgr.state.chgchkt = null; }); }, 500); }
    };


    var placemgr = {
        makeTogglable: function (attrs, ptid) {
            attrs.onclick = mdfs("editmgr.togedit", ptid, "edit", attrs.id);
            attrs.style = "cursor:pointer;"; },
        makeEditable: function (attrs, ptid, placetext, helpsrcname) {
            attrs.contentEditable = "true";
            attrs["data-ptid"] = ptid;
            attrs["data-placetext"] = placetext;
            if(helpsrcname) {
                attrs["data-helpsrc"] = helpsrcname; }
            var focfstr = mdfs("placemgr.placeholdercheck", "event");
            attrs.onfocus = focfstr;
            attrs.onblur = focfstr;
            var chgfstr = mdfs("helpmgr.checkForChanges", ptid);
            attrs.onkeyup = chgfstr; },
        placeholdercheck: function (event) {
            var ptxt = event.target.dataset.placetext;
            //jt.log("placeholdercheck " + event.type + " " + event.target.id);
            if(event.type === "blur" && !event.target.innerText.trim()) {
                event.target.innerText = ptxt; }
            else if(event.type === "focus") {
                if(event.target.innerText === ptxt) {
                    event.target.innerHTML = ""; } }
            helpmgr.updateHelp(event); },
        togtext: function (divid, text) {
            var div = jt.byId(divid);
            if(div) {
                if(div.innerText.trim() === text) {
                    div.innerHTML = ""; }
                else {
                    div.innerHTML = text; } } }
    };


    var datemgr = {
        placeholder:"",
        getHTML: function (pt, sp) {
            var attrs = {cla:"ptddatediv", id:"ptddatediv" + pt.dsId};
            if(sp.mode === "edit") {
                datemgr.placeholder = sp.def.place;
                placemgr.makeEditable(attrs, pt.dsId, sp.def.place, 
                                      "datemgr"); }
            else if(editmgr.status(pt).editable) {
                placemgr.makeTogglable(attrs, pt.dsId); }
            return jt.tac2html(["div", attrs, pt.date || sp.def.place]); },
        help: function () {
            return {fpn:"Date", txt:"A date in general YYYY-MM-DD format.  Month and day can be omitted.  For years before the common era, use a preceding minus sign or a trailing ' BCE'. To make a timespan, put ' to ' between two dates.  Years can be decorated with a trailing 's' or '+' to indicate decades or beginnings e.g. 1920s or 1855+."}; },
        getValue: function (ptid) {
            var val = jt.byId("ptddatediv" + ptid).innerText || "";
            val = val.trim();
            if(val === datemgr.placeholder) {
                val = ""; }
            return val; },
        appendChangedValue: function (ptd, pt) {
            var val = datemgr.getValue(pt.dsId);
            if(val !== pt.date) {
                ptd.date = val; } },
        validate: function (ptid) {
            return datemgr.validateValue(datemgr.getValue(ptid)); },
        validateValue: function (val) {
            var res = {valid:false, msg:"A Date value is required."};
            if(!val) { return res; }
            var pd = datemgr.parseDateExpression(val);
            if(!pd.start) {
                res.msg = "Date value not recognized.";
                return res; }
            res.valid = datemgr.canonicalDate(pd.start);
            if(pd.end) {
                res.valid += " to " + datemgr.canonicalDate(pd.end); }
            res.msg = "";
            if(res.valid !== val) {
                res.msg = "Date value adjusted for validity."; }
            return res; },
        parseDateExpression: function (val) {
            var st; var en;
            [st, en] = val.split(" to ").map((d) => datemgr.parseDate(d));
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
                datemgr.mdpart(pd.month) + datemgr.mdpart(pd.day);
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
                       JSON.stringify(datemgr.validateValue(td))); }); }
    };


    var txtmgr = {
        placeholder:"",
        getHTML: function (pt, sp) {
            var attrs = {cla:"pttextdiv", id:"pttextdiv" + pt.dsId};
            if(sp.mode === "edit") {
                txtmgr.placeholder = sp.def.place;
                placemgr.makeEditable(attrs, pt.dsId, sp.def.place,
                                      "txtmgr"); }
            else if(editmgr.status(pt).editable) {
                placemgr.makeTogglable(attrs, pt.dsId); }
            return jt.tac2html(["div", attrs, pt.text || sp.def.place]); },
        help: function () {
            return {fpn:"Text", txt:"The text for the timeline point should describe the key event facts and impact. Be as clear and concise as possible. Max of 1200 characters."}; },
        getValue: function (ptid) {
            //Server cleans up any embedded HTML if any sneaks through
            var val = jt.byId("pttextdiv" + ptid).innerText || "";
            val = val.trim();
            if(val === txtmgr.placeholder) {
                val = ""; }
            return val; },
        appendChangedValue: function (ptd, pt) {
            var val = txtmgr.getValue(pt.dsId);
            if(val !== pt.text) {
                ptd.text = val; } },
        validate: function (ptid) {
            var val = txtmgr.getValue(ptid);
            var res = {valid:false, msg:"Text description is required."};
            if(!val) { return res; }
            if(val.length > 1200) {
                res.msg = "Text too long.";
                return res; }
            return {valid:true}; }
    };


    //Point Reference Manager.  To add a reference, fill in the blank
    //reference field, then hit return or blur to trigger the creation of
    //another blank reference field.  To delete a reference, delete all the
    //text in it.  An actual input control would allow a proper onchange
    //listener, but looks clunkier and doesn't allow for line wrapping.
    var prmgr = {
        verifyPointRefs: function (pt) {
            if(!pt.refs) { pt.refs = []; }
            if(typeof pt.refs === "string") {
                pt.dsType = "Point";  //verify dsType was set
                app.refmgr.deserialize(pt); }
            if(!Array.isArray(pt.refs)) {  //might have defaulted to {}
                pt.refs = []; } },
        getHTML: function (pt, sp) {
            var dm = sp.mode || "read";
            if(dm === "read" && editmgr.status(pt).editable) {
                dm = "editable"; }
            prmgr.verifyPointRefs(pt);
            return jt.tac2html(
                ["div", {cla:"ptrefsdiv", id:"ptrefsdiv" + pt.dsId},
                 prmgr.refshtml(pt.dsId, pt.refs, sp.def.place, dm)]); },
        refshtml: function (ptid, refs, plt, mode) {
            mode = mode || "edit";
            var html = refs.map(function (refstr, idx) {
                return prmgr.refhtml(ptid, idx, refstr, plt, mode); });
            if(mode === "edit") { //append blank reference field for adding
                html.push(prmgr.refhtml(ptid, refs.length, plt, plt)); }
            return jt.tac2html(html); },
        refhtml: function (ptid, idx, txt, plt, mode) {
            if(mode && mode !== "edit") {
                var attrs = prmgr.rdas(ptid, idx);
                if(mode === "editable") {
                    placemgr.makeTogglable(attrs, ptid); }
                return ["div", attrs, jt.linkify(txt)]; }
            return ["div", prmgr.rdas(ptid, idx, plt), txt]; },
        rdas: function (ptid, idx, place) {
            var divattrs = {cla:"ptrefstrdiv", id:"ptrefstrdiv" + ptid + idx};
            if(place) {  //editing
                placemgr.makeEditable(divattrs, ptid, place, "prmgr");
                divattrs["data-idx"] = idx;  //data-ptid set by makeEditable
                divattrs.onkeyup = mdfs("prmgr.refinput", "event"); }
            return divattrs; },
        refinput: function (event) {
            var ptid = event.target.dataset.ptid;
            var plt = event.target.dataset.placetext;
            helpmgr.checkForChanges(ptid);
            if(event.key === "Enter") {
                var refs = prmgr.refsFromHTML(ptid, plt);
                jt.out("ptrefsdiv" + ptid, prmgr.refshtml(ptid, refs, plt));
                uifoc("ptrefstrdiv" + ptid + refs.length); } },
        help: function () {
            return {fpn:"References", txt:"Each reference is a single line citation or full URL. References are strongly recommended for validation and further learning."}; },
        refsFromHTML: function (ptid, plt) {
            var pdiv = jt.byId("ptrefsdiv" + ptid);
            var refs = Array.from(pdiv.children).map((c) => c.innerText.trim());
            refs = refs.filter((x) => x && x !== plt);  //remove empty refs
            return refs; },
        appendChangedValue: function (ptd, pt, det) {
            var refs = prmgr.refsFromHTML(pt.dsId, det.def.place);
            if(JSON.stringify(refs) !== JSON.stringify(pt.refs)) {
                ptd.refs = refs; } }
    };


    var qtmgr = {
        qts:{C:{txt:"Continue", hlp:"Standard 'click to continue' response"},
             U:{txt:"Did You Know?", hlp:"New information Yes/No response"},
             D:{txt:"What Year?", hlp:"Click correct year to continue"},
             F:{txt:"Firsts", hlp:"'click to continue' response"}},
        getHTML: function (pt, sp) {
            pt.qtype = pt.qtype || "C";
            var divattrs = {cla:"ptqtdiv"};
            if(editmgr.status(pt).editable) {
                placemgr.makeTogglable(divattrs, pt.dsId); }
            var valhtml = qtmgr.qts[pt.qtype].txt || qtmgr.qts.C.txt;
            if(sp.mode === "edit") {
                var huf = mdfs("helpmgr.updateHelp", "event");
                var chf = mdfs("helpmgr.checkForChanges", pt.dsId);
                valhtml = jt.tac2html(
                    ["select", {id:"qtsel" + pt.dsId, "data-helpsrc":"qtmgr",
                                "data-ptid":pt.dsId, onfocus:huf, onblur:huf,
                                onchange:chf},
                     Object.entries(qtmgr.qts).map(function ([key, def]) {
                         var attrs = {value:key};
                         if(key === pt.qtype) {
                             attrs.selected = "selected"; }
                         return ["option", attrs, def.txt]; })]); }
            return jt.tac2html(
                ["div", divattrs,
                 [["span", {cla:"ptdetlabelspan"}, "Question Type: "],
                  ["span", {cla:"ptdetvaluespan"}, valhtml]]]); },
        help: function () {
            var dt = Object.values(qtmgr.qts).map(function (qt) {
                return ["tr", [["td", qt.txt], ["td", qt.hlp]]]; });
            return {fpn:"Question Type", txt:"The style of user interaction for this point." + jt.tac2html(["table", dt])}; },
        appendChangedValue: function (ptd, pt) {
            var sel = jt.byId("qtsel" + pt.dsId);
            if(sel) {
                var val = sel.options[sel.selectedIndex].value;
                if(val !== pt.qtype) {
                    ptd.qtype = val; } } }
    };


    var srcmgr = {
        placeholder:"",
        getHTML: function (pt, sp) {
            if(!pt.source && sp.mode !== "edit") { return ""; }
            var valattrs = {cla:"ptdetvaluespan", id:"srcdivspan" + pt.dsId};
            if(sp.mode === "edit") {
                srcmgr.placeholder = sp.def.place;
                placemgr.makeEditable(valattrs, pt.dsId, sp.def.place,
                                      "srcmgr"); }
            return jt.tac2html(
                ["div", {cla:"ptsourcediv"},
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
                    if(val === srcmgr.placeholder) {
                        val = ""; } } }
            return val; },
        appendChangedValue: function (ptd, pt) {
            var span = jt.byId("srcdivspan" + pt.dsId);
            if(span) {
                var val = srcmgr.getValue(pt.dsId);
                if(val !== pt.source) {
                    ptd.source = val; } } }
    };


    //While it would seemingly be convenient to create new values for
    //Communities/Regions/Categories/Tags while editing a point, in reality
    //showing these fields makes creating a new point feel like
    //substantially more work than it already is.  These fields should not
    //be displayed while editing if they are not being used.
    var tagmgr = {
        getHTML: function (pt, sp) {
            if(!pt[sp.fld] && sp.mode !== "edit") { return ""; }
            if(sp.mode !== "edit") {  //display existing value(s)
                return jt.tac2html(
                    ["div", {cla:"pttagdiv"},
                     [["span", {cla:"ptdetlabelspan"},
                       sp.fld.capitalize() + ": "],
                      ["span", {cla:"ptdetvaluespan"}, pt[sp.fld]]]]); }
            var tl = aggmgr.currTL("edit");
            if(!tl || !tl[sp.fld]) { return ""; }
            //PENDING: create a multi-select with the options
            return ""; },
        appendChangedValue: function () {
            return "tagmgr value input needed before appending changes"; }
    };


    var ptdmgr = {
        ptfd: {
            pic:{dv:"", mgr:picmgr},
            date:{dv:"", mgr:datemgr, place:"YYYY-MM-DD"},
            text:{dv:"", mgr:txtmgr, place:"Concise event description"},
            refs:{dv:[], mgr:prmgr, place:"[+ref]"},
            qtype:{dv:"C", mgr:qtmgr},
            source:{dv:"", mgr:srcmgr, place:"Id"},
            communities:{dv:"", mgr:tagmgr},
            regions:{dv:"", mgr:tagmgr},
            categories:{dv:"", mgr:tagmgr},
            tags:{dv:"", mgr:tagmgr},
            editors:{dv:""},  //server initializes on first save
            srclang:{dv:"en-US"},
            translations:{dv:""}},
        verifyFields: function (pt) {
            Object.entries(ptdmgr.ptfd).forEach(function ([fld, def]) {
                pt[fld] = pt[fld] || def.dv; }); },
        pointHTML: function (pt, m) {
            var html = [];
            Object.entries(ptdmgr.ptfd).forEach(function ([f, d]) {
                if(d.mgr) {
                    html.push(d.mgr.getHTML(pt, {fld:f, def:d,
                                                 mode:(m || "read")})); } });
            return jt.tac2html(html); },
        redisplay: function (pt, mode) {
            ptdmgr.verifyFields(pt);
            jt.out("pddiv" + pt.dsId, ptdmgr.pointHTML(pt, mode));
            editmgr.updateSaveButtonDisplay(pt); },  //may have been showing
        pointChangeData: function (pt) {
            var ptd = {dsType:"Point",
                       dsId:pt.dsId || "",
                       modified:pt.modified || "",
                       editors:pt.editors || app.user.acc.dsId,
                       srctl:pt.srctl || aggmgr.currTL("edit").dsId};
            Object.entries(ptdmgr.ptfd).forEach(function ([f, d]) {
                if(d.mgr) {
                    d.mgr.appendChangedValue(ptd, pt, {fld:f, def:d}); } });
            if(ptd.dsId === "Placeholder") { ptd.dsId = ""; }
            return ptd; },
        fieldsChanged: function (pt) {
            var ptd = ptdmgr.pointChangeData(pt);
            return Object.entries(ptdmgr.ptfd)
                .some(function ([k, d]) { return d.mgr && ptd[k]; }); },
        rebuildTimelinePoints: function (updpt) {
            var tl = aggmgr.currTL("edit");
            var pts = aggmgr.getPoints()
                .filter((pt) => pt.srctl === tl.dsId || pt.mixin);
            var tldat = {dsType:"Timeline", dsId:tl.dsId, modified:tl.modified,
                         name:tl.name, slug:tl.slug,  //verified on each save
                         cids:pts.map((pt) => pt.dsId).join(",")};
            tldat = app.refmgr.postdata(tldat);
            jt.call("POST", "/api/updtl?" + app.auth(), tldat,
                    function (obs) {
                        app.refmgr.put(app.refmgr.deserialize(obs[0]));
                        dispmgr.displayPoints(filtmgr.filterPoints()); },
                    function (code, errtxt) {
                        //PENDING: Admin mail explaining that the timeline
                        //cids will need to be rebuilt from from the Points
                        //referencing by srctl. Then the preb will need to
                        //be rebuilt.  If this was a network hiccup, there
                        //is a chance they could retry and have it work. Put
                        //this in a recovery dialog.
                        jt.err("Timeline points rebuild failed " + code +
                               ": " + errtxt);
                        editmgr.updateSaveButtonDisplay(updpt); },
                    jt.semaphore("ptdmgr.rebuildTimelinePoints")); }
    };


    var kebabmgr = {
        getHTML: function (pt) {
            return jt.tac2html(
                ["a", {href:"#moreactions", title:"More actions...",
                       id:"kebaba" + pt.dsId,
                       onclick:mdfs("kebabmgr.toggleKebabMenu", pt.dsId)},
                 "&#x22EE;"]); },  //vertical ellipsis
        showingMenu: function (ptid) {
            var kmd = jt.byId("kebabmenudiv" + ptid);
            return kmd && kmd.style.display === "block"; },
        toggleKebabMenu: function (ptid, cmd) {
            var kmd = jt.byId("kebabmenudiv" + ptid);
            if(cmd === "open" || kmd.style.display === "none") {
                kmd.style.display = "block";
                jt.byId("kebaba" + ptid).style.fontWeight = "bold";
                editmgr.pt4id(ptid, kebabmgr.rebuildKebabActions); }
            else {
                kmd.style.display = "none";
                jt.byId("kebaba" + ptid).style.fontWeight = "normal"; } },
        rebuildKebabActions: function (pt) {
            var edst = editmgr.status(pt);
            var mas = [
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
                                   onclick:mdfs("kebabmgr." + ma.id, pt.dsId)},
                             ma.tx]]; }))); },
        copy: function (ptid) {
            kebabmgr.toggleKebabMenu(ptid, "close");
            jt.err("Copy point not implemented yet"); },
        edit: function (ptid) {
            kebabmgr.toggleKebabMenu(ptid, "close");
            editmgr.togedit(ptid, "edit"); },
        noadd: function () {
            kebabmgr.toggleKebabMenu("Placeholder", "close");
            jt.byId("trowdivPlaceholder").remove(); },
        cancel: function (ptid) {
            kebabmgr.toggleKebabMenu(ptid, "close");
            editmgr.togedit(ptid, "read"); },
        delete: function (ptid) {
            kebabmgr.toggleKebabMenu(ptid, "close");
            jt.err("Delete point not implemented yet"); }
    };


    var editmgr = {
        editing: function (ptid) {
            var datediv = jt.byId("ptddatediv" + ptid);
            return (datediv && datediv.isContentEditable); },
        status: function (pt) {
            var state = {editable:false, cancelable:false, editing:false};
            if(app.user && app.user.acc) {
                pt.editors = pt.editors || "";  //legacy compiled points
                if((!pt.dsId || pt.dsId === "Placeholder") ||
                   (pt.editors.csvcontains(app.user.acc.dsId) &&
                    (aggmgr.currTL("edit").dsId === pt.srctl))) {
                    state.editable = true; }
                if(editmgr.editing(pt.dsId)) {
                    state.editing = true; }
                if(pt.dsId && pt.dsId !== "Placeholder") {
                    state.cancelable = true; } }
            return state; },
        pt4id: function (ptid, cbf) {
            if(ptid === "Placeholder") {
                return cbf({dsType:"Point", dsId:"Placeholder"}); }
            var pt = app.refmgr.cached("Point", ptid);
            if(pt) { return cbf(pt); }
            jt.out("saveprocmsgdiv" + ptid, "Fetching full Point data...");
            app.refmgr.getFull("Point", ptid, function (pt) {
                jt.out("saveprocmsgdiv" + ptid, "");
                if(!pt) {
                    return jt.err("Point data retrieval failed."); }
                cbf(pt); }); },
        editCtrlsSideHTML: function (pt) {
            if(aggmgr.state.mode !== "tledit") { return ""; }
            return jt.tac2html(
                [["div", {cla:"ecscbdiv"}, editmgr.cbIncHTML(pt)],
                 ["div", {cla:"ecskmdiv"}, kebabmgr.getHTML(pt)],
                 ["div", {cla:"ecspldiv"}, editmgr.plusHTML(pt)]]); },
        editCtrlsBottomHTML: function (pt) {
            return jt.tac2html(
                ["div", {cla:"ecbcdiv", id:"ecbcdiv" + pt.dsId},
                 [["div", {id:"saveprocmsgdiv" + pt.dsId}],
                  ["div", {cla:"saveptbdiv", id:"saveptbdiv" + pt.dsId},
                   ["button", {type:"button", id:"saveptb" + pt.dsId,
                               style:"display:none;",
                               onclick:mdfs("editmgr.save", pt.dsId)},
                    "Save"]]]]); },
        updateSaveButtonDisplay: function (pt, disp) {
            if(!disp) {
                if(pt.dsId === "Placeholder" || ptdmgr.fieldsChanged(pt)) {
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
            var tl = aggmgr.currTL("edit");
            if(!tl.dsId || tl.dsId === "new") {
                jt.out("saveprocmsgdiv" + ptid,
                       "Save timeline to write points to it.");
                return false; }
            var vds = [datemgr, txtmgr]; var vm = {valid:true};
            vds.forEach(function (vd) {
                if(vm.valid) {
                    vm = vd.validate(ptid); } });
            if(!vm.valid) {
                jt.out("saveprocmsgdiv" + ptid, vm.msg);
                return false; }
            return true; },
        save: function (ptid) {
            if(!editmgr.validate(ptid)) { return; }
            jt.out("saveprocmsgdiv" + ptid, "Saving...");
            editmgr.updateSaveButtonDisplay({dsId:ptid}, "none");
            editmgr.pt4id(ptid, function (pt) {
                var ptdat = ptdmgr.pointChangeData(pt);
                ptdat = app.refmgr.postdata(ptdat);
                jt.call("POST", "/api/updpt?" + app.auth(), ptdat,
                        function (obs) {
                            jt.log("Point " + obs[0].dsId + " saved.");
                            jt.out("saveprocmsgdiv" + ptid,
                                   "Saved. Updating Timeline...");
                            app.refmgr.put(app.refmgr.deserialize(obs[0]));
                            aggmgr.addOrUpdatePoint(obs[0]);
                            ptdmgr.rebuildTimelinePoints(pt); },
                        function (code, errtxt) {
                            editmgr.updateSaveButtonDisplay(pt, "inline");
                            jt.out("saveprocmsgdiv" + pt.dsId, "Error " + code +
                                   ": " + errtxt); },
                        jt.semaphore("editmgr.save")); }); },
        cbIncHTML: function (pt) {
            //pt may be from previous mix-in from another url
            if(editmgr.status(pt).editable) { return ""; }
            return jt.tac2html(
                ["input", {type:"checkbox", id:"cbinc" + pt.dsId,
                           value:pt.dsId, title:"Include Point in Timeline",
                           checked:jt.toru(pt.mixin),
                           onchange:mdfs("editmgr.toginc", pt.dsId)}]); },
        toginc: function (ptid) {
            var pt = aggmgr.getPoints().find((pt) => pt.dsId === ptid);
            pt.mixin = jt.byId("cbinc" + pt.dsId).checked; },
        plusHTML: function (pt) {
            if(pt.dsId === "Placeholder") { return ""; }
            return jt.tac2html(
                ["a", {href:"#add", title:"Add new point",
                       onclick:mdfs("editmgr.addNewPoint", pt.dsId)},
                 "+"]); },
        addNewPoint: function (pt) {
            var pp = {dsType:"Point", dsId:"Placeholder"};
            pt = aggmgr.resolvePoint(pt, pp);
            var parentdiv = jt.byId("pointsdispdiv");
            var ptdiv = jt.byId("trowdiv" + pt.dsId);
            var placediv = jt.byId("trowdivPlaceholder");
            if(placediv) {  //already created
                parentdiv.removeChild(placediv); }
            else {  //make a placeholder div
                placediv = dispmgr.makePointDiv(pp); }
            if(ptdiv) {  //put placeholder after current point
                ptdiv.after(placediv); }
            else { //put placeholder first
                var pts = aggmgr.getPoints();
                ptdiv = null;
                if(pts.length) {
                    ptdiv = jt.byId("trowdiv" + pts[0].dsId); }
                if(ptdiv) { //first row already rendered
                    ptdiv.before(placediv); }
                else {
                    parentdiv.appendChild(placediv); } }
            editmgr.togedit("Placeholder", "edit", "ptddatedivPlaceholder"); },
        togedit: function (ptid, mode, focdivid) {
            //jt.log("togedit " + ptid + " " + mode + " " + mgrname);
            var curredit = editmgr.editing(ptid);
            var togedit = !curredit;
            if(mode) {
                if(mode === "read") { togedit = false; }
                if(mode === "edit") { togedit = true; } }
            if(togedit && !curredit) {
                stgmgr.saveIfModified(); }
            //only redisplay if the mode has changed. keep interim state.
            if(curredit !== togedit || focdivid) {
                //canceling current edit or starting a new edit, redisplay
                editmgr.pt4id(ptid, function (pt) {
                    ptdmgr.redisplay(pt, mode);
                    if(focdivid) {
                        uifoc(focdivid); } }); } }
    };


    var dispmgr = {
        display: function (mode) {
            //datemgr.test();
            app.mode.chmode("reference");  //verify screen elements visible
            mode = aggmgr.init(mode || "refdisp");
            jt.out("tcontdiv", jt.tac2html(
                [["div", {id:"tcontheaddiv"},
                  [["div", {id:"aggctrlsdiv"}],
                   ["div", {id:"filtctrlsdiv"}],
                   ["div", {id:"editctrlsdiv"}]]],
                 ["div", {id:"pointsdispdiv"}]]));
            aggmgr.updateControls();  //calls filtmgr.updateControls
            dispmgr.adjustPointsAreaDisplayHeight();
            aggmgr.tlchg((mode === "tledit")? "edsel" : ""); }, //update display
        adjustPointsAreaDisplayHeight: function () {
            var ptsh = window.innerHeight - 
                (jt.byId("tcontheaddiv").offsetHeight + 30);
            jt.byId("pointsdispdiv").style.height = String(ptsh) + "px"; },
        displayPoints: function (pts) {
            jt.out("pointsdispdiv", "");  //reset content
            if(!pts || !pts.length) {
                if(aggmgr.state.mode === "tledit") {
                    return editmgr.addNewPoint(); }
                return jt.out("pointsdispdiv", "No timeline points."); }
            var outdiv = jt.byId("pointsdispdiv");
            pts.forEach(function (pt) {
                if(!pt.stats || pt.stats.status !== "deleted") {
                    var ptdiv = dispmgr.makePointDiv(pt);
                    outdiv.appendChild(ptdiv); } }); },
        makePointDiv: function (pt) {
            var ptdiv = document.createElement("div");
            ptdiv.className = "trowdiv";
            ptdiv.id = "trowdiv" + pt.dsId;
            ptdiv.innerHTML = dispmgr.pointHTML(pt);
            return ptdiv; },
        pointHTML: function (pt) {
            return jt.tac2html(
                [["div", {cla:"pddiv", id:"pddiv" + pt.dsId},
                  ptdmgr.pointHTML(pt)],
                 ["div", {cla:"ecbdiv", id:"ecbdiv" + pt.dsId},
                  editmgr.editCtrlsBottomHTML(pt)],
                 ["div", {cla:"ecsidediv", id:"ecsidediv" + pt.dsId},
                  editmgr.editCtrlsSideHTML(pt)],
                 ["div", {cla:"kebabmenudiv", id:"kebabmenudiv" + pt.dsId,
                          style:"display:none"}],
                 ["div", {cla:"picuploaddiv", id:"picuploaddiv" + pt.dsId,
                          style:"display:none"}]]); }
    };


    return {
        display: function (mode) { dispmgr.display(mode); },
        runsv: function (svmodule) { app[svmodule].display(); },
        managerDispatch: function (mgrname, fname, ...args) {
            switch(mgrname) {
            case "aggmgr": return aggmgr[fname].apply(app.tabular, args);
            case "featmgr": return featmgr[fname].apply(app.tabular, args);
            case "tfmgr": return tfmgr[fname].apply(app.tabular, args);
            case "stgmgr": return stgmgr[fname].apply(app.tabular, args);
            case "yrmgr": return yrmgr[fname].apply(app.tabular, args);
            case "srchmgr": return srchmgr[fname].apply(app.tabular, args);
            case "dlmgr": return dlmgr[fname].apply(app.tabular, args);
            case "svmgr": return svmgr[fname].apply(app.tabular, args);
            case "filtmgr": return filtmgr[fname].apply(app.tabular, args);
            case "picmgr": return picmgr[fname].apply(app.tabular, args);
            case "helpmgr": return helpmgr[fname].apply(app.tabular, args);
            case "placemgr": return placemgr[fname].apply(app.tabular, args);
            case "datemgr": return datemgr[fname].apply(app.tabular, args);
            case "txtmgr": return txtmgr[fname].apply(app.tabular, args);
            case "prmgr": return prmgr[fname].apply(app.tabular, args);
            case "qtmgr": return qtmgr[fname].apply(app.tabular, args);
            case "srcmgr": return srcmgr[fname].apply(app.tabular, args);
            case "tagmgr": return tagmgr[fname].apply(app.tabular, args);
            case "ptdmgr": return ptdmgr[fname].apply(app.tabular, args);
            case "kebabmgr": return kebabmgr[fname].apply(app.tabular, args);
            case "editmgr": return editmgr[fname].apply(app.tabular, args);
            case "dispmgr": return dispmgr[fname].apply(app.tabular, args);
            default: jt.log("tabular.managerDispatch unknown manager: " +
                            mgrname); } }
    };
}());
