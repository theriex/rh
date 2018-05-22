import webapp2
import datetime
from google.appengine.ext import db
from google.appengine.api import memcache
import logging
import appuser
import point
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
    title = db.StringProperty()    # title for start dialog, not unique
    subtitle = db.StringProperty(indexed=False)  # text for start dialog
    lang = db.StringProperty(indexed=False)  # e.g. en-US, en-US-x-grade etc
    comment = db.TextProperty()    # optional credit, short descrip, whatever
    orgid = db.IntegerProperty()   # Organization id (if accepted by org)
    ctype = db.StringProperty()    # Timelines|Points|Random [:levcnt:rndmax]
    cids = db.TextProperty()       # CSV of Point ids or Timeline ids
    svs = db.TextProperty()        # CSV of SuppViz module names
    preb = db.TextProperty()       # JSON prebuilt point data
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


def rebuild_prebuilt_timeline_points(tl):
    if tl.ctype.startswith("Timelines") or not tl.cids:
        tl.preb = ""
        return
    jtxt = ""
    ptids = tl.cids.split(",")
    # The ptids may not be in chronological order.  They are just appended
    # to the CSV based on the order the user added them.  There should not
    # be any dupes.
    for ptid in ptids:
        pt = point.Point.get_by_id(int(ptid))
        # No need to cache individual points post retrieval.  They are never
        # accessed by themselves except for here.
        if not pt:
            logging.warn("timeline " + str(tl.key().id()) + 
                         " references non-existant point " + ptid)
            continue
        picval = ""
        if pt.pic:
            picval = ptid
        if jtxt:
            jtxt += ","
        # PENDING: match tl lang to appropriate point translation
        jtxt += json.dumps({"instid": ptid,
                            "date": pt.date,
                            "text": pt.text,
                            "codes": pt.codes,
                            "orgid": str(pt.orgid),
                            "keywords": pt.keywords,
                            "source": pt.source,
                            "pic": picval,
                            "modified": pt.modified})
    jtxt = "[" + jtxt + "]"
    return jtxt


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
    if instid and not timeline:
        timeline = Timeline.get_by_id(int(instid))
        if not timeline:
            return appuser.srverr(handler, 404, "No Timeline " + instid)
    if not timeline:  # not found, create new
        timeline = Timeline(name=params["name"], created=now)
    timeline.name = params["name"]
    timeline.cname = canonize(timeline.name)
    timeline.slug = params["slug"] or ""
    timeline.title = params["title"] or ""
    timeline.subtitle = params["subtitle"] or ""
    timeline.lang = params["lang"] or "en-US"
    timeline.comment = params["comment"] or ""
    timeline.orgid = acc.orgid
    timeline.ctype = params["ctype"]
    timeline.cids = params["cids"] or ""
    timeline.svs = params["svs"] or ""
    timeline.preb = rebuild_prebuilt_timeline_points(timeline)
    timeline.modified = now
    appuser.cached_put(None, timeline)
    return timeline


def update_timeline_list(tlist, timeline):
    tlist = tlist or "[]"
    tlist = json.loads(tlist)
    found = False
    for entry in tlist:
        if int(entry["tlid"]) == timeline.key().id():
            found = True
            entry["name"] = timeline.name
    if not found:
        tlist.append({"tlid": str(timeline.key().id()),
                      "name": timeline.name})
    return json.dumps(tlist)


def fetch_timeline_by_id (tlid):
    tlid = str(tlid)
    tl = appuser.cached_get(tlid, {"dboc": Timeline, "byid": tlid})
    return tl
    

def fetch_timeline_by_slug (slug):
    instid = memcache.get(slug)
    if instid:
        return fetch_timeline_by_id(instid)
    vq = appuser.VizQuery(Timeline, "WHERE slug=:1 LIMIT 1", slug)
    instances = vq.fetch(1, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
    if len(instances) > 0:
        timeline = instances[0]
        memcache.set(slug, str(timeline.key().id()))
        appuser.cached_put(None, timeline)
        return timeline
    return None


def make_bootstrap_demo ():
    # When no demo timeline exists, make something to boot the system with.
    tl = Timeline(name="Bootstrap Demo", orgid=1, ctype="Points:6", svs="")
    ptids = []
    pts = point.Point.all()
    for pt in pts:
        ptids.append(str(pt.key().id()))
        if len(ptids) > 24:
            break
    tl.cids = ",".join(ptids)
    tl.preb = rebuild_prebuilt_timeline_points(tl)
    return tl


def contained_timelines (tl):
    result = [tl]
    if tl.ctype.startswith("Timelines"):
        for cid in tl.cids.split(","):
            ct = fetch_timeline_by_id(int(cid))
            ct = ct or "null"
            result.append(ct)
    return result


class UpdateTimeline(webapp2.RequestHandler):
    def post(self):
        acc = appuser.get_authenticated_account(self, False)
        if not acc:
            return
        params = appuser.read_params(self, ["instid", "name", "ctype", "cids", 
                                            "svs", "slug", "title", "subtitle",
                                            "lang", "comment"]);
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
        slug = ""
        if tlid:
            tl = fetch_timeline_by_id(tlid)
        else:
            slug = self.request.get("slug")
            if not slug:
                slug = "demo"
            slug = slug.lower()  # just in case someone camel cases a url..
            tl = fetch_timeline_by_slug(slug)
        if not tl and slug == "demo":
            tl = make_bootstrap_demo()
        if not tl:
            return appuser.srverr(self, 404, "No Timeline " + tlid)
        tls = contained_timelines(tl);
        appuser.return_json(self, tls);


app = webapp2.WSGIApplication([('.*/updtl', UpdateTimeline),
                               ('.*/fetchtl', FetchTimeline)],
                              debug=True)

