/*jslint node, white, fudge */

/* 
cd /general/temp/rhport
ln -s /general/rh/ref/port/pull.js. pull.js
ln -s /general/rh/ref/port/datadefs.js datadefs.js
At port time, verify uids.tdf is up to date with GAE.  Then something like
node pull.js "mybatchid", 200
will download up to 200 per run items where existing json files do not have
a dltag of "mybatchid".
*/

/*
uids.tdf was created by querying in the GAE console, selecting all, copying
into a file, and editing.  Editing consisted of fixing the header line tag
to be tab delimited, and changing "Name/ID" to "importid".  For the values,
replace \tid= with "".  Same for orgs.tdf
*/

var puller = (function () {
    "use strict";

    var fs = require("fs");
    var https = require("https");
    var datadefs = require("./datadefs");

    var work = {pulled:0, entidx:0, ents:[
        {entity:"AppUser", fetch:"tag", tdf:"AppUsers.tdf",
         tsfs:{created:"created", modified:"accessed"},
         api:{url:"/pubuser", params:[{obf:"email", pnm:"email"}]}},
        {entity:"Organization", fetch:"tag", tdf:"Organizations.tdf",
         //Organization has no timestamp fields in source
         delflds:["pts"],  //Non JSON long dash, useless field
         api:{url:"/getorg", params:[{obf:"importid", pnm:"orgid"},
                                     {af:"email", pnm:"email"},
                                     {af:"authtok", pnm:"authtok"}]},
         refs:{obf:"recpre", ent:"Point"}},
        {entity:"Timeline", fetch:"tag", tdf:"Timelines.tdf",
         tsfs:{created:"created", modified:"modified"},
         api:{url:"/fetchtl", params:[{obf:"importid", pnm:"tlid"}]},
         refs:{obf:"preb", ent:"Point"}},
        {entity:"Point", fetch:"byref",
         tsfs:{created:"created", modified:"modified"},
         api:{url:"/ptdat", params:[{obf:"instid", pnm:"pointid"},
                                    {af:"email", pnm:"email"},
                                    {af:"authtok", pnm:"authtok"}]},
         img:{fld:"pic",
              url:"/ptpic", params:[{obf:"importid", pnm:"pointid"}]}},
        {entity:"TLComp", fetch:"perm", json:"TLComps.json",
         tsfs:{created:"created", modified:"created"}},
        {entity:"DayCount", fetch:"perm", tdf:"DayCounts.tdf"},
        {entity:"AppService", fetch:"perm", tdf:"AppServices.tdf"}]};


    var dwnr = {  //downloader handles https GET and merge
        completionFunc: null,
        dlpath: function (def, obj) {
            return def.entity + "/" + obj.importid + ".json"; },
        downloaded: function (def, obj, cbf) {
            var path = dwnr.dlpath(def, obj);
            if(!fs.existsSync(path)) { return cbf(null); }
            fs.readFile(path, "utf8", function (err, dat) {
                if(err) {
                    console.log("dwnr.downloaded " + path + ": " + err);
                    throw err; }
                try {
                    dat = JSON.parse(dat);
                } catch(e) {
                    return console.log("dwnr.downloaded " + path + ": " + e); }
                if(dat && (dat.dltag !== work.dltag)) {
                    dat = null; }
                cbf(dat); }); },
        getAuthentParam: function (paramname) {
            if(!work.authent) {
                var cook = fs.readFileSync("authcookie.txt", "utf8");
                cook = cook.split("..pastkey..");
                work.authent = {email:encodeURIComponent(cook[0]),
                                authtok:cook[1].trim()}; }
            return work.authent[paramname]; },
        urlForDownload: function (downdef, obj) {
            var url = downdef.url;
            downdef.params.forEach(function (pdef, idx) {
                if(!idx) {
                    url += "?"; }
                else {
                    url += "&"; }
                if(pdef.obf) { //field mapped parameter
                    url += pdef.pnm + "=" + encodeURIComponent(obj[pdef.obf]); }
                else if(pdef.af) {  //authentication mapped parameter
                    url += pdef.pnm + "=" + dwnr.getAuthentParam(pdef.af); } });
            return url; },
        downloadAndMerge: function (def, obj, contf) {
            dwnr.completionFunc = contf;
            var url = dwnr.urlForDownload(def.api, obj);
            console.log("download: " + url);
            work.pulled += 1;  //always update pull count even if call fails
            https.request({host:"pastkey.org", path:url},
                          function (res) {
                              var data = []; //array of buffers from each chunk
                              res.on("data", function (chunk) {
                                  data.push(chunk); });
                              res.on("end", function () {
                                  //concat all the buffers into one and use that
                                  data = Buffer.concat(data);
                                  dwnr.mergeData(def, obj, data); }); })
                .on("error", function (err) {
                    console.log(err.message); })
                .end(); }, //signal request ready for processing
        mergeTimestampFields: function (def, obj, dbo) {
            if(def.tsfs) {  //merge created/modified fields, warn if outdated
                Object.keys(def.tsfs).forEach(function (keyf) {
                    var dbf = def.tsfs[keyf];
                    if(obj[dbf] !== dbo[dbf]) {
                        console.log("WARNING: " + def.entity + obj.importid +
                                    " \"" + dbf + "\" value mismatch"); }
                    obj[keyf] = dbo[dbf]; }); }
            else {  //initialize values
                var ts = new Date().toISOString();
                obj.created = ts;
                obj.modified = ts; } },
        mergeData: function (def, obj, data) {
            var dbo = JSON.parse(data)[0];
            dwnr.mergeTimestampFields(def, obj, dbo);
            def.ddef.fields.forEach(function (fd) {  //merge public fields
                if(!datadefs.fieldIs(fd.d, "adm") &&
                   !datadefs.fieldIs(fd.d, "priv")) {
                    obj[fd.f] = dbo[fd.f] || ""; } });
            obj.dltag = work.dltag;
            if(!fs.existsSync(def.entity)) {  //verify download folder
                fs.mkdirSync(def.entity); }
            fs.writeFileSync(dwnr.dlpath(def, obj),
                             JSON.stringify(obj), "utf8");
            dwnr.completionFunc(obj); }
    };


    var picp = { //picpuller downloads saved image pngs.
        imgpath: function (def, obj) {
            return def.entity + "/images/" + obj.importid + ".png"; },
        missingImageData: function (def, obj) {
            if(!def.img || !obj[def.img.fld]) { 
                return false; }  //no image data for this obj
            var imgdn = def.entity + "/images";
            if(!fs.existsSync(imgdn)) {  //verify folder
                fs.mkdirSync(imgdn); }
            if(!fs.existsSync(picp.imgpath(def, obj))) {
                return true; }  //image data needed and not found
            return false; },
        downloadImage: function (def, obj, contf) {
            var url = dwnr.urlForDownload(def.img, obj);
            console.log("download: " + url);
            work.pulled += 1;  //always update pull count even if call fails
            https.request({host:"pastkey.org", path:url},
                          function (res) {
                              var data = []; //array of buffers from each chunk
                              res.on("data", function (chunk) {
                                  data.push(chunk); });
                              res.on("end", function () {
                                  //concat all the buffers into one and use that
                                  data = Buffer.concat(data);
                                  fs.writeFileSync(picp.imgpath(def, obj),
                                                   data, "binary");
                                  contf(); }); })
                .on("error", function (err) {
                    console.log(err.message); })
                .end(); } //signal request ready for processing
    };


    var refit = {  //reference iterator walks reference list
        completionFunc: null,
        verifyRefs: function (def, obj, contf) {
            if(!def.refs) { return contf(); }
            refit.completionFunc = contf;
            var ws = {idx:0, arr:JSON.parse(obj[def.refs.obf] || "[]"),
                      def:work.ents.find((e) => e.entity === def.refs.ent)};
            console.log("verifyRefs " + def.entity + obj.importid +
                        " " + def.refs.obf + ": " + ws.arr.length);
            entit.connectDataDefinitions(ws.def);
            refit.readNextRefObj(ws); },
        readNextRefObj: function (ws) {
            if((ws.idx >= ws.arr.length) || work.pulled >= work.maxpull) {
                return refit.completionFunc(); }
            var refobj = ws.arr[ws.idx];
            refobj.importid = refobj.instid;  //all refs are by instid
            dwnr.downloaded(ws.def, refobj, function (obj) {
                if(!obj) {
                    return dwnr.downloadAndMerge(ws.def, refobj, function () {
                        refit.readNextRefObj(ws); }); }
                if(picp.missingImageData(ws.def, obj)) {
                    return picp.downloadImage(ws.def, obj, function () {
                        refit.readNextRefObj(ws); }); }
                ws.idx += 1;
                refit.readNextRefObj(ws); }); }
    };


    var tdfit = {  //tab delimited file iterator walks tdf content
        completionFunc: null,
        walkTDF: function (def, contf) {
            tdfit.completionFunc = contf;
            def.tidx = 0;
            def.jsa = tdfit.tdf2jsonArray(fs.readFileSync(def.tdf, "utf8"));
            tdfit.deleteBadFields(def);
            console.log(def.tdf + " " + def.jsa.length + " objects" +
                        tdfit.latestmod(def));
            tdfit.readNextTDFObject(def); },
        readNextTDFObject: function (def) {
            var tdfo = def.jsa[def.tidx];
            dwnr.downloaded(def, tdfo, function (obj) {
                if(!obj) {
                    if(def.api) {  //have an endpoint to fetch from
                        return dwnr.downloadAndMerge(def, tdfo, function () {
                            tdfit.readNextTDFObject(def); }); }
                    //no endpoint available, just write what we have
                    return tdfit.writeTDFObjDirect(def, tdfo, function () {
                        tdfit.readNextTDFObject(def); }); }
                refit.verifyRefs(def, obj, function () {
                    def.tidx += 1;
                    if((def.tidx < def.jsa.length) &&
                       (work.pulled < work.maxpull)) {
                        return tdfit.readNextTDFObject(def); }
                    tdfit.completionFunc(); }); }); },
        fvs2obj: function (fields, values) {
            var jso = {};
            fields.forEach(function (field, idx) {
                jso[field] = values[idx] || "";
                jso[field] = jso[field].trim();  //tdf has extra spaces
                if(jso[field] === "null") {
                    jso[field] = ""; } });
            return jso; },
        tdf2jsonArray: function (data) {
            var fields = null;
            var jsa = [];
            data.split("\n").forEach(function (line) {
                if(line) {
                    if(!fields) {
                        fields = line.split("\t"); }
                    else {
                        var values = line.split("\t");
                        jsa.push(tdfit.fvs2obj(fields, values)); } } });
            return jsa; },
        deleteBadFields: function (def) {
            if(def.delflds) {
                def.delflds.forEach(function (fld) {
                    def.jsa.forEach(function (obj) {
                        delete obj[fld]; }); }); } },
        latestmod: function (def) {
            var retval = "";
            if(def.tsfs && def.tsfs.modified) {
                var modfield = def.tsfs.modified;
                var latest = def.jsa.reduce(function (acc, val) {
                    if(acc[modfield] > val[modfield]) { return acc; }
                    if(acc[modfield] < val[modfield]) { return val; }
                    return acc; });
                retval = ", last modified: " + latest[modfield]; }
            return retval; },
        writeTDFObjDirect: function (def, tdfo, contf) {
            if(tdfo.importid === def.lastTDFOWriteId) {
                return console.log("writeTDFObjDirect looping on " +
                                   def.entity + tdfo.importid); }
            def.lastTDFOWriteId = tdfo.importid;
            tdfo.dltag = work.dltag;
            if(!fs.existsSync(def.entity)) {  //verify download folder
                fs.mkdirSync(def.entity); }
            console.log("writeTDFObjDirect writing " + tdfo.importid);
            //write async to avoid execution getting too far ahead of file data
            fs.writeFile(dwnr.dlpath(def, tdfo),
                         JSON.stringify(tdfo), "utf8", contf); }
    };


    var jsonit = {
        readArray: function (def, contf) {
            var objs = JSON.parse(fs.readFileSync(def.json, "utf8"));
            console.log(def.json + " " + objs.length + " objects");
            objs.forEach(function (obj) {
                obj.importid = obj.instid;
                dwnr.mergeTimestampFields(def, obj, obj);
                jsonit.writeObjToFile(def, obj); });
            contf(); },
        writeObjToFile: function (def, obj) {
            if(!fs.existsSync(def.entity)) {  //verify data folder
                fs.mkdirSync(def.entity); }
            fs.writeFileSync(dwnr.dlpath(def, obj),
                             JSON.stringify(obj), "utf8"); }
    };


    var entit = {  //entity iterator walks entity definitions
        connectDataDefinitions: function (def) {
            def.ddef = datadefs.dataDefinitions()
                .find((e) => e.entity === def.entity); },
        readEntity: function (def) {
            entit.connectDataDefinitions(def);
            var msgpre = "entit.readEntity " + def.entity + " ";
            if(def.tdf) {
                tdfit.walkTDF(def, entit.nextEntity); }
            else if(def.fetch === "byref") {
                console.log(msgpre + "handled through references");
                entit.nextEntity(); }
            else if(def.json) {
                jsonit.readArray(def, entit.nextEntity); }
            else {
                console.log(msgpre + "not handled yet."); } },
        nextEntity: function () {
            work.entidx += 1;
            entit.fetchNextEntity(); },
        fetchNextEntity: function () {
            if((work.entidx < work.ents.length) &&
               (work.pulled < work.maxpull)) {
                return entit.readEntity(work.ents[work.entidx]); }
            console.log("fetchNextEntity completed. Pulled " + work.pulled); },
        pull: function (tag, maxpull) {
            work.dltag = tag || "testfetch";
            work.maxpull = maxpull || 1;  //default to single fetch for testing
            entit.fetchNextEntity(); }
    };


    return {
        pull: function (tag, maxpull) { entit.pull(tag, maxpull); }
    };
}());

puller.pull(process.argv[2], process.argv[3]);
