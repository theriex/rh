import webapp2
import datetime
from google.appengine.ext import db
import logging
import appuser
import json

# Write once Timeline Completion archive record.  See the AppUser class
# comment for the timeline progress instance description.
class TLComp(db.Model):
    """ Archive record of completed timeline progress data. """
    userid = db.IntegerProperty(required=True)   # AppUser Id
    tlid = db.IntegerProperty(required=True)     # Timeline Id
    username = db.StringProperty(indexed=False)  # Ease of reference
    tlname = db.StringProperty(indexed=False)    # Ease of reference
    data = db.TextProperty()       # JSON timeline progress instance
    created = db.StringProperty()  # ISO datetime


# Write the completion record, then update the account.  Not worth a chained
# transaction.  If anything goes wrong it is possible to end up with a
# duplicate TLComp entry on retry.  Might have to dedupe query results.  A
# user can complete a timeline more than once if they want.
class NoteTimelineCompletion(webapp2.RequestHandler):
    def post(self):
        acc = appuser.get_authenticated_account(self, False)
        if not acc:
            return
        params = appuser.read_params(self, ["tlid", "tlname"]);
        tlid = params["tlid"]
        started = json.loads(acc.started)
        proginst = [pi for pi in started if pi["tlid"] == tlid]
        if not len(proginst):
            return appuser.srverr(self, 400, "Timeline " + tlid + " (" +
                                  params["tlname"] + ") not found")
        proginst = proginst[0]
        tstamp = appuser.nowISO()
        comp = TLComp(userid=acc.key().id(), tlid=int(tlid), username=acc.name,
                      tlname=params["tlname"], data=json.dumps(proginst),
                      created=tstamp)
        comp.put()
        # Update the account and return the updated version
        started = [pi for pi in started if pi["tlid"] != tlid]
        completed = json.loads(acc.completed)
        compinst = [ci for ci in completed if ci["tlid"] == tlid]
        if len(compinst):
            compinst = compinst[0]
            compinst["latest"] = tstamp
        else:
            compinst = {"tlid":tlid, "name":"tlname", "first":tstamp,
                        "latest":tstamp}
        completed = [ci for ci in completed if ci["tlid"] != tlid]
        completed.append(compinst)
        acc.started = json.dumps(started)
        acc.completed = json.dumps(completed)
        appuser.update_account(self, acc)


class FindCompletions(webapp2.RequestHandler):
    def get(self):
        acc = appuser.get_authenticated_account(self, False)
        if not acc:
            return
        params = appuser.read_params(self, ["tlid"]);
        tlid = params["tlid"]
        vq = appuser.VizQuery(TLComp, "WHERE tlid=:1 LIMIT 50", tlid)
        res = vq.fetch(50, read_policy=db.EVENTUAL_CONSISTENCY, deadline=40)
        appuser.return_json(self, res)


app = webapp2.WSGIApplication([('.*/notecomp', NoteTimelineCompletion),
                               ('.*/findcomps', FindCompletions)],
                              debug=True)

