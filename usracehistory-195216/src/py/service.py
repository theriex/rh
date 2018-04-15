import webapp2
from google.appengine.ext import db
import logging
import appuser

class AppService(db.Model):
    name = db.StringProperty(required=True)   # Unique service name
    ckey = db.StringProperty(indexed=False)   # consumer key
    csec = db.StringProperty(indexed=False)   # consumer secret
    data = db.TextProperty()                  # svc specific support data


class PublicPointIds(webapp2.RequestHandler):
    def get(self):
        ppsn = "pubpts"
        qp = {"dboc": AppService, "where": "WHERE name=:1 LIMIT 1", 
              "wags": ppsn}
        svc = appuser.cached_get(ppsn, qp)
        if not svc:
            svc = AppService(name=ppsn, data="")
            appuser.cached_put(ppsn, svc)
        self.response.headers['Access-Control-Allow-Origin'] = '*'
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(svc.data)


app = webapp2.WSGIApplication([('.*/pubptids', PublicPointIds)],
                              debug=True)

