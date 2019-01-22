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


def stats_from_data(csv):
    if not csv:
        return 0, 0, 0
    ttl = 0
    entries = csv.split(",")
    for entry in entries:
        elements = entry.split(";")
        # ident = elements[0]
        start = appuser.iso2DT(elements[1])
        end = appuser.iso2DT(elements[2])
        ttl += (end - start).total_seconds()
    return ttl / len(entries), ttl, len(entries)


def usec(secs, units):
    if units == "m":
        return str(round(secs / 60, 1)) + "m"
    return str(round(secs, 1)) + "s"


def recent_completions(thresh):
    vq = appuser.VizQuery(TLComp, "ORDER BY created DESC")
    tlcs = vq.fetch(30, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
    cs = ""
    for tc in tlcs:
        if tc.created < thresh:
            break
        data = json.loads(tc.data)
        pavg, pttl, pcount = stats_from_data(data["pts"])
        savg, sttl, scount = 0, 0, 0
        if "svs" in data:
            savg, sttl, scount = stats_from_data(data["svs"])
        ttl = pttl + sttl
        uname = tc.username or "NONAME"
        cs += (uname + " (uid: " + str(tc.userid) + ") completed " + 
               tc.tlname + " (tlid: " + str(tc.tlid) + ") on " + tc.created + 
               " ptavg: " + usec(pavg, "s") + 
               ", time: " + usec(ttl, "m") + "\n")
    return cs


def completion_stats(prog):
    pavg, pttl, pcount = stats_from_data(prog["pts"])
    savg, sttl, scount = 0, 0, 0
    if "svs" in prog:
        savg, sttl, scount = stats_from_data(prog["svs"])
    return {"pavg":pavg, "pttl":pttl, "pcount":pcount,
            "savg":savg, "sttl":sttl, "scount":scount}


# Write the completion record, then update the account.  Not worth a chained
# transaction.  If anything goes wrong it is possible to end up with a
# duplicate TLComp entry on retry.  Might have to dedupe query results.  A
# user can complete a timeline more than once if they want.
class NoteTimelineCompletion(webapp2.RequestHandler):
    def post(self):
        acc = appuser.get_authenticated_account(self, False)
        if not acc:
            return
        params = appuser.read_params(self, ["tlid", "tlname", "tltitle", 
                                            "tlsubtitle"]);
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
            if "count" not in compinst:  # completed before count introduced
                compinst["count"] = 1    # at least one completion, start there
            compinst["name"] = params["tlname"]  # update name in case changed
        else:
            compinst = {"tlid":tlid, "name":params["tlname"], 
                        "count":0, "first":tstamp}
        compinst["latest"] = tstamp
        compinst["count"] += 1
        compinst["title"] = params["tltitle"]
        compinst["subtitle"] = params["tlsubtitle"]
        compinst["stats"] = completion_stats(proginst)
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
        tlid = int(params["tlid"])
        vq = appuser.VizQuery(TLComp, "WHERE tlid=:1 LIMIT 50", tlid)
        res = vq.fetch(50, read_policy=db.EVENTUAL_CONSISTENCY, deadline=40)
        appuser.return_json(self, res)


class CompletionStats(webapp2.RequestHandler):
    def get(self):
        acc = appuser.get_authenticated_account(self, False)
        if not acc:
            return
        if acc.orgid != 1 or acc.lev != 2:
            return appuser.srverr(self, 403, "Admin access only.")
        text = recent_completions("2018-01-01T00:00:00Z")
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(text)


app = webapp2.WSGIApplication([('.*/notecomp', NoteTimelineCompletion),
                               ('.*/findcomps', FindCompletions),
                               ('.*compstats', CompletionStats)],
                              debug=True)

