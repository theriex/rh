import webapp2
import datetime
from google.appengine.ext import db
from google.appengine.api import memcache
import logging
import appuser
import point
import daycount
import json
import re
import pickle

# A timeline is the first data retrieved on site access and it includes the
# summarized point data for fast display.  This cached summary data is NOT
# automatically updated when a point changes, it remains stable until the
# timeline owner or an administrator refreshes it.  The cached point data
# includes only the text best matching the language code for the timeline,
# and may filter other fields not directly necessary for timeline display.
# GAE has a 1mb total storage limit for any field or object instance.
#
# Featuring a timeline for recommendation:
#     Unlisted: Don't display in listings or recommend.  Possibly in progress.
#     Listed: Ok to display in listings and recommend.
#     -mm-dd: Feature annually on and around this date.
#     -mm-Dn-Wn: Feature annually on the given day and week of the month.
#     Promoted: Optional priority consideration for suppviz timelines.
# Here's a few examples of annual observations:
#    -01-W3-D1  Third Monday of January  (Martin Luther King, Jr. Day)
#    -11-W4-D4  Fourth Thursday in November  (U.S. Thanksgiving)
#    -03-31     March 31  (Cesar Chavez day)
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
    featured = db.StringProperty() # See class comment on featuring
    lang = db.StringProperty(indexed=False)  # e.g. en-US, en-US-x-grade etc
    comment = db.TextProperty()    # text at startup (see db.js parseComment)
    about = db.TextProperty()      # html to include in about (see support.js)
    ctype = db.StringProperty()    # Timelines|Points|Random [:levcnt:rndmax]
    cids = db.TextProperty()       # CSV of Point ids or Timeline ids
    svs = db.TextProperty()        # CSV of SuppViz module names
    preb = db.TextProperty()       # JSON prebuilt point data
    orgid = db.IntegerProperty()   # Organization id (if any)
    created = db.StringProperty()  # ISO datetime
    modified = db.StringProperty() # ISO datetime


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
                            "refs":pt.refs,
                            "qtype":pt.qtype,
                            "groups":pt.groups,
                            "regions":pt.regions,
                            "categories":pt.categories,
                            "tags":pt.tags,
                            "orgid": str(pt.orgid),
                            "source": pt.source,
                            "pic": picval,
                            # an org contributor may edit only if point owner.
                            # that's determined from the created accID
                            "created": pt.created,
                            "modified": pt.modified})
    jtxt = "[" + jtxt + "]"
    return jtxt


def may_edit_timeline(handler, acc, timeline):
    # sys admin may edit any timeline (restore a pic, or other maintenance)
    if acc.orgid == 1 and acc.lev == 2:
        return True
    # check org level access.  org may be zero for public user but still matched
    if not timeline.orgid or acc.orgid == timeline.orgid:
        # org admin may edit any timeline for their org
        if acc.lev == 2:
            return True
        # if they have edited the timeline before (either created it or were
        # given access to edit it by an org admin) then they can edit it.
        # PENDING: interface for admin to allow edit access to timeline
        # Interim is to promote a user to admin, then demote them back to 
        # contributor after they have it in their built list.
        if str(timeline.key().id()) in acc.built:
            return True
    return False


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
        if not may_edit_timeline(handler, acc, timeline):
            return
    if not timeline:  # not found, create new
        timeline = Timeline(name=params["name"], created=now)
    timeline.name = params["name"]
    timeline.cname = canonize(timeline.name)
    timeline.slug = params["slug"] or ""
    timeline.title = params["title"] or ""
    timeline.subtitle = params["subtitle"] or ""
    timeline.featured = params["featured"] or ""
    timeline.lang = params["lang"] or "en-US"
    timeline.comment = params["comment"] or ""
    timeline.about = params["about"] or ""
    timeline.ctype = params["ctype"]
    timeline.cids = params["cids"] or ""
    timeline.svs = params["svs"] or ""
    timeline.preb = rebuild_prebuilt_timeline_points(timeline)
    timeline.orgid = timeline.orgid or acc.orgid
    timeline.modified = now
    appuser.cached_put(None, timeline)
    return timeline


def update_timeline_list(tlist, timeline):
    # place the given timeline first in the list so the app can select the
    # most recently modified timeline as the default to work with.
    tlist = tlist or "[]"
    tlist = json.loads(tlist)
    tlist = [tl for tl in tlist if tl["tlid"] != str(timeline.key().id())]
    tlist.insert(0, {"tlid": str(timeline.key().id()),
                     "name": timeline.name})
    return json.dumps(tlist)


def fetch_timeline_by_id (tlid):
    tlid = str(tlid)
    logging.info("fetch_timeline_by_id: " + tlid)
    tl = appuser.cached_get(tlid, {"dboc": Timeline, "byid": tlid})
    return tl
    

def fetch_timeline_by_slug (slug):
    logging.info("fetch_timeline_by_slug: " + slug)
    instid = memcache.get(slug)
    if instid:
        # if slug was a tlid, then we found the cached version and it should
        # be reconstituted.  Otherwise we found the tlid
        try:
            tl = pickle.loads(instid)
            return tl
        except:
            return fetch_timeline_by_id(instid)
    # If slug is all numbers, look it up as a tlid
    if re.match(r'^[0-9]+$', slug):
        return fetch_timeline_by_id(slug)
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
    tl = Timeline(name="Bootstrap Demo", ctype="Points:6", svs="")
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
        acc = appuser.authenticated(self.request)
        if not acc:
            return srverr(self, 401, "Authentication failed")
        params = appuser.read_params(self, ["instid", "name", "ctype", "cids", 
                                            "svs", "slug", "title", "subtitle",
                                            "featured", "lang", "comment", 
                                            "about"]);
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
                slug = "default"
            slug = slug.lower()  # just in case someone camel cases a url..
            tl = fetch_timeline_by_slug(slug)
        if not tl and slug == "default":
            tl = make_bootstrap_demo()
        if not tl:
            return appuser.srverr(self, 404, "No Timeline " + tlid)
        uidp = self.request.get("uidp")
        if uidp:
            daycount.note_timeline_fetch(self, tl, uidp)
        tls = contained_timelines(tl);
        appuser.return_json(self, tls);


app = webapp2.WSGIApplication([('.*/updtl', UpdateTimeline),
                               ('.*/fetchtl', FetchTimeline)],
                              debug=True)

