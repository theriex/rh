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
    # PENDING: avg num points completed, avg time/pt (also note from accounts)
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


def recent_access_accounts(thresh):
    vq = appuser.VizQuery(appuser.AppUser, "ORDER BY accessed DESC")
    accs = vq.fetch(1000, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
    names = ""
    for acc in accs:
        if acc.accessed < thresh:
            break
        if names:
            names += ", "
        names += acc.email
    return names


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


class PeriodicProcessing(webapp2.RequestHandler):
    def get(self):
        daysback = 1
        dtnow = datetime.datetime.utcnow()
        thresh = appuser.dt2ISO(dtnow - datetime.timedelta(daysback))
        body = "usracehistory access since " + thresh + "\n"
        body += recent_activity(thresh) + "\n"
        body += recent_access_accounts(thresh) + "\n"
        body += tlcomp.recent_completions(thresh) + "\n"
        body += recent_timeline_edits(thresh) + "\n"
        body += recent_point_edits(thresh) + "\n"
        subj = "usracehistory activity report"
        try:
            appuser.mailgun_send(None, "support@usracehistory.org", subj, body)
        except:
            logging.info(subj + "\n\n" + body)
            raise
        body += "\n-----------------------------"
        body += "\nPeriodicProcessing completed."
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(body)
        


app = webapp2.WSGIApplication([('.*/pubptids', PublicPointIds),
                               ('.*/periodic', PeriodicProcessing)],
                              debug=True)

