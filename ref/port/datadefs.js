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
            {dn:"isomod", h:"ISO date;int count"}]},
        {dn:"text", h:"unindexable max 1mb string.", aliases:[
            {dn:"json", h:"JSON encoded data."},
            {dn:"idcsv", h:"comma separated unique integer ids"},
            {dn:"isodcsv", h:"comma separated ISO date values"},
            {dn:"gencsv", h:"general comma separated values"},
            {dn:"url", h:"a URL, possibly longer than 128chars"}]},
        {dn:"image", h:"base64 encoded binary image data (max 1mb)"},
        {dn:"dbid", h:"long int db id translated to string for JSON"},
        {dn:"int", h:"low range integer value JavaScript can handle"}];
    var descrLookup = null;


    // dsId, created, and modified fields are automatically added for all
    var ddefs = [ //data storage entity definitions
    {entity:"AppUser", descr:"PastKey User account", fields:[
        //Container for login and whatever other info needs to be tracked
        //per user.  Login consists of retrieving an access token which is
        //used for all subsequent API calls. Supports email/password login.
        //May be expanded to allow for 3rd party authentication processing
        //if needed.  Administrator isa Contributor isa User
        //
        //A timeline progress instance:
        // tlid: id of top-level timeline (aggregated timelines not separated)
        // st: ISO when the timeline was started (ISO, not wallclock)
        // svs*: CSV of svid;isoShown;isoClosed;dispcount
        // pts: CSV of ptid;isoShown;isoClosed;dispcount;tagcodes
        //    tagcodes: 'r' (remembered) point noted to revisit later
        //              'k' (known) knew this before
        //              'u' (unknown) did not know this before
        //              '1' (1st try) guessed date correctly on first click
        //              '2' (2nd try) guessed date correctly on second click
        //              '3' (3rd try) guessed date correctly on third click
        //              '4' (4th try) guessed date correctly on fourth click
        {f:"importid", d:"dbid unique", c:"previous id from import data"},
        {f:"email", d:"priv req unique email"},
        {f:"phash", d:"adm req string"},
        {f:"status", d:"priv string", c:"Only Active may post",
         enumvals:["Pending", "Active", "Inactive", "Unreachable"]},
        {f:"actsends", d:"adm gencsv", c:"latest first isod;emaddr vals"},
        {f:"actcode", d:"adm string", c:"account activation code"},
        {f:"accessed", d:"isomod", c:"day last seen"},
        //user public display info
        {f:"name", d:"string", c:"optional but recommended public name"},
        {f:"title", d:"string", c:"optional, if helpful for contact"},
        {f:"web", d:"url", c:"optional public contact website"},
        //user settings and traversal data
        {f:"lang", d:"string", c:"optional preferred language code"},
        {f:"settings", d:"json", c:"relative ages of generations etc"},
        {f:"remtls", d:"json", c:"remembered timeline ids/names"},
        {f:"completed", d:"json", c:"[] tlid, name, first, latest"},
        {f:"started", d:"json", c:"[] timeline progress instances"},
        {f:"built", d:"json", c:"[] created timeline ids/names"},
        //write privileges
        {f:"orgid", d:"dbid", c:"Organization id (0 if none)"},
        {f:"lev", d:"int", c:"0:User, 1:Contributor, 2:Administrator"}],
     cache:{minutes:2*60, manualadd:true}, //fast auth after initial load
     logflds:["email", "name"]},

    {entity:"DayCount", descr:"Traffic access accumulator", fields:[
        //Keep track of timeline fetches and progress saves to enable viewing
        //activity.  Aggregated nightly.
        {f:"tstamp", d:"isod req", c:"server time zero of day"},
        {f:"rtype", d:"string req", c:"count type (fetches, saves, summaries)",
         enumvals:["tlfetch", "tlsave", "daysum"]},
        {f:"detail", d:"json", c:"count details"}],
     cache:{minutes:0},  //essentially write only until pulled for report
     logflds:["tstamp", "rtype"]},

    {entity:"Organization", descr:"A group building timelines", fields:[
        //An independent working group maintaining data points and timelines
        //for education and benefit to their community.
        {f:"name", d:"string req unique", c:"Name of organization"},
        {f:"code", d:"string req unique", c:"Short name or initials, slug"},
        {f:"contacturl", d:"url", c:"Main contact website"},
        {f:"projecturl", d:"url", c:"Web page describing timeline work"},
        //point data search filtering organizational definitions
        {f:"groups", d:"gencsv", c:"e.g. African American, Asian American,..."},
        {f:"regions", d:"gencsv", c:"e.g. Boston, Puerto Rico, Hawai'i,..."},
        {f:"categories", d:"gencsv", c:"e.g. Stats, Awards, Stereotypes,..."},
        {f:"tags", d:"gencsv", c:"other org grouping keywords"},
        //Prebuilt json for most recently edited ~512k of organization
        //points for ease of reference. Older points can still be accessed
        //via the timelines that reference them.
        {f:"recpre", d:"json", c:"recently edited points for quick access"}],
     cache:{minutes:0},  //client caching should be sufficient
     logflds:["code", "name"]},

    {entity:"Point", descr:"A data point for use in timelines", fields:[
        {f:"orgid", d:"dbid", c:"organization that created this point"},
        {f:"source", d:"string", c:"secondary reference id or load key"},
        //Accepted formats for date values:
        // point: Y[YYY][ BCE], YYYY-MM, YYYY-MM-DD
        // range: YYYY's, YYYY+, YYYY['s]-YYYY['s], YYYY-MM[-DD]-YYYY-MM[-DD]
        {f:"date", d:"string req", c:"A date or date range"},
        //Text may reference another point using html anchor syntax and the
        //source or id, e.g. "... <a href=\"#N35\">Pontiac</a> ..."
        {f:"text", d:"text req", c:"max 1200 chars, prefer < 400"},
        {f:"refs", d:"json", c:"array of reference source strings"},
        //qtypes: 'S': Continue (default), 'U': Did You Know?,
        //        'D': Click correct year, 'F': Firsts
        {f:"qtype", d:"string", c:"Letter code for question type"},
        {f:"groups", d:"csv", c:"selected values from org groups"},
        {f:"regions", d:"csv", c:"selected values from org regions"},
        {f:"categories", d:"csv", c:"selected values from org categories"},
        {f:"tags", d:"csv", c:"selected values from org tags"},
        {f:"codes", d:"csv", c:"legacy import category key code values"},
        {f:"srclang", d:"string", c:"en-US or en-US-x-grade"},
        {f:"translations", d:"json", c:"text translations by lang code"},
        {f:"pic", d:"image", c:"optional freely shareable uploaded pic"},
        {f:"endorsed", d:"csv", c:"userids who have endorsed the point"},
        {f:"stats", d:"json", c:"optional associated data (visualizations)"}],
     cache:{minutes:0},  //points are not cached individually
     logflds:["orgid", "date", "text"]},

    {entity:"AppService", descr:"Processing service access", fields:[
        {f:"name", d:"string req unique", c:"Name of service"},
        {f:"ckey", d:"string", c:"consumer key"},
        {f:"csec", d:"string", c:"consumer secret"},
        {f:"data", d:"json", c:"svc specific support data"}],
     cache:{minutes:4*60},  //small instances, minimum change, used a lot
     logflds:["name"]},

    {entity:"Timeline", descr:"Points + suppviz*, or other timelines", fields:[
        //A timeline is a collection of points and zero or more supplemental
        //visualizations, or it can be a collection of timelines.  A
        //timeline contains cached points with extra data removed.  These
        //cached points are NOT updated unless the timeline is edited.
        //Timelines can be created by anyone, but only timelines created by
        //a Contributor have an associated orgid.
        {f:"orgid", d:"dbid", c:"Organization id (if org timeline)"},
        //When a user searches for timelines, they see timelines they have
        //created, remembered, started, and most recently accessed.
        {f:"name", d:"string req unique", c:"name for reference and search"},
        {f:"cname", d:"string", c:"canonical name for dupe checks and query"},
        {f:"slug", d:"string", c:"permalink label, (org timelines only)"},
        {f:"title", d:"string", c:"title for start dialog"},
        {f:"subtitle", d:"string", c:"2nd line text for start dialog"},
        //By default, featured is "Unlisted" (don't display main page).
        //Org timelines can be featured as
        //  "Listed": no specific featuring
        //  "-mm-dd": annually on and around month day
        //  "-mm-Dn-Wn: annually on and around day and week of month
        //  "Promoted": above general but below anniversaries
        //Sample annual observations:
        //  -01-W3-D1  Third Monday of January  (Martin Luther King, Jr. Day)
        //  -03-31     March 31  (Cesar Chavez day)
        {f:"featured", d:"string", c:"if/how/when to promote"},
        //Timelines are language specific.  Translated timelines have
        //translated names and are separate instances.
        {f:"lang", d:"string", c:"language code for timeline e.g. en-US"},
        //e.g. "This timeline is about 10 minutes long [Start]"
        {f:"comment", d:"text", c:"popup startup text"},
        {f:"about", d:"text", c:"html to include in about text"},
        //For non-aggregate timelines (ctype Points or Random), the ctype
        //value may optionally specify the number of points presented before
        //each save.  If not specified, the default is 6.  A Random points
        //timeline may optionally specify a maximum number of points to
        //present.  Points timelines present points in date order.
        //Aggregate timelines present timelines in the order specified.
        {f:"ctype", d:"string", c:"Timelines|Points|Random [:levcnt:rndmax]"},
        {f:"cids", d:"idcsv", c:"Point ids or Timeline ids depending on ctype"},
        {f:"svs", d:"csv", c:"SuppViz module names"},
        {f:"preb", d:"json", c:"preselected point data"}],
     cache:{minutes:0},
     logflds:["name"]},

    {entity:"TLComp", descr:"Timeline completion archive record", fields:[
        {f:"userid", d:"dbid req", c:"AppUser id who completed the timeline"},
        {f:"tlid", d:"dbid req", c:"Timeline Id they completed"},
        {f:"username", d:"string", c:"user name for ease of reference"},
        {f:"tlname", d:"string", c:"timeline name for ease of reference"},
        {f:"data", d:"json", c:"timeline progress instance"}],
     cache:{minutes:0},
     logflds:["userid", "tlid", "username", "tlname"]}];

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

