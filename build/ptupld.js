/*jslint node, multivar, white, fudge */
/*property
    argv, forEach, indexOf
*/

//////////////////////////////////////////////////
// Read a json data file of data points and upload them.

var ptupld = (function () {
    "use strict";

    var posturl = "http://localhost:9080/updpt",
        email = "",
        password = "",
        orgid = "0",
        ptidx = 0,
        //npm install request
        request = require("request"),
        fs = require("fs");

    function usage () {
        console.log("node ptupld.js ../usracehistory-195216/docroot/js/data.js myemail@example.com mypassword orgid https://usracehistory-195216.appspot.com/updpt");
        //Reading a password interactively with asterisks is not simple yet.
        console.log("To avoid having your password hanging around in your console log, you might want to change it before starting the upload, then change it back after");
    }


    function uploadDataPoint (pt, createOnly) {
        var formdat, imgdir = "../usracehistory-195216/docroot/img/datapics/";
        if(!pt.code) {
            console.log("Skipping uncoded " + pt.text);
            return uploadNextPoint(); }
        formdat = {email:email, password:password, date:pt.date, text:pt.text,
                   codes:pt.code, orgid:orgid, source:"ksep: " + pt.cid}
        if(pt.pic && ((posturl.indexOf("localhost") < 0) || 
                      (pt.pic.indexOf(".png") >= 0))) {
            console.log("createReadStream: " + imgdir + pt.pic);
            formdat.pic = fs.createReadStream(imgdir + pt.pic); }
        request.post({url:posturl, formData:formdat},
                     function (error, response, body) {
                         console.log(pt.cid + ": " + response.statusCode + " " +
                                     response.body);
                         uploadNextPoint(); });
    }


    function uploadNextPoint () {
        if(ptidx >= app.data.pts.length || ptidx > 1000) {
            return; }
        ptidx += 1;
        uploadDataPoint(app.data.pts[ptidx], true);
    }


    function uploadData () {
        if(!process.argv[2]) {
            return usage(); }
        global.app = {}; 
        require(process.argv[2]);  //sets app.data
        email = process.argv[3];
        password = process.argv[4];
        orgid = process.argv[5];
        if(process.argv[6]) {
            posturl = process.argv[6]; }
        ptidx = -1;
        uploadNextPoint();
    }


    return {
        run: function () { uploadData(); }
    };
}())


ptupld.run();

