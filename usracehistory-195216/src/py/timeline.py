import webapp2
import datetime
from google.appengine.ext import db
from google.appengine.api import memcache
import logging
import appuser
import json
import re

# A timeline is the first data retrieved on site access and it includes the
# summarized point data for fast display.  This cached summary data is NOT
# automatically updated when a point changes, it remains stable until the
# timeline owner or an administrator refreshes it.  The cached point data
# includes only the text best matching the language code for the timeline,
# and may filter other fields not directly necessary for timeline display.
#
# A timeline is language specific.  Translated timelines have translated
# names and are separate instances.  Timelines can be created by anyone, but
# only timelines created by a Contributor have an associated Organization
# used for general search retrieval.
#
# For non-aggregate timelines (ctype Points or Random), the ctype value may
# optionally specify the number of points presented before each save.  If
# not specified, the default is 6.  A Random points timeline may optionally
# specify a maximum number of points to present.  Points timelines present
# points in date order.  Aggregate timelines present contained timelines in
# the order specified.
#
# When a user searches for timelines, they see:
#  - Timelines they own (published or in development)
#  - Remembered or started timelines
#  - The most recently accessed timelines (from daycount toptls)
class Timeline(db.Model):
    """ A collection of points and suppviz, or other timelines. """
    name = db.StringProperty(required=True)  # unique search results value
    cname = db.StringProperty()    # canonical name for more robust query match
    slug = db.StringProperty()     # unique permalink label, Contributors only
    lang = db.StringProperty(indexed=False)  # e.g. en-US, en-US-x-grade etc
    comment = db.TextProperty()    # optional credit, short descrip, whatever
    orgid = db.IntegerProperty()   # Organization id (if accepted by org)
    ctype = db.StringProperty()    # Timelines|Points|Random [:levcnt:rndmax]
    cids = db.TextProperty()       # CSV of Point ids or Timeline ids
    preb = db.TextProperty()       # prebuilt point data
    created = db.StringProperty()  # ISO datetime;TLAcc id (owner)
    modified = db.StringProperty() # ISO datetime;TLAcc id


def canonize(cankey):
    # whitespace and generally problematic characters
    cankey = re.sub(r'\s', '', cankey)
    cankey = re.sub(r'\"', '', cankey)
    cankey = re.sub(r'\.', '', cankey)
    # URI reserved delimiters
    cankey = re.sub(r'\:', '', cankey)
    cankey = re.sub(r'\/', '', cankey)
    cankey = re.sub(r'\?', '', cankey)
    cankey = re.sub(r'\#', '', cankey)
    cankey = re.sub(r'\[', '', cankey)
    cankey = re.sub(r'\]', '', cankey)
    cankey = re.sub(r'\@', '', cankey)
    # URI reserved sub delimiters
    cankey = re.sub(r'\!', '', cankey)
    cankey = re.sub(r'\$', '', cankey)
    cankey = re.sub(r'\&', '', cankey)
    cankey = re.sub(r'\'', '', cankey)
    cankey = re.sub(r'\(', '', cankey)
    cankey = re.sub(r'\)', '', cankey)
    cankey = re.sub(r'\*', '', cankey)
    cankey = re.sub(r'\+', '', cankey)
    cankey = re.sub(r'\,', '', cankey)
    cankey = re.sub(r'\;', '', cankey)
    cankey = re.sub(r'\=', '', cankey)
    cankey = cankey.lower()
    return cankey


def update_or_create_timeline(handler, acc, params):
    timeline = None
    now = appuser.nowISO()
    instid = params["instid"] or 0
    cname = canonize(params["name"])
    vq = appuser.VizQuery(Timeline, "WHERE cname=:1 LIMIT 1", cname)
    tls = vq.fetch(1, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
    if len(tls) > 0:
        if int(instid) != tls[0].key().id():
            return appuser.srverr(handler, 406, "Name already used")
        timeline = tls[0]
    if not timeline:  # not found, create new
        timeline = Timeline(name=params["name"], slug=params["slug"] or "",
                            lang=params["lang"] or "en-US",
                            comment=params["comment"] or "",
                            orgid=acc.orgid, ctype=params["ctype"],
                            cids=params["cids"] or "",
                            created=now)
    cname = canonize(timeline.name)
    # TODO: update prebuilt points data (rebuild all in case text changed)
    timeline.modified = now
    appuser.cached_put(str(timeline.key().id()), timeline)
    return timeline


def update_timeline_list(tlist, timeline):
    tlist = tlist or "[]"
    tlist = json.loads(tlist)
    found = False
    for entry in tlist:
        if int(entry.tlid) == timeline.key().id():
            found = True
            entry["name"] = timeline.name
    if not found:
        tlist.append({"tlid": str(timeline.key().id()),
                      "name": timeline.name})
    return json.dumps(tlist)


class UpdateTimeline(webapp2.RequestHandler):
    def post(self):
        acc = appuser.get_authenticated_account(self, False)
        if not acc:
            return
        params = appuser.read_params(self, ["instid", "name", "ctype", "cids", 
                                            "slug", "lang", "comment"]);
        timeline = update_or_create_timeline(self, acc, params)
        if timeline:
            updated = update_timeline_list(acc.built, timeline)
            if updated != acc.built:
                acc.built = updated
                appuser.cached_put(acc.email, acc)
            appuser.return_json(self, [timeline, acc])


class FetchTimeline(webapp2.RequestHandler):
    def get(self):
        tlid = self.request.get("tlid")
        tl = memcache.get(tlid)
        if not tl:
            tl = Timeline.get_by_id(int(tlid))
        if not tl:
            return appuser.srverr(self, 404, "No Timeline " + tlid)
        appuser.return_json(self, [tl])


app = webapp2.WSGIApplication([('.*/updtl', UpdateTimeline),
                               ('.*/fetchtl', FetchTimeline)],
                              debug=True)

