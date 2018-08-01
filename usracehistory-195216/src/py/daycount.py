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


def write_dc_entry(handler, dct, data):
    headers = handler.request.headers
    hkeys = ["Referer", "User-Agent", "X-Appengine-Country", 
             "X-Appengine-Citylatlong", "X-Appengine-Region"]
    names = ["referer", "agent", "country", "latlong", "region"]
    for idx, key in enumerate(hkeys):
        val = ""
        if key in headers:
            val = headers[key]
        data[names[idx]] = val
    record = DayCount(tstamp=appuser.nowISO(), rtype=dct,
                      detail=json.dumps(data))
    record.put()


def note_timeline_fetch(handler, tl, uidp):
    dc = {"tlid": str(tl.key().id()), "tlname":tl.name, "uidp": uidp}
    write_dc_entry(handler, "tlfetch", dc)


class NoteProgress(webapp2.RequestHandler):
    def post(self):
        if not appuser.verify_secure_comms(self):
            return
        data = appuser.read_params(self, ["uidp", "tlid", "st", "svs", "pts"]);
        if data["uidp"] and data["tlid"] and data["pts"]:
            write_dc_entry(self, "tlsave", data)
        appuser.return_json(self, "[]")


app = webapp2.WSGIApplication([('.*/noteprog', NoteProgress)],
                              debug=True)

