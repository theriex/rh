import webapp2
import datetime
from google.appengine.ext import db
import logging
import appuser
import json

# DayCount keeps track of timeline fetches and progress saves to enable
# viewing activity.  Entries are aggregated nightly.
class DayCount(db.Model):
    """ Traffic access accumulator. May under-report if save errors. """
    tstamp = db.StringProperty(required=True)  # ISO day (midnight eastern)
    rtype = db.StringProperty(required=True)   # tlfetch, tlsave, daysum
    detail = db.TextProperty()                 # json dict


def noteTimelineFetch(handler, tl, uidp):
    dc = {"tlid": str(tl.key().id()), "tlname":tl.name, "uidp": uidp}
    headers = handler.request.headers
    hkeys = ["Referer", "User-Agent", "X-Appengine-Country", 
             "X-Appengine-Citylatlong", "X-Appengine-Region"]
    names = ["referer", "agent", "country", "latlong", "region"]
    for idx, key in enumerate(hkeys):
        val = ""
        if key in headers:
            val = headers[key]
        dc[names[idx]] = val
    record = DayCount(tstamp=appuser.nowISO(), rtype="tlfetch",
                      detail=json.dumps(dc))
    record.put()

