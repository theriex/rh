//////////////////////////////////////////////////
//
//     D O   N O T   E D I T
//
// This file was written by makeMySQLCRUD.js.  Any changes should be made there.
//
//////////////////////////////////////////////////
// Local object reference cache and server persistence access.  Automatically
// serializes/deserializes JSON fields.

/*global app, jt, window, console */

/*jslint browser, white, fudge, long */

app.refmgr = (function () {
    "use strict";

    var cache = {};

    var persistentTypes = ["AppUser", "Point", "Timeline", "TLComp", "DayCount", "AppService"];


    //All json fields are initialized to {} so they can be accessed directly.
    function reconstituteFieldJSONObject (field, obj) {
        if(!obj[field]) {
            obj[field] = {}; }
        else {
            var text = obj[field];
            try {
                obj[field] = JSON.parse(text);
            } catch (e) {
                jt.log("reconstituteFieldJSONObject " + obj.dsType + " " +
                       obj.dsId + " " + field + " reset to empty object from " +
                       text + " Error: " + e);
                obj[field] = {};
            } }
    }


    function reconstituteFieldJSONArray (field, obj) {
        reconstituteFieldJSONObject(field, obj);
        if(!Array.isArray(obj[field])) {
            obj[field] = []; }
    }


    function deserialize (obj) {
        switch(obj.dsType) {
        case "AppUser":
            reconstituteFieldJSONObject("settings", obj);
            reconstituteFieldJSONArray("started", obj);
            reconstituteFieldJSONArray("completed", obj);
            reconstituteFieldJSONArray("remtls", obj);
            reconstituteFieldJSONArray("built", obj);
            break;
        case "Point":
            reconstituteFieldJSONArray("refs", obj);
            reconstituteFieldJSONObject("translations", obj);
            reconstituteFieldJSONObject("stats", obj);
            break;
        case "Timeline":
            reconstituteFieldJSONObject("kwds", obj);
            reconstituteFieldJSONArray("preb", obj);
            break;
        case "TLComp":
            reconstituteFieldJSONObject("data", obj);
            break;
        case "DayCount":
            reconstituteFieldJSONObject("detail", obj);
            break;
        case "AppService":
            break;
        }
        return obj;
    }


    function serialize (obj) {
        switch(obj.dsType) {
        case "AppUser":
            obj.settings = JSON.stringify(obj.settings);
            obj.started = JSON.stringify(obj.started);
            obj.completed = JSON.stringify(obj.completed);
            obj.remtls = JSON.stringify(obj.remtls);
            obj.built = JSON.stringify(obj.built);
            break;
        case "Point":
            obj.refs = JSON.stringify(obj.refs);
            obj.translations = JSON.stringify(obj.translations);
            obj.stats = JSON.stringify(obj.stats);
            break;
        case "Timeline":
            obj.kwds = JSON.stringify(obj.kwds);
            obj.preb = JSON.stringify(obj.preb);
            break;
        case "TLComp":
            obj.data = JSON.stringify(obj.data);
            break;
        case "DayCount":
            obj.detail = JSON.stringify(obj.detail);
            break;
        case "AppService":
            break;
        }
        return obj;
    }


    function clearPrivilegedFields (obj) {
        switch(obj.dsType) {
        case "AppUser":
            obj.email = "";
            obj.status = "";
            break;
        case "Point":
            break;
        case "Timeline":
            break;
        case "TLComp":
            break;
        case "DayCount":
            break;
        case "AppService":
            break;
        }
    }


return {

    cached: function (dsType, dsId) {  //Returns the cached obj or null
        if(dsType && dsId && cache[dsType] && cache[dsType][dsId]) {
            return cache[dsType][dsId]; }
        return null; },


    put: function (obj) {  //obj is already deserialized
        if(!obj) {
            jt.log("refmgr.put: Attempt to put null obj");
            console.trace(); }
        clearPrivilegedFields(obj);  //no sensitive info in cache
        cache[obj.dsType] = cache[obj.dsType] || {};
        cache[obj.dsType][obj.dsId] = obj;
        return obj;
    },


    getFull: function (dsType, dsId, contf) {
        var obj = app.refmgr.cached(dsType, dsId);
        if(obj) {  //force an async callback for consistent code flow
            return setTimeout(function () { contf(obj); }, 50); }
        if(persistentTypes.indexOf(dsType) < 0) {
            jt.log("refmgr.getFull: unknown dsType " + dsType);
            console.trace(); }
        var url = app.dr("/api/fetchobj?dt=" + dsType + "&di=" + dsId +
                         jt.ts("&cb=", "second"));
        var sem = jt.semaphore("refmgr.getFull" + dsType + dsId);
        if(sem && sem.critsec === "processing") {
            setTimeout(function () {
                app.refmgr.getFull(dsType, dsId, contf); }, 200);
            return; }  //try again later, hopefully find cached
        var logpre = "refmgr.getFull " + dsType + " " + dsId + " ";
        jt.call("GET", url, null,
                function (objs) {
                    var retobj = null;
                    if(objs.length > 0) {
                        retobj = objs[0];
                        jt.log(logpre + "cached.");
                        deserialize(retobj);
                        app.refmgr.put(retobj); }
                    contf(retobj); },
                function (code, errtxt) {
                    jt.log(logpre + code + ": " + errtxt);
                    contf(null); },
                sem);
    },


    uncache: function (dsType, dsId) {
        cache[dsType] = cache[dsType] || {};
        cache[dsType][dsId] = null;
    },


    serverUncache: function (dsType, dsId, contf, errf) {
        app.refmgr.uncache(dsType, dsId);
        var logpre = "refmgr.serverUncache " + dsType + " " + dsId + " ";
        var url = app.dr("/api/uncache?dt=" + dsType + "&di=" + dsId +
                         jt.ts("&cb=", "second"));
        jt.call("GET", url, null,
                function () {
                    jt.log(logpre + "completed.");
                    if(contf) { contf(); } },
                function (code, errtxt) {
                    jt.log(logpre + "failed " + code + ": " + errtxt);
                    if(errf) { errf(); } },
                jt.semaphore("refmgr.serverUncache" + dsType + dsId));
    },


    deserialize: function (obj) {
        return deserialize(obj);
    },


    postdata: function (obj, skips) {
        serialize(obj);
        var dat = jt.objdata(obj, skips);
        deserialize(obj);
        return dat;
    }

}; //end of returned functions
}());

