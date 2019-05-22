/*jslint node, multivar, white, fudge */
/*property
    argv, forEach, indexOf
*/

//////////////////////////////////////////////////
// Read a json data file of data points and upload them.

var ptupld = (function () {
    "use strict";

    var server = "http://localhost:9080",
        jsonfn = "",
        email = "",
        password = "",
        slug = "",
        acc = null,
        authtok = "",
        tl = null,
        impts = null,
        imidx = 0,
        org = null,
        orgid = "0",  //TODO: get rid of this
        //npm install request
        request = require("request"),
        fs = require("fs"),
        readline = require("readline");


    function usage () {
        console.log("Usage:");
        console.log("node ptimport.js email password slug [file] [host]");
        //Main server deploy https://usracehistory-195216.appspot.com/updpt
        console.log("    file defaults to " + jsonfn);
        console.log("    host defaults to " + server);
        console.log("    user must be lev 2 (admin) for their organization");
        //Reading a password interactively with asterisks is not simple yet.
        console.log("If you are concerned about your password hanging around in plaintext in your console log, you might want to change it before starting the upload, then change it back after");
    }


    function pointline (pt) {
        return pt.instid + " " + pt.date + " " + pt.text.slice(0, 50);
    }


    function findPointByField (field, val, pts) {
        for(var i = 0; i < pts.length; i += 1) {
            if(pts[i][field] === val) {
                return pts[i]; } }
        return null;
    }


    function createOrUpdatePoint (ipt, contf) {
        var formdat, posturl = server + "/updpt", verb = "Updated ",
            upt = findPointByField("codes", ipt.instid, tl.points);
        if(!upt) {
            var rp = org.recpre[0];
            upt = findPointByField("codes", ipt.instid, org.recpre); }
        if(!upt) {
            verb = "  Added ";
            upt = JSON.parse(JSON.stringify(ipt));
            upt.codes = ipt.instid;
            upt.instid = ""; }
        formdat = {email:email, authtok:authtok, ptid:upt.instid,
                   date:ipt.date, 
                   text:ipt.text,
                   refs:JSON.stringify(ipt.refs || []),
                   qtype:ipt.qtype, 
                   groups:ipt.groups,
                   regions:ipt.regions,
                   categories:ipt.categories, 
                   tags:ipt.tags, 
                   codes:upt.codes,
                   orgid:acc.orgid,
                   source:ipt.source || "",
                   srclang:ipt.srclang || "", 
                   translations:JSON.stringify(ipt.translations || []),
                   stats:JSON.stringify(ipt.stats || {})};
        // Object.keys(formdat).forEach(function (key) {
        //     console.log(key + ": " + formdat[key]); });
        if(fs.existsSync(ipt.instid + ".png")) {
            formdat.pic = fs.createReadStream(ipt.instid + ".png"); }
        var pc = {url:posturl, formData:formdat};
        request.post(pc, function (error, response, body) {
            if(error) {
                return console.log("createOrUpdatePoint: " + error); }
            if(body.indexOf("failed") >= 0) {
                return console.log("createOrUpdatePoint: " + body); }
            upt.instid = body.slice("ptid: ".length);
            console.log(verb + pointline(upt));
            tl.cids = tl.cids.csvappend(upt.instid);
            contf(); });
    }


    function updateTimeline() {
        var formdat, posturl = server + "/updtl";
        console.log("Updating " + tl.slug + ", cids: " + tl.cids);
        formdat = {email:email, authtok:authtok, instid:tl.instid,
                   name:tl.name, slug:tl.slug, title:tl.title, 
                   subtitle:tl.subtitle, lang:tl.lang, comment:tl.comment,
                   about:tl.about, ctype:tl.ctype, cids:tl.cids, svs:tl.svs};
        var pc = {url:posturl, formData:formdat};
        request.post(pc, function (error, response, body) {
            if(error) {
                return console.log("updateTimeline: " + error); }
            console.log("Timeline updated"); });
    }


    function importPoints () {
        if(imidx < impts.length) {
            var pt = impts[imidx], fn = pt.instid + ".png";
            imidx += 1; 
            if(pt.pic && pt.picurl && !fs.existsSync(fn)) {
                return console.log("importPoints missing " + fn); }
            return createOrUpdatePoint(pt, importPoints); }
        updateTimeline();
    }


    function loadOrgPointsAndImport () {
        tl.cids = "";  //rebuilt from imported points
        console.log("Loading organization points to avoid creating dupes");
        var url = server + "/getorg?orgid=" + acc.orgid +
            "&email=" + email + "&authtok=" + authtok;
        request.get(url, function (err, response, body) {
            if(err) {
                return console.log("loadOrgPointsAndImport " + err); }
            var ret = JSON.parse(body);
            org = ret[0];
            org.recpre = JSON.parse(org.recpre);
            console.log(org.name + ": " + org.recpre.length + " points");
            //console.log("    " + pointline(org.recpre[0]));
            importPoints(); });
    }


    function loadExistingPoint (idx, contf) {
        var url = server + "/ptdat?pointid=" + tl.points[idx] +
            "&email=" + email + "&authtok=" + authtok;
        request.get(url, function (err, response, body) {
            if(err) {
                return console.log("loadExistingPoint " + tl.points[idx] + 
                                   " " + err); }
            var ret = JSON.parse(body);
            tl.points[idx] = ret[0];
            contf(); });
    }


    function confirmPointOrphaning () {
        tl.points = tl.points || tl.cids.csvarray();
        for(var i = 0; i < tl.points.length; i += 1) {
            if(typeof tl.points[i] === "string") {
                return loadExistingPoint(i, confirmPointOrphaning); } }
        var orphans = [];
        tl.points.forEach(function (xp) {
            if(!xp.codes || !findPointByField("instid", xp.codes, impts)) {
                orphans.push(xp); } });
        if(orphans.length) {
            console.log("The following points will be orphaned on import:");
            orphans.forEach(function (pt) {
                console.log("    " + pointline(pt)); });
            var rl = readline.createInterface({input: process.stdin,
                                               output: process.stdout});
            rl.question("Continue? ", function (answer) {
                rl.close();
                if(!answer.startsWith("y")) {
                    return console.log("Quitting."); }
                else {
                    loadOrgPointsAndImport(); } }); }
        else {
            loadOrgPointsAndImport(); }
    }


    function downloadImages () {
        if(imidx >= impts.length) {
            imidx = 0;
            return confirmPointOrphaning(); }
        var pt = impts[imidx];
        imidx += 1;
        if(pt.pic && pt.picurl && !fs.existsSync(pt.instid + ".png")) {
            console.log("    downloading " + pt.picurl);
            request(pt.picurl)
                .pipe(fs.createWriteStream(pt.instid + ".png"))
                .on('close', downloadImages); }
        else {
            downloadImages(); }
    }


    function processImportFile () {
        jsonfn = jsonfn || slug + ".json";
        if(!fs.existsSync(jsonfn)) {
            console.log("    " + jsonfn + " not found, trying pastkey.json");
            jsonfn = "pastkey.json"; }
        fs.readFile(jsonfn, "utf8", function (err, content) {
            if(err) {
                return console.log("processImportFile: " + err); }
            impts = JSON.parse(content);
            imidx = 0;
            downloadImages(); });
    }


    function verifyTimeline () {
        var url = server + "/fetchtl?slug=" + slug;
        request.get(url, function (err, response, body) {
            if(err) {
                return console.log("verifyTimeline: " + err); }
            var ret = JSON.parse(body);
            if(!ret.length) {
                return console.log("No timeline found for slug: " + slug); }
            tl = ret[0];
            console.log(tl.slug + ": " + tl.name + " has " +
                        tl.cids.csvarray().length + " existing points");
            //Existing points that are not previously imported (and mappable
            //via the id saved in codes) will be lost from the timeline.
            //Not dealing with sorting points, or updating preb, or any of
            //the other things the main app usually does.
            processImportFile(); });
    }


    function checkUserOrgLevel () {
        var url = server + "/acctok?email=" + email + "&password=" + password;
        request.get(url, function (err, response, body) {
            if(err) {
                return console.log("checkUserOrgLevel: " + err); }
            var ret = JSON.parse(body);
            acc = ret[0];
            authtok = ret[1].token;
            console.log(acc.email + " org: " + acc.orgid + " lev: " + acc.lev);
            if(acc.lev < 2) {
                return console.log("You must be an org admin to import."); }
            verifyTimeline(); });
    }



    function verifyHelperFuncs () {
        if (!String.prototype.csvarray) {
            String.prototype.csvarray = function () {
                if (this && this.trim()) {
                    return this.split(",");
                }
                return [];
            };
        }
        if (!String.prototype.csvappend) {
            String.prototype.csvappend = function (val) {
                var csv = this || "";
                csv = csv.trim();
                if (csv) {
                    csv += ",";
                }
                csv += val;
                return csv;
            };
        }
    }


    function uploadData () {
        if(!process.argv[2]) {
            return usage(); }
        global.app = {};
        email = process.argv[2];
        password = process.argv[3];
        slug = process.argv[4]
        if(!email || !password || !slug) {
            return usage(); }
        if(process.argv[5]) {
            jsonfn = process.argv[5]; }
        if(process.argv[6]) {
            server = process.argv[6]; }
        verifyHelperFuncs();
        checkUserOrgLevel();
    }


    return {
        run: function () { uploadData(); }
    };
}())


ptupld.run();

