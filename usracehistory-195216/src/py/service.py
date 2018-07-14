import webapp2
from google.appengine.ext import db
import logging
import appuser
import datetime

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


def recent_access_accounts(days=1):
    dtnow = datetime.datetime.utcnow()
    thresh = appuser.dt2ISO(dtnow - datetime.timedelta(days))
    vq = appuser.VizQuery(appuser.AppUser, "ORDER BY accessed DESC")
    accs = vq.fetch(1000, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
    names = ""
    for acc in accs:
        logging.info(acc.email + " " + acc.accessed)
        if acc.accessed < thresh:
            break
        if names:
            names += ", "
        names += acc.email
    return names


class PeriodicProcessing(webapp2.RequestHandler):
    def get(self):
        daysback = 3
        dtnow = datetime.datetime.utcnow()
        thresh = appuser.dt2ISO(dtnow - datetime.timedelta(daysback))
        body = "usracehistory access since " + thresh + "\n"
        body += recent_access_accounts(daysback)
        subj = "usracehistory activity report"
        try:
            appuser.mailgun_send(None, "support@usracehistory.org", subj, body)
        except:
            logging.info(subj + "\n\n" + body)
            raise
        body += "\nPeriodicProcessing completed."
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(body)
        


app = webapp2.WSGIApplication([('.*/pubptids', PublicPointIds),
                               ('.*/periodic', PeriodicProcessing)],
                              debug=True)

