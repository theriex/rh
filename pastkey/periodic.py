""" Daily stat rollups and outbound mail. """
#pylint: disable=missing-function-docstring
#pylint: disable=invalid-name
#pylint: disable=logging-not-lazy
#pylint: disable=wrong-import-order
#pylint: disable=wrong-import-position
#pylint: disable=too-many-locals
#pylint: disable=too-many-branches
import datetime
import json
import sys
import py.mconf as mconf
import logging
import logging.handlers
logging.basicConfig(
    level=logging.DEBUG,
    format='%(levelname)s %(module)s %(asctime)s %(message)s',
    handlers=[logging.handlers.TimedRotatingFileHandler(
        mconf.logsdir + "plg_periodic.log", when='D', backupCount=10)])
import py.dbacc as dbacc
import py.util as util

# Run status data
rst = {"preview":False}


def bump_count(cname, cval):
    if not cval:
        return
    dets = rst["dets"]
    # dets[cname] initialized by daily_activity
    dets[cname][cval] = dets[cname].get(cval, 0)
    dets[cname][cval] += 1


def bump_timeline(tlid, tlname, actype, uid):
    if not tlid or not actype:
        raise ValueError("tlid: " + str(tlid) + ", actype: " + str(actype))
    tlid = str(tlid)  # verify consistent dict key format
    tls = rst["dets"]["timelines"]
    if not tls.get(tlid):
        tls[tlid] = {"tlname":tlname}
    tl = tls[tlid]
    if not tl.get("tlname") and tlname:  # fill in tlname if not already known
        tls["tlname"] = tlname
    if not tl.get(actype):
        tl[actype] = {}
    counters = tl[actype]
    uid = uid or "guest"
    if not counters.get(uid):
        counters[uid] = 0
    counters[uid] += 1


def safe_load_json_array(obj, field):
    if not obj or not isinstance(obj, dict):
        raise ValueError("Invalid obj: " + str(obj))
    val = obj.get(field, "[]")
    if not isinstance(val, str):
        raise ValueError(field + " value not string")
    val = val.strip()
    if not val:
        val = "[]"
    res = json.loads(val)
    if not isinstance(res, list):  # default db json value is {}
        res = []
    return res


def roll_up_day_counts():
    where = ("WHERE tstamp >= \"" + rst["start"] + "\"" +
             " AND tstamp < \"" + rst["end"] + "\"")
    for dc in dbacc.query_entity("DayCount", where):
        det = json.loads(dc.get("detail", "{}"))
        if dc["rtype"] == "tlfetch":
            bump_count("refers", det.get("referer"))
            bump_count("agents", det.get("useragent"))
            bump_timeline(det.get("tlid"), det.get("tlname"), "fetch",
                          det.get("uid", "guest"))
        elif dc["rtype"] == "guestsave":
            bump_count("agents", det.get("useragent"))
            bump_timeline(det.get("tlid"), det.get("tlname"), "save", "guest")


def within_time_window(val):
    if val and (val >= rst["start"] < rst["end"]):
        return True
    return False


def verify_active_user(uid, user=None):
    if not uid:
        raise ValueError("Valid uid required, received: '" + str(uid) + "'")
    users = rst["dets"]["users"]
    if not users.get(uid):
        if not user:
            user = dbacc.cfbk("AppUser", "dsId", uid, required=True)
        users[uid] = {"name":user["name"], "created":user["created"],
                      "modified":user["modified"], "ptedits":{}}


def collect_active_user_stats():
    where = ("WHERE modified >= \"" + rst["start"] + "\"" +
             " AND modified < \"" + rst["end"] + "\"")
    for user in dbacc.query_entity("AppUser", where):
        verify_active_user(user["dsId"], user)
        started = safe_load_json_array(user, "started")
        for tpi in started:
            if within_time_window(tpi.get("latestsave")):
                # must have fetched timeline so tlname already set up
                bump_timeline(tpi["tlid"], "", "save", user["dsId"])
        completed = safe_load_json_array(user, "completed")
        for tci in completed:
            if within_time_window(tci.get("latest")):
                bump_timeline(tci["tlid"], tci["name"], "comp", user["dsId"])
        built = safe_load_json_array(user, "built")
        for tmi in built:
            if within_time_window(tmi.get("modified")):
                bump_timeline(tmi["tlid"], tmi["name"], "edit", user["dsId"])


def collect_edited_points():
    where = ("WHERE modified >= \"" + rst["start"] + "\"" +
             " AND modified < \"" + rst["end"] + "\"")
    for pt in dbacc.query_entity("Point", where):
        uid = pt["lmuid"]
        verify_active_user(uid)
        ptedits = rst["dets"]["users"][uid]["ptedits"]
        ptedits[pt["dsId"]] = {"date":pt["date"], "text":pt["text"][0:60]}


def write_daysum_details():
    where = ("WHERE rtype = \"daysum\" AND tstamp = \"" + rst["start"] + "\"" +
             " ORDER BY created LIMIT 1")
    dcs = dbacc.query_entity("DayCount", where)
    if len(dcs) > 0:
        dc = dcs[0]
    else:
        dc = {"dsType":"DayCount", "rtype":"daysum", "tstamp":rst["start"]}
    dc["detail"] = json.dumps(rst["dets"])
    dbacc.write_entity(dc, dc.get("modified"))


def aggregate_counts(cdict):
    guests, users = 0, 0
    if cdict:
        for uid, cnt in cdict.items():
            if uid in ["0", "guest"]:
                guests += cnt
            else:
                users += cnt
    return guests, users


def tlids_for_user(uid, ctype):
    tlids = []
    for tlid, tldat in rst["dets"]["timelines"].items():
        if tldat.get(ctype) and tldat.get(ctype).get(uid):
            tlids.append(tlid)
    return tlids


def send_activity_report():
    logging.info(json.dumps(rst["dets"]))
    txt = ""
    if rst["preview"]:
        txt += "   ---- PREVIEW ----\n"
    txt += "Fetched Timelines:\n"
    for tlid, td in rst["dets"]["timelines"].items():
        gc, uc = aggregate_counts(td.get("fetch"))
        txt += ("  " + tlid + " " + td["tlname"] + ": guests: " + str(gc) +
                ", users: " + str(uc) + "\n")
    txt += "Timelines where guests made it to the first save:\n"
    for tlid, td in rst["dets"]["timelines"].items():
        gc, _ = aggregate_counts(td.get("save"))
        if gc:
            txt += "  " + tlid + " " + td["tlname"] + ": " + str(gc) + "\n"
    txt += "New Users:\n"
    for uid, ud in rst["dets"]["users"].items():
        if within_time_window(ud["created"]):
            txt += "  " + uid + " name: " + str(ud["name"]) + "\n"
    txt += "Active Users:\n"
    for uid, ud in rst["dets"]["users"].items():
        txt += "  " + uid + " name: " + str(ud["name"]) + "\n"
        tlas = {"Saves": tlids_for_user(uid, "save"),
                "Completions": tlids_for_user(uid, "comp"),
                "Edits": tlids_for_user(uid, "edit")}
        tls = rst["dets"]["timelines"]
        for label, tids in tlas.items():
            if len(tids) > 0:
                txt += "    " + label + "\n"
            for tid in tids:
                txt += "      " + tid + " " + tls[tid]["tlname"] + "\n"
        if ud["ptedits"]:  # dict has elements in it
            txt += "    Points Edited:\n"
        for ptid, s in ud["ptedits"]:
            txt += "      " + ptid + " " + s["date"] + " " + s["text"] + "\n"
    txt += "Refers:\n"
    for refer, count in rst["dets"]["refers"].items():
        txt += "  " + str(count) + " " + refer + "\n"
    txt += "Agents:\n"
    for agent, count in rst["dets"]["agents"].items():
        txt += "  " + str(count) + " " + agent + "\n"
    # Send report
    logging.info(txt)
    if not rst["preview"]:
        util.send_mail("support@pastkey.org", "PastKey activity summary", txt,
                       domain=mconf.domain, sender="support")


def daily_activity():
    logging.info("daily_activity from " + rst["start"])
    logging.info("                 to " + rst["end"])
    dets = {"refers":{}, "agents":{}, "timelines":{}, "users":{}}
    rst["dets"] = dets
    roll_up_day_counts()
    collect_active_user_stats()
    collect_edited_points()
    write_daysum_details()
    send_activity_report()


# def send_reminders():
    # Not sending reminders anymore because
    #   - most timelines are completed in one sitting
    #   - goading people to finish isn't appreciated
    #   - they can find their way back to the site via the account confirmation
    #   - people don't opt in when they start
    # if resurrecting this feature, walk the started timelines for each user
    # who has opted in for reminders.  If latestsave is 7/14/30 days old,
    # send an appropriate reminder email.


# Set the day window to work with (yesterday or preview today).
def run_periodic_tasks():
    logging.info(str(sys.argv))
    end = dbacc.nowISO()[0:10] + "T00:00:00Z"
    start = dbacc.dt2ISO(dbacc.ISO2dt(end) + datetime.timedelta(hours=-24))
    rst["end"] = end
    rst["start"] = start
    if len(sys.argv) > 1 and sys.argv[1] == "preview":
        rst["preview"] = True
        rst["start"] = end
        rst["end"] = dbacc.nowISO()
    daily_activity()
    # send_reminders()


# kick off all processing
run_periodic_tasks()
