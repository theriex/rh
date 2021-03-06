/*jslint node, white, fudge */

//Fields used for database search and retrieval must either be declared
//unique or listed within one or more queries.  Fields used only client side
//and fields not needed for search may be grouped into JSON as appropriate.

module.exports = (function () {
    "use strict";

    var fieldDescriptors = [
        {dn:"priv[ate]", h:"authorized access only e.g. owner personal info"},
        {dn:"adm[in]", h:"administrative access only e.g. activation codes"},
        {dn:"req[uired]", h:"Save error if null or empty"},
        {dn:"uniq[ue]", h:"Indexed. Save err if matches another's value"},
        {dn:"str[ing]", h:"Rough max 128 char text, truncation ok.", aliases:[
            {dn:"email", h:"email address format"},
            {dn:"isod[ate]", h:"ISO date format"},
            {dn:"isomod", h:"ISO date;int count"},
            {dn:"srchidcsv", h:"short string length idcsv, searchable"}]},
        {dn:"text", h:"unindexable max 1mb string.", aliases:[
            {dn:"json", h:"JSON encoded data. default '{}'"},
            {dn:"jsarr", h:"JSON encoded data. default '[]'"},
            {dn:"idcsv", h:"comma separated unique integer ids"},
            {dn:"isodcsv", h:"comma separated ISO date values"},
            {dn:"gencsv", h:"general comma separated values"},
            {dn:"url", h:"a URL, possibly longer than 128chars"}]},
        {dn:"image", h:"base64 encoded binary image data (max 1mb)"},
        {dn:"dbid", h:"long int db id translated to string for JSON"},
        {dn:"int", h:"low range integer value JavaScript can handle"}];
    var descrLookup = null;

    //All entities have the following fields automatically created:
    //  dsId: Large integer value unique within the entity type
    //  created: ISO UTC timestamp string when the instance was first saved
    //  modified: timestamp;version
    //  batchconv: string indicator for batch conversion processing
    //On retrieval, instances have dbType set to the entity name.
    var ddefs = [ //data storage entity definitions

    {entity:"AppUser", descr:"PastKey User account", fields:[
        {f:"importid", d:"dbid adm unique", c:"previous id from import data"},
        {f:"email", d:"priv req unique email"},
        {f:"phash", d:"adm req string"},
        {f:"status", d:"priv string", c:"Only Active may post",
         enumvals:["Pending", "Active", "Inactive", "Unreachable"]},
        {f:"actsends", d:"adm gencsv", c:"latest first isod;emaddr vals"},
        {f:"actcode", d:"adm string", c:"account activation code"},
        {f:"accessed", d:"isomod", c:"last account data update by user"},
        //user public display info
        {f:"name", d:"string", c:"optional but recommended public name"},
        {f:"title", d:"string", c:"optional, if helpful for contact"},
        {f:"web", d:"url", c:"optional public contact website"},
        //user settings and traversal data
        {f:"lang", d:"string", c:"optional preferred language code"},
        {f:"settings", d:"json", c:"generation ages, keywords used etc"},
        {f:"started", d:"jsarr", c:"Timeline Progress instances (*1)"},
        {f:"completed", d:"jsarr", c:"Timeline Completion instances (*2)"},
        {f:"remtls", d:"jsarr", c:"non-editable remembered timelines (*3)"},
        {f:"built", d:"jsarr", c:"created or editable timelines (*3)"}],
        //*1 Timeline Progress instance:
        //     tlid: id of timeline (top-level if aggregate)
        //     st: ISO when the timeline was started
        //     latestsave: ISO when last saved
        //     svs*: CSV of svid;isoShown;isoClosed;dispcount
        //     pts: CSV of ptid;isoShown;isoClosed;dispcount;tagcodes
        //        tagcodes: 'r' (remembered) point noted to revisit later
        //                  'k' (known) knew this before
        //                  'u' (unknown) did not know this before
        //                  '1' (1st try) guessed date correctly on first click
        //                  '2' (2nd try) guessed date correctly on second click
        //                  '3' (3rd try) guessed date correctly on third click
        //                  '4' (4th try) guessed date correctly on fourth click
        //*2 Timeline Completion instance:
        //     tlid: id of top-level timeline
        //     name: name of timeline (when completion first recorded)
        //     count: how many times the timeline has been completed
        //     first: ISO when the timeline was first completed
        //     latesst: ISO when the timeline was most recently completed
        //     stats:
        //         pttl: total time spent on all points (in seconds)
        //         pcount: the total number of points in the timeline
        //         pavg: the average time spent on each point
        //         sttl: total time spent on all supplemental visualizations
        //         scount: total number of suppvizs in timeline
        //         savg: average time spent on suppvizs
        //*3 Timeline Memory instance:
        //     tlid: id of timeline
        //     name: name of timeline
        //     featured: (built) featured value from timeline
        //     modified: (built) last update timestamp
        //   If a change in editors is found, the client switches the memory
        //   instance between remtls and built as needed.
     cache:{minutes:2*60, manualadd:true}, //fast auth after initial load
     logflds:["email", "name"]},

    {entity:"Point", descr:"A data point for use in timelines", fields:[
        {f:"editors", d:"srchidcsv", c:"owner and others with edit access"},
        {f:"srctl", d:"dbid", c:"the timeline this point belongs to (*1)"},
        {f:"lmuid", d:"dbid", c:"the user who last modified this instance"},
        {f:"importid", d:"dbid adm unique", c:"previous id from import data"},
        {f:"source", d:"string", c:"secondary reference id or load key (*2)"},
        {f:"date", d:"string req", c:"A date or date range (*3)"},
        {f:"text", d:"text req", c:"max 1200 chars, prefer < 400. (*4)"},
        {f:"refs", d:"jsarr", c:"reference source strings"},
        {f:"qtype", d:"string", c:"Letter code for question type (*5)"},
        {f:"communities", d:"gencsv", c:"imported community keywords (*6)"},
        {f:"regions", d:"gencsv",     c:"imported region keywords (*6)"},
        {f:"categories", d:"gencsv",  c:"imported category keywords (*6)"},
        {f:"tags", d:"gencsv",        c:"editor defined keywords (*6)"},
        {f:"codes", d:"gencsv", c:"legacy import category key code values"},
        {f:"srclang", d:"string", c:"en-US or en-US-x-grade"},
        {f:"translations", d:"json", c:"text translations by lang code"},
        {f:"pic", d:"image", c:"optional freely shareable uploaded pic"},
        {f:"stats", d:"json", c:"optional associated data (visualizations)"}],
        //*1 A point "belongs" to a single parent timeline to avoid points
        //   being orphaned with no discovery path.  A point may be included
        //   in multiple timelines.  A point may be edited from any timeline
        //   by anyone in that point's editors list.  A point marked as
        //   deleted in its parent timeline, that has no references from
        //   other timelines, can be deleted from the db.
        //*2 Each source value should be unique within the timeline so it
        //   can can function as a reference anchor.  This is checked in the
        //   UI, but not enforced in the db.
        //*3 Accepted formats for date values:
        //   point: Y[YYY][ BCE], YYYY-MM, YYYY-MM-DD
        //   range: YYYY's, YYYY+, YYYY['s]-YYYY['s], YYYY-MM[-DD]-YYYY-MM[-DD]
        //*4 Text may not contain HTML.  Limited markdown: *italic*, **bold**,
        //   [link text](prev point source value) e.g.  [Geary Act](A37)
        //*5 qtypes: 'C': Continue (default),
        //           'U': Did You Know?,
        //           'D': Click correct year,
        //           'F': Firsts
        //*6 The tags keywords are set by the point editor. All keywords are
        //   available for search.  Import-only keywords:
        //   communities: e.g. African American, Native, Latinx, Asian American
        //   regions: e.g. Boston, Puerto Rico, Hawai'i, Southwest
        //   categories: e.g. Stats, Awards, Stereotypes
     cache:{minutes:0},  //points are not cached individually
     logflds:["editors", "date", "text"]},

    {entity:"Timeline", descr:"Points + suppviz*, or other timelines", fields:[
        {f:"editors", d:"srchidcsv", c:"owner and others with edit access"},
        {f:"lmuid", d:"dbid", c:"the user who last modified this instance"},
        {f:"importid", d:"dbid adm unique", c:"previous id from import data"},
        {f:"name", d:"string req unique", c:"name for reference and search"},
        {f:"cname", d:"string", c:"canonical name for dupe checks and query"},
        {f:"slug", d:"unique string", c:"opt permalink label"},
        {f:"title", d:"string", c:"title for start dialog"},
        {f:"subtitle", d:"string", c:"2nd line text for start dialog"},
        {f:"featured", d:"string", c:"if/how/when to promote (*1)"},
        {f:"lang", d:"string", c:"language code for timeline e.g. en-US (*2)"},
        {f:"comment", d:"text", c:"popup startup text (*3)"},
        {f:"about", d:"text", c:"html to include in about text"},
        {f:"kwds", d:"json", c:"additional timeline keywords (*4)"},
        {f:"ctype", d:"string", c:"Timelines|Points|Random (*5)"},
        {f:"cids", d:"idcsv", c:"Point ids or Timeline ids depending on ctype"},
        {f:"rempts", d:"idcsv", c:"Removed point ids to avoid orphaning (*6)"},
        {f:"svs", d:"gencsv", c:"SuppViz module names"},
        {f:"preb", d:"jsarr", c:"preselected point data (*7)"}],
        //*1 Promotional display indicator:
        //     "Unlisted" Don't display main page
        //     "Listed": Ok to recommend to all users
        //     "-mm-dd": Promote annually on and around month day
        //     "-mm-Dn-Wn": Promote annually on and around day and week of month
        //     "Promoted": Promote over Listed but below annuals (admin only)
        //     "Archived": Unlisted, and sorted below Unlisted in UI.
        //     "Deleted": Don't show anymore.  In db for completions refs.
        //   Sample annual observations:
        //    -01-W3-D1  Third Monday of January  (Martin Luther King, Jr. Day)
        //    -03-31     March 31  (Cesar Chavez day)
        //*2 Timelines are language specific.  Translated timelines have
        //   translated names and are separate instances.
        //*3 The popup start comment can optionally have a continue button
        //   name e.g. "This timeline is about 10 minutes long [Start]"
        //*4 No UI support for timeline keywords.  Not currently used.
        //*5 "Points" or "Random". "Timelines" not supported anymore.  Value
        //   may optionally be followed by ":levcnt" specifying the number
        //   of points presented before each save.  The default value is
        //   "Points:6".  Random may also be followed by a :rndmax which is
        //   the total number of points to present.  Points are always
        //   presented in chronological order.  The ctype is not currently
        //   exposed in the UI.
        //*6 rempts is maintained client side. An orphaned point is not
        //   catastrophic and can be fixed in the db directly if needed.
        //*7 The timeline preb contains points with extra data removed. The 
        //   preb is NOT updated unless/until the timeline is edited.  If 
        //   you edit a point, you need to manually refresh that point in
        //   any of the containing timelines.  Batch updates are admin only.
     cache:{minutes:0},
     logflds:["name"]},

    {entity:"TLComp", descr:"Timeline completion archive record", fields:[
        {f:"importid", d:"dbid adm unique", c:"previous id from import data"},
        {f:"userid", d:"dbid req", c:"AppUser id who completed the timeline"},
        {f:"tlid", d:"dbid req", c:"Timeline Id they completed"},
        {f:"username", d:"string", c:"user name for ease of reference"},
        {f:"tlname", d:"string", c:"timeline name for ease of reference"},
        {f:"data", d:"json", c:"timeline progress instance"}],
     cache:{minutes:0},
     logflds:["userid", "tlid", "username", "tlname"]},

    {entity:"DayCount", descr:"Traffic access accumulator", fields:[
        //Interim and daily usage stats.
        {f:"importid", d:"dbid adm unique", c:"previous id from import data"},
        {f:"tstamp", d:"isod req", c:"server ISO UTC timestamp"},
        {f:"rtype", d:"string req", c:"record type for count instance",
         enumvals:["tlfetch", "guestsave", "daysum"]},
        {f:"detail", d:"json", c:"count details (*1)"}],
        //*1 detail fields by rtype:
        //   tlfetch: referer, useragent, tlid, tlname, uid
        //   guestsave: useragent, tlid, tlname
        //   daysum:
        //     refers:[{refstr:count}...]
        //     agents:[{agstr:count}...]
        //     timelines:{
        //       tlid:{tlname,
        //             fetch: {uid:ttl, uid2:ttl2, ...},
        //             save, comp, edit}...}
        //     users:{
        //       uid:{name, created, modified,
        //            ptedits:{
        //              ptid:{date, text[0:60]}...}...}
     cache:{minutes:0},  //app access is write-only
     logflds:["tstamp", "rtype"]},

    {entity:"AppService", descr:"Processing service access", fields:[
        {f:"importid", d:"dbid adm unique", c:"previous id from import data"},
        {f:"name", d:"string req unique", c:"Name of service"},
        {f:"ckey", d:"string", c:"consumer key"},
        {f:"csec", d:"string", c:"consumer secret"},
        {f:"data", d:"idcsv", c:"svc specific support data"}],
     cache:{minutes:4*60},  //small instances, minimum change, used a lot
     logflds:["name"]}];


    function makeFieldDescriptionLookup (fds, aliasKey) {
        descrLookup = descrLookup || {};
        aliasKey = aliasKey || "";
        fds.forEach(function (fd) {
            var key = fd.dn;
            var abbrevIndex = key.indexOf("[");
            if(abbrevIndex >= 0) {
                key = key.slice(0, abbrevIndex); }
            descrLookup[key] = {name:key, aliasof:aliasKey, src:fd};
            //console.log(key + "(" + aliasKey + "): " + fd.h);
            if(fd.aliases) {
                makeFieldDescriptionLookup(fd.aliases, key); } });
    }


    function lookupKey (dts) {
        return Object.keys(descrLookup).find(function (lokey) {
            if(dts.indexOf(lokey) >= 0) {
                //console.log("lookupKey found " + dts + " key: " + lokey);
                return true; } });
    }


    //Return true if the given field description string contains the given
    //field description name, taking into acount abbrevs and aliases. 
    //Example: fieldIs("req isodate", "string") === true
    function fieldIs (fds, dts) {
        if(!descrLookup) {
            makeFieldDescriptionLookup(fieldDescriptors); }
        var dtsk = lookupKey(dts);
        if(!dtsk) {
            throw("Unknown field type description: " + dts); }
        //console.log("fieldIs testing for: " + dtsk);
        fds = fds.split(/\s/);
        return fds.find(function (fd) {
            var fdk = lookupKey(fd);
            //console.log("fieldIs comparing against: " + fdk);
            if(!fdk) {
                throw("Bad field description element: " + fd); }
            if(fdk === dtsk) {  //same top level field descriptor lookupKey
                return true; }
            var kob = descrLookup[fdk];
            if(kob.aliasof && kob.aliasof === dtsk) {
                return true; } });
    }


    return {
        fieldDescriptors: function () { return fieldDescriptors; },
        dataDefinitions: function () { return ddefs; },
        fieldIs: function (fdef, dts) { return fieldIs(fdef, dts); }
    };
}());

