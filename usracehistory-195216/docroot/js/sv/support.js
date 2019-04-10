/*jslint browser, multivar, white, fudge, long */
/*global app, window, jt, d3 */

app.support = (function () {
    "use strict";

    var chdet = {remind:{enabled:"Email me a reminder if I don't finish today.",
                         tron:"Enabling...",
                         troff:"Disabling...",
                         disabled:"Enable reminders."}},
        dispdef = {
        ////////////////////////////////////////
        share:{title:"Share", content:[
            ["div", {id:"tlnamediv", cla:"suppheadingdiv"}],
            ["div", {id:"socsharediv"}],
            ["p", "Questions or comments? Issues are tracked on <span id=\"supghsp\">github</span>, or you can <span id=\"supiemsp\">email us</span>."],
            ["div", {id:"donatediv"}]],
               repls:[
                   {id:"tlnamediv", func:"tlnameHTML"},
                   {id:"socsharediv", func:"socshareHTML"},
                   {id:"donatediv", func:"donateHTML"},
                   {id:"supghsp", url:"https://github.com/theriex/rh/issues"},
                   {id:"supiemsp", em:"support", delay:1000}]},
        ////////////////////////////////////////
        about:{title:"About", content:[
            ["p", "PastKey was created to promote understanding and respect for the context of people whose histories are frequently ignored.  You are encouraged to check points for yourself, knowledge evolves over time and history has multiple perspectives."],
            ["div", {id:"tlaboutdiv", cla:"timelineaboutdiv"}],
            ["p", "Thanks to our member organizations for their essential contributions and guidance."],
            ["If your organization would like to manage its own data, or commission a visualization, <span id=\"suporgesp\">get in touch</span>."]],
               repls:[
                   {id:"tlaboutdiv", func:"tlaboutHTML"},
                   {id:"suporgesp", em:"contact", delay:1000}]},
        ////////////////////////////////////////
        chapter:{title:"End of Chapter <span id=\"chnsp\"></span>", content:[
            ["p", "You covered <span id=\"chptcsp\">_</span> points <span id=\"chyfsp\"></span> <span id=\"chytsp\"></span>."],
            ["div", {id:"remdiv"},
             [["input", {type:"checkbox", id:"cbrem", checked:"checked"}],
              ["label", {fo:"cbrem", id:"labrem"}, chdet.remind.enabled]]],
            ["div", {id:"revisitdiv", style:"padding:20px 0px 5px 0px;"},
             "To revisit any of these points, switch to reference mode from the menu."],
            ["div", {id:"sv0textdiv"}, ""], //instruction details as needed
            ["div", {id:"sv0linkdiv"}, ""], //bookmark/homescreen instructions
            ["div", {id:"suppclosediv"},
             ["button", {type:"button", cla:"ghostbutton", id:"contbutton"},
              "Continue"]]]}};


    function replace (def, tl) {
        var emd = "@pastkey.org";
        if(!def.repls) { return; }
        def.repls.forEach(function (rep) {
            if(rep.url && jt.byId(rep.id)) {
                jt.out(rep.id, jt.tac2html(
                    ["a", {href:rep.url,
                           onclick:jt.fs("window.open('" + rep.url + "')")},
                     jt.byId(rep.id).innerHTML])); }
            else if(rep.em) {
                jt.out(rep.id, jt.tac2html(
                    ["a", {href:"mailto:" + rep.em + emd},
                     jt.byId(rep.id).innerHTML])); }
            else if(rep.txt) {
                jt.out(rep.id, rep.txt); }
            else if(rep.click) {
                jt.on(rep.id, "click", rep.click); }
            else if(rep.ff) {  //fill function handles change and output
                rep.ff(); }
            else if(rep.func) {
                app.support[rep.func](rep.id, tl); }
        });
    }


    function display (tl, dc) {
        var def = dispdef[dc], currpt, html, svd, contheight;
        currpt = app.mode.currpt();
        if(currpt) {  //return to the same point after this display is done.
            app.db.unvisitPoint(currpt);
            app.mode.requeue(currpt); }
        html = [["div", {id:"suppxdiv"},
                 ["a", {href:"#close",
                        onclick:jt.fs("app.support.close()")}, "x"]],
                ["div", {id:"supptitlediv"}, def.title],
                ["div", {id:"suppcontentdiv"}, def.content]];
        //Verify the dialog is hidden so there is no blink when the content
        //gets updated.  Set the content height so it's not truncated.
        svd = jt.byId("suppvisdiv");
        svd.style.visibility = "hidden";
        svd.innerHTML = jt.tac2html(html);
        contheight = tl.height - jt.byId("supptitlediv").offsetHeight;
        contheight -= 20;  //not too close to bottom
        jt.byId("suppcontentdiv").style.height = contheight + "px";
        jt.byId("suppcontentdiv").style.minHeight = contheight + "px";
        //give the content a few millis to render so it's not ignored
        setTimeout(function () {
            var dims = {w: Math.max(280, Math.round(0.5 * tl.width)),
                        h: Math.max(340, Math.round(0.7 * tl.height))};
            dims.l = Math.max(0, Math.round(0.5 * (tl.width - dims.w)));
            d3.select("#suppvisdiv")
                .style("left", dims.l + "px")
                .style("top", "20px")  //leave room for menu access
                .style("width", dims.w + "px")
                .style("height","50px")  //ensure title visible
                .style("background", "#f8feeb")
                .style("visibility", "visible")
                .transition().duration(2000)
                .style("height", dims.h + "px");
            setTimeout(function () {
                replace(def, tl); }, 800); }, 200);
    }


    function updateChapterDetails () {
        var dcon = app.db.displayContext(),
            ttl = dcon.points.length,  //total number of all points in timeline
            ppc = Math.ceil(ttl / 10),  //points per chapter (no leftover pts)
            cpl = dcon.prog.pts.csvarray().length,  //completed points length
            cch = Math.floor(cpl / ppc); //set or calc chapter num
        if(!chdet.chn && chdet.chn !== 0) {
            jt.log("updateChapterDetails initializing chapter num to " + cch);
            chdet.chn = cch; }
        chdet.pfc = cpl - (chdet.chn * ppc);  //points completed this chapter
        chdet.rem = ppc - chdet.pfc;  //how many remaining points in chapter
        jt.log("points remaining in chapter: " + chdet.rem);
        chdet.dcon = dcon;
        chdet.ttl = ttl;
        chdet.ppc = ppc;
        chdet.cpl = cpl;
    }


    function chapterHint () {
        if(chdet.chn >= 3 && !app.dlg.gendat().accepted) {
            return jt.out("sv0textdiv", "To see dates relative to your lifetime, click the \"Generations\" button on the interaction dialog."); }
        app.intro.initLinkText();
    }


    function toggleReminderSetting () {
        var cbrem = jt.byId("cbrem"), data,
            remval = "no",
            trans = chdet.remind.troff,
            compl = chdet.remind.disabled,
            fail = chdet.remind.enabled;
        if(cbrem.checked) {  //previously unchecked, now checked
            remval = "yes";
            trans = chdet.remind.tron;
            compl = chdet.remind.enabled;
            fail = chdet.remind.disabled; }
        jt.out("labrem", trans);
        app.db.displayContext().prog.remindme = remval;
        app.db.mergeProgToAccount();  //normalize updated prog with db state
        data = app.db.postdata("AppUser", app.user.acc);
        jt.call("POST", "updacc?" + app.auth(), data,
                function () {  //recently saved, local data up to date
                    jt.out("labrem", compl); },
                function (code, errtxt) {
                    jt.log("toggleReminderSetting " + code + ": " + errtxt);
                    jt.out("labrem", fail); },
                jt.semaphore("support.toggleReminderSetting"));
    }


    function reminderDisplay () {
        var prog = app.db.displayContext().prog;
        if(prog.remindme === "no") {
            jt.byId("cbrem").checked = false;
            jt.out("labrem", chdet.remind.disabled); }
        jt.on("cbrem", "click", toggleReminderSetting);
    }


    function chapterSummary (contf) {
        var progpts = [], yi = {};
        updateChapterDetails();
        progpts = chdet.dcon.prog.pts.csvarray();
        if(!contf) {
            return chdet; }
        chdet.chn += 1;  //starts at zero, incremented to current chapter
        yi.p = chdet.chn - 1;  //previous chapter number
        yi.s = yi.p * chdet.ppc;  //index of starting point
        yi.e = Math.min(((chdet.chn * chdet.ppc) - 1),  //index of ending point
                        (chdet.cpl - 1));
        yi.s = progpts[yi.s].split(";")[0];  //get id of point
        yi.s = app.db.pt4id(yi.s).start.year;  //get point for id
        yi.e = progpts[yi.e].split(";")[0];
        yi.e = app.db.pt4id(yi.e).start.year;
        dispdef.chapter.repls = [
            {id:"chnsp", txt:chdet.chn},
            {id:"chptcsp", txt:chdet.ppc},
            {id:"chyfsp", txt:"from " + yi.s},
            {id:"chytsp", txt:"to " + yi.e},
            {id:"sv0textdiv", ff:chapterHint},
            {id:"remdiv", ff:reminderDisplay},
            {id:"contbutton", click:contf}];
        display(app.linear.timeline(), "chapter");
        setTimeout(function () {
            jt.byId("contbutton").focus(); }, 2000);
    }


    function tlaboutHTML (divid, tl) {
        var abtxt = "";
        if(tl && tl.hc && tl.hc.dcon && tl.hc.dcon.lastTL) {
            abtxt = tl.hc.dcon.lastTL.about || ""; }
        if(abtxt) {
            jt.out(divid, abtxt); }
    }


    function socshareHTML (divid, tl) {
        //thanks to https://sharingbuttons.io/
        var dca = "resp-sharing-button resp-sharing-button--small";
        var dcb = "resp-sharing-button__icon resp-sharing-button__icon--solid";
        var dcon = app.db.displayContext();
        if(!dcon || !dcon.lastTL) {
            jt.log("socshareHTML can't share if no Timeline selected.");
            return; }
        var urlp = "https%3A%2F%2Fpastkey.org%2Ftimeline%2F" + 
            dcon.lastTL.slug || dcon.lastTL.instid;
        var tlnp = jt.dquotenc(dcon.lastTL.name);
        var tac = [
            //Twitter
            ["a", {cla:"resp-sharing-button__link",
                   href:"https://twitter.com/intent/tweet/?text=" + tlnp + 
                       "&amp;url=" + urlp,
                   target:"_blank", rel:"noopener", "aria-label":""},
             ["div", {cla:dca + " resp-sharing-button--twitter"},
              ["div", {"aria-hidden":"true", cla:dcb},
               ["svg", {xmlns:"http://www.w3.org/2000/svg",
                        viewBox:"0 0 24 24"},
                ["path", {d:"M23.44 4.83c-.8.37-1.5.38-2.22.02.93-.56.98-.96 1.32-2.02-.88.52-1.86.9-2.9 1.1-.82-.88-2-1.43-3.3-1.43-2.5 0-4.55 2.04-4.55 4.54 0 .36.03.7.1 1.04-3.77-.2-7.12-2-9.36-4.75-.4.67-.6 1.45-.6 2.3 0 1.56.8 2.95 2 3.77-.74-.03-1.44-.23-2.05-.57v.06c0 2.2 1.56 4.03 3.64 4.44-.67.2-1.37.2-2.06.08.58 1.8 2.26 3.12 4.25 3.16C5.78 18.1 3.37 18.74 1 18.46c2 1.3 4.4 2.04 6.97 2.04 8.35 0 12.92-6.92 12.92-12.93 0-.2 0-.4-.02-.6.9-.63 1.96-1.22 2.56-2.14z"}]]]]],
            //Facebook
            ["a", {cla:"resp-sharing-button__link", 
                   href:"https://facebook.com/sharer/sharer.php?u=" + urlp, 
                   target:"_blank", rel:"noopener", "aria-label":""},
             ["div", {cla:dca + " resp-sharing-button--facebook"},
              ["div", {"aria-hidden":"true", cla:dcb},
               ["svg", {xmlns:"http://www.w3.org/2000/svg",
                        viewBox:"0 0 24 24"},
                ["path", {d:"M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"}]]]]],
            //Email
            ["a", {cla:"resp-sharing-button__link",
                   href:"mailto:?subject=" + tlnp + "&amp;body=" + urlp,
                   target:"_self", rel:"noopener", "aria-label":""},
             ["div", {cla:dca + " resp-sharing-button--email"},
              ["div", {"aria-hidden":"true", cla:dcb},
               ["svg", {xmlns:"http://www.w3.org/2000/svg",
                        viewBox:"0 0 24 24"},
                ["path", {d:"M22 4H2C.9 4 0 4.9 0 6v12c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM7.25 14.43l-3.5 2c-.08.05-.17.07-.25.07-.17 0-.34-.1-.43-.25-.14-.24-.06-.55.18-.68l3.5-2c.24-.14.55-.06.68.18.14.24.06.55-.18.68zm4.75.07c-.1 0-.2-.03-.27-.08l-8.5-5.5c-.23-.15-.3-.46-.15-.7.15-.22.46-.3.7-.14L12 13.4l8.23-5.32c.23-.15.54-.08.7.15.14.23.07.54-.16.7l-8.5 5.5c-.08.04-.17.07-.27.07zm8.93 1.75c-.1.16-.26.25-.43.25-.08 0-.17-.02-.25-.07l-3.5-2c-.24-.13-.32-.44-.18-.68s.44-.32.68-.18l3.5 2c.24.13.32.44.18.68z"}]]]]]];
        jt.out(divid, jt.tac2html(tac));
    }


    function donateHTML (divid, tl) {
        var durl = "https://www.paypal.me/epinova";  //interim
        var html = [
            "Support the PastKey project ",
            ["button", {type:"button", id:"donatebutton",
                        onclick:jt.fs("window.open('" + durl + "')")},
             "Donate"]];
        jt.out(divid, jt.tac2html(html));
    }


    function tlnameHTML (divid, tl) {
        var dcon = app.db.displayContext();
        if(dcon && dcon.lastTL) {
            jt.out(divid, dcon.lastTL.name); }
    }


    return {
        display: function (tl, dc) { display(tl, dc); },
        close: function () {
            d3.select("#suppvisdiv")
                .style("visibility", "hidden");
            app.mode.chmode("same"); },
        chapter: function (contf) { return chapterSummary(contf); },
        tlaboutHTML: function (divid, tl) { tlaboutHTML(divid, tl); },
        socshareHTML: function (divid, tl) { socshareHTML(divid, tl); },
        donateHTML: function (divid, tl) { donateHTML(divid, tl); },
        tlnameHTML: function (divid, tl) { tlnameHTML(divid, tl); }
    };
}());
