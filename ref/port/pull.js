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
        {entity:"AppUser", refetch:"tag", tdf:"AppUsers.tdf"},
        {entity:"Organization", refetch:"tag", tdf:"Organizations.tdf"},
        {entity:"Timeline", refetch:"tag"},
        //"Point" instances fetched from timelines
        {entity:"TLComp", refetch:"tag"},
        {entity:"DayCount", refetch:"no"},
        {entity:"AppService", refetch:"no", tdf:"AppServices.tdf"}]};


    function readEntity(def) {
        def.ddef = datadefs.dataDefinitions()
            .find((e) => e.entity === def.entity);
        console.log("readEntity " + def.entity + " (" + def.ddef.descr + ")");
        work.entidx += 1;
        fetchNextEntity();
    }


    function fetchNextEntity () {
        if(work.entidx < work.ents.length) {
            return readEntity(work.ents[work.entidx]); }
        console.log("fetchNextEntity completed. Pulled " + work.pulled);
    }


    function download (tag, maxpull) {
        work.dltag = tag || "testfetch";
        work.maxpull = maxpull || 1;  //default to single fetch for testing
        fetchNextEntity();
    }


    return {
        download: function (tag, maxpull) { download(tag, maxpull); }
    };
}());

puller.download(process.argv[2], process.argv[3]);
