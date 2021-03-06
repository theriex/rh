import webapp2
from google.appengine.ext import db
import logging
import appuser
import point
import timeline
import tlcomp
import daycount
import datetime
import json
from google.appengine.api import urlfetch

class AppService(db.Model):
    name = db.StringProperty(required=True)   # Unique service name
    ckey = db.StringProperty(indexed=False)   # consumer key
    csec = db.StringProperty(indexed=False)   # consumer secret
    data = db.TextProperty()                  # svc specific support data


def get_service_info(svcname):
    qp = {"dboc": AppService, "where": "WHERE name=:1 LIMIT 1", 
          "wags": svcname}
    svc = appuser.cached_get(svcname, qp)
    if not svc:  # make an empty placeholder entry
        svc = AppService(name=svcname, ckey="unknown", csec="unknown", data="")
        appuser.cached_put(svcname, svc)
    return svc


class PublicPointIds(webapp2.RequestHandler):
    def get(self):
        svc = get_service_info("pubpts")
        self.response.headers['Access-Control-Allow-Origin'] = '*'
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(svc.data)


def recent_activity(thresh):
    tlf = {}
    sav = {}
    vq = appuser.VizQuery(daycount.DayCount, "ORDER BY tstamp DESC")
    dcs = vq.fetch(42000, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
    for dc in dcs:
        if dc.tstamp < thresh:
            break
        detail = json.loads(dc.detail)
        tlid = detail["tlid"]
        if dc.rtype == "tlfetch":
            if tlid in tlf:
                tlf[tlid] += 1
            else:
                tlf[tlid] = 1
        elif dc.rtype == "tlsave":
            if detail["uidp"] not in sav:  # save not already noted
                sav[detail["uidp"]] = len(detail["pts"].split(","))
    summary = ""
    for key in tlf:
        name = key
        tl = timeline.fetch_timeline_by_id(int(key))
        if tl:
            name += " (" + tl.name + ")"
        summary += "tlfetch " + name + ": " + str(tlf[key]) + "\n"
    for key in sav:
        summary += " tlsave " + key + ": " + str(sav[key]) + "\n"
    return summary


# dtnow = datetime.datetime.utcnow()
# sched = {" 1 day": dt2ISO(dtnow - datetime.timedelta(hours=4)),
#          " 7 day": dt2ISO(dtnow - datetime.timedelta(7)),
#          "14 day": dt2ISO(dtnow - datetime.timedelta(14)),
#          "30 day": dt2ISO(dtnow - datetime.timedelta(30))}
# tlp = {"remindme": "yes", "latestsave": "2018-07-22T21:15:11Z", 
#        "reminder": "30 day"}
# reminder_due(tlp, sched)
def reminder_due(tlp, sched):
    if "remindme" not in tlp or tlp["remindme"] != "yes":
        return ""
    if "latestsave" not in tlp:
        return ""
    for key in sched:
        if tlp["latestsave"] < sched[key]:
            if "reminder" not in tlp or tlp["reminder"] < key:
                return key
    return ""


def send_reminder_if_needed(acc, sched):
    remlog = ""
    acc.started = acc.started or "[]"
    started = json.loads(acc.started)
    for tlp in started:
        rdue = reminder_due(tlp, sched)
        if rdue:
            tlp["reminder"] = rdue
            remlog = rdue + " reminder " + acc.email + " tlid: " + tlp["tlid"]
            body = "As requested, this is your " + rdue + " reminder to finish the timeline you started.  The best is yet to come.  Here's the link to continue: https://pastkey.org/timeline/" + tlp["tlid"] + "?email=" + acc.email + "&authtok=" + appuser.token_for_user(acc)
            subj = rdue + " timeline reminder"
            try:
                appuser.mailgun_send(None, acc.email, subj, body)
            except Exception as e:
                logging.warn("send_reminder_if_needed failure: " + str(e) + 
                             "\n" + subj + "\n" + acc.email + "\n\n" + body)
            # Only send one reminder even if they have multiple started
            # timelines. If they have another it will be picked up tomorrow.
            break
    if remlog:
        acc.started = json.dumps(started)
        appuser.cached_put(acc.email, acc)
    return remlog


def recent_access_accounts(thresh):
    dtnow = datetime.datetime.utcnow()
    remax = appuser.dt2ISO(dtnow - datetime.timedelta(31))
    # The leading spaces are needed for lexicographical comparison
    sched = {" 1 day": appuser.dt2ISO(dtnow - datetime.timedelta(hours=4)),
             " 7 day": appuser.dt2ISO(dtnow - datetime.timedelta(7)),
             "14 day": appuser.dt2ISO(dtnow - datetime.timedelta(14)),
             "30 day": appuser.dt2ISO(dtnow - datetime.timedelta(30))}
    names = ""
    remsent = ""
    vq = appuser.VizQuery(appuser.AppUser, "ORDER BY accessed DESC")
    accs = vq.fetch(1000, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
    for acc in accs:
        if acc.accessed < remax:
            break  # everything else is too old to bother with
        remsent += send_reminder_if_needed(acc, sched)
        if acc.accessed >= thresh:
            if names:
                names += ", "
            names += acc.email
    return names + "\n" + remsent


def recent_point_edits(thresh):
    vq = appuser.VizQuery(point.Point, "ORDER BY modified DESC")
    pts = vq.fetch(1000, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
    ptsums = ""
    for pt in pts:
        if pt.modified < thresh:
            break
        if ptsums:
            ptsums += "\n"
        ptsum = ("[ptid " + str(pt.key().id()) + "] " + pt.date + " " +
                 pt.text[0:512])
        logging.info(ptsum)
        ptsums += ptsum
    return ptsums


def recent_timeline_edits(thresh):
    vq = appuser.VizQuery(timeline.Timeline, "ORDER BY modified DESC")
    tls = vq.fetch(1000, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
    tlsums = ""
    for tl in tls:
        if tl.modified < thresh:
            break
        if tlsums:
            tlsums += "\n"
        tlsum = ("[tlid " + str(tl.key().id()) + "] " + tl.name)
        logging.info(tlsum)
        tlsums += tlsum
    return tlsums


def vlt_strval_comp(idx, dbo, jd, fields):
    diffs = []
    for field in fields:
        if field == "instid":
            if str(dbo.key().id()) != str(jd["instid"]):
                diffs.append(field)
        else: # standard field comparison check
            if str(getattr(dbo, field)) != str(jd[field]):
                diffs.append(field)
    if len(diffs):
        return " [" + str(idx) + "] " + ", ".join(diffs)
    return ""


def verify_listed_timelines(handler):
    url = "https://pastkey.org/docs/tlrec.json"
    misms = ""
    if appuser.is_local_devenv(handler):
        # example handler request.url http://0.0.0.0:9080/periodic
        ru = handler.request.url
        url = ru[0:ru.rfind("/")] + "/docs/tldev.json"
    fpath = "docs" + url[url.rfind("/"):]
    jts = "[]"
    try:
        result = urlfetch.fetch(url, deadline=10)
        if not result or result.status_code != 200:
            misms += "vlt fetch status " + str(result.status_code) + "\n"
        else:
            jts = result.content
    except Exception as e:
        misms += "vlt fetch fail: " + str(e)
    jts = json.loads(jts)
    rj = ""
    vq = appuser.VizQuery(timeline.Timeline, 
                          "WHERE featured < 'Unlisted' ORDER BY featured")
    dts = vq.fetch(200, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
    for idx, dt in enumerate(dts):
        if idx >= len(jts):
            misms += " [" + str(idx) + "] added"
        else:
            jt = jts[idx]
            # if instid diff, then the ordering has changed.
            # if modified, then important details might have changed.
            # changes to featured have some urgency in getting reflected.
            misms += vlt_strval_comp(idx, dt, jt, 
                                     ["instid", "featured", "modified"])
        if rj:
            rj += ",\n"
        rj += appuser.dbo2json(dt, skips=["preb"])
    rj = "[" + rj + "]\n"
    msg = fpath + " up to date."
    if misms:
        msg = fpath + " OUTDATED. Update with emailed content."
        msg += "\n" + misms
        try:
            appuser.mailgun_send(None, "support@pastkey.org", msg, rj)
        except Exception as e:
            logging.warn("verify_listed_timelines send fail: " + str(e))
    return msg


class PeriodicProcessing(webapp2.RequestHandler):
    def get(self):
        daysback = 1
        dtnow = datetime.datetime.utcnow()
        thresh = appuser.dt2ISO(dtnow - datetime.timedelta(daysback))
        body = "PastKey access since " + thresh + "\n"
        try:
            body += "***Recent Activity:\n"
            body += recent_activity(thresh) + "\n"
            body += "***Recent Access Accounts:\n"
            body += recent_access_accounts(thresh) + "\n"
            body += "***Recent Completions:\n"
            body += tlcomp.recent_completions(thresh) + "\n"
            body += "***Recent Timeline Edits:\n"
            body += verify_listed_timelines(self) + "\n"
            body += recent_timeline_edits(thresh) + "\n"
            body += "***Recent Point Edits:\n"
            body += recent_point_edits(thresh) + "\n"
        except:
            logging.warn("Data retrieval failure, body: " + body)
            raise
        subj = "PastKey activity report"
        try:
            appuser.mailgun_send(None, "support@pastkey.org", subj, body)
        except:
            logging.warn(subj + "\n\n" + body)
            raise
        body += "\n-----------------------------"
        body += "\nPeriodicProcessing completed.\n"
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(body)
        


app = webapp2.WSGIApplication([('.*/pubptids', PublicPointIds),
                               ('.*/periodic', PeriodicProcessing)],
                              debug=True)

