/*jslint node, multivar, white, fudge */
/*property
    argv, forEach, indexOf
*/

//////////////////////////////////////////////////
// Build the pubpts.json file by sucking down all the points off the server

var fetchpts = (function () {
    "use strict";

    var locurl = "http://localhost:9080/dbqpts",
        geturl = "https://usracehistory-195216.appspot.com/dbqpts",
        email = "",
        password = "",
        ptsjson = null,
        request = require("request"),   //npm install request
        fs = require("fs");


    function usage () {
        console.log("    Usage:");
        console.log("node fetchpts.js email password [URL]");
        console.log("  URL defaults to " + geturl);
        console.log("  To write locpts.json instead of pubpts.json, specify " + 
                    locurl);
        console.log("");
        //Reading a password interactively with asterisks is not simple yet.
        console.log("To avoid having your admin account password hanging around in your console log, you might want to change it before starting the upload, then change it back after.");
    }


    function writePointsFile () {
        var pts, ptids = "", dbs = "pub",
            jsfile = process.argv[1],
            path = jsfile.slice(0, -1 * "fetchpts.js".length);
        if(geturl.indexOf("localhost") >= 0) {
            dbs = "loc"; }
        path += "../usracehistory-195216/docroot/docs/" + dbs + "pts.json";
        fs.writeFile(path, ptsjson, {encoding:"utf8"},
                     function (err) {
                         if(err) {
                             throw err; } });
        pts = JSON.parse(ptsjson);
        pts.forEach(function (pt) {
            if(ptids) { ptids += ","; }
            ptids += pt.instid; });
        path = "fetched" + dbs + "ptids.csv";
        fs.writeFile(path, ptids, {encoding:"utf8"},
                     function (err) {
                         if(err) {
                             throw err; } });
    }


    function fetchAndWrite () {
        if(!process.argv[2]) {
            return usage(); }
        email = process.argv[2];
        password = process.argv[3];
        if(process.argv[4]) {
            geturl = process.argv[4]; }
        geturl += "?email=" + encodeURIComponent(email) + 
            "&password=" + password;
        request(geturl,
                function (error, response, body) {
                    if(error) {
                        return console.log(error); }
                    if(response && response.statusCode !== 200) {
                        return console.log(response.statusCode + " " +
                                           response.body); }
                    ptsjson = response.body;
                    writePointsFile(); });
    }

    
    return {
        run: function () { fetchAndWrite(); }
    };
}());

fetchpts.run();
