import webapp2
import datetime
from google.appengine.ext import db
from google.appengine.api import images
import logging
import appuser
import service
import org
import json
import re

# Accepted date formats:
#  - point: Y[YYY][ BCE], YYYY-MM, YYYY-MM-DD
#  - range: YYYY's, YYYY's-YYYY's, YYYY+, YYYY-YYYY, YYYY-MM[-DD]-YYYY-MM[-DD]
# Point text may reference another point using html anchor syntax and the 
# point id or source, e.g. "<a href=\"#N35\">Pontiac</a> signs ..."
# Question types:
#     S: Continue (default)
#     U: Did You Know?
#     D: Click correct year
#     F: Firsts
class Point(db.Model):
    """ A timeline data point """
    date = db.StringProperty(required=True)  # date text, see class comment
    text = db.TextProperty()       # max 1200 chars, prefer < 400
    refs = db.TextProperty()       # JSON array of reference source strings
    qtype = db.StringProperty()    # question type (see class comment)
    groups = db.TextProperty()     # CSV selected from org
    regions = db.TextProperty()    # CSV selected from org
    categories = db.TextProperty() # CSV selected from org
    tags = db.TextProperty()       # CSV selected from org
    codes = db.StringProperty()    # temp
    orgid = db.IntegerProperty()   # Organization id (owner)
    source = db.StringProperty()   # Initial creation load source
    srclang = db.StringProperty()  # en-US or en-US-x-grade only
    translations = db.TextProperty()  # JSON array {lang, text}
    pic = db.BlobProperty()        # optional freely shareable pic (file upload)
    endorsed = db.TextProperty()   # CSV of AppUser ids
    stats = db.TextProperty()      # optional JSON object for whatever data
    created = db.StringProperty()  # ISO datetime;TLAcc id (owner)
    modified = db.StringProperty() # ISO datetime;TLAcc id


def is_deleted_point(pt):
    if pt.stats and "\"status\":\"deleted\"" in pt.stats:
        return True
    return False


def point_summary_dict(pt):
    d = {"instid":str(pt.key().id()), "orgid":str(pt.orgid), 
         "created":pt.created, "modified":pt.modified, "date":pt.date, 
         "text":pt.text, "refs":pt.refs, "qtype":pt.qtype, "groups":pt.groups, 
         "regions":pt.regions, "categories":pt.categories, "tags":pt.tags,
         "source":pt.source, "srclang":pt.srclang, "codes":pt.codes or ""}
    # codes included for mapping of points on import.  Normally empty.
    return d


def update_org_recent_points(pt):
    # Rebuild org.recpre if empty or null, otherwise splice in pt.
    # Maintain max recpre size of 512k to stay within 1mb db obj limit.
    organization = org.Organization.get_by_id(int(pt.orgid))
    preb = organization.recpre
    if preb and len(preb) > 3000:  # save db quota, splice in pt
        ptid = str(pt.key().id())
        preb = json.loads(preb)
        # remove existing instance from prebuilt if it exists
        upda = [x for x in preb if "instid" in x and x["instid"] != ptid]
        # prepend the modified point unless deleted
        if not is_deleted_point(pt):
            upda.insert(0, point_summary_dict(pt))
        preb = json.dumps(upda)
        if len(preb) >= 512 * 1024:  # exceeded total size, knock last off
            upda = upda[0:len(upda) - 1]
            preb = json.dumps(upda)
    else: # rebuild from database query
        vq = appuser.VizQuery(Point, "WHERE orgid=:1 ORDER BY modified DESC",
                              pt.orgid)
        pts = vq.fetch(1000, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
        preb = ""
        for pt in pts:
            if len(preb) >= 512 * 1024:
                break
            if is_deleted_point(pt):
                continue
            if preb:
                preb += ","
            preb += json.dumps(point_summary_dict(pt))
        preb = "[" + preb + "]"
    organization.recpre = preb
    appuser.cached_put(None, organization)


def get_point_by_id_or_source(ptid, source):
    pt = None
    if ptid:
        pt = Point.get_by_id(int(ptid))
    if not pt and source:
        vq = appuser.VizQuery(Point, "WHERE source=:1 LIMIT 1", source)
        pts = vq.fetch(1, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
        if len(pts) > 0:
            pt = pts[0]
    return pt


def update_or_create_point(handler, acc, params):
    if not acc.lev:
        raise ValueError("Not a contributor account")
    pointorg = int(params["orgid"] or acc.orgid)
    if acc.orgid != pointorg and acc.orgid != 1:
        raise ValueError("Data does not match organization")
    pt = get_point_by_id_or_source(params["ptid"], params["source"])
    if pt and pt.orgid != acc.orgid:
        raise ValueError("Point does not match org")
    tstamp = appuser.nowISO() + ";" + str(acc.key().id())
    if pt:
        logging.info("updating point " + str(pt.key().id()))
        pt.modified = tstamp
    else:
        logging.info("creating new point for org " + str(acc.orgid))
        pt = Point(date=params["date"],
                   orgid=pointorg,
                   endorsed="",  # not updated from client
                   stats="",     # empty until updated from client
                   created=tstamp,
                   modified=tstamp)
    pt.date = params["date"] or pt.date
    pt.text = params["text"] or pt.text or ""
    pt.refs = params["refs"] or pt.refs or ""
    pt.qtype = params["qtype"] or pt.qtype or ""
    pt.groups = params["groups"] or pt.groups or ""
    pt.regions = params["regions"] or pt.regions or ""
    pt.categories = params["categories"] or pt.categories or ""
    pt.tags = params["tags"] or pt.tags or ""
    pt.codes = params["codes"] or pt.codes or ""
    pt.source = params["source"] or pt.source or ""
    pt.srclang = params["srclang"] or pt.srclang or "en-US"
    pt.stats = params["stats"] or ""
    pt.translations = params["translations"] or pt.translations or ""
    if params["picdelcb"]:
        pt.pic = None
    if params["pic"]:
        pt.pic = db.Blob(params["pic"])
        pt.pic = images.resize(pt.pic, 160, 160)
    pt.put()  # individual points are not cached
    pt = Point.get_by_id(pt.key().id())  # force db retrieval of latest
    update_org_recent_points(pt)
    return pt


class RecentPoints(webapp2.RequestHandler):
    def get(self):
        acc = appuser.verifyToken(self)
        if not acc:
            return
        # Check for "recent_points" is mcache and that JSON if found
        # Query for all points modified > LASTBUILDMODIFIED
        # Cache the results and return.  Email notify admin if > 20k
        appuser.srverr(self, 500, "Not implemented yet")


class FetchPublicPoints(webapp2.RequestHandler):
    def get(self):
        acc = appuser.authenticated(self.request)
        if not acc:
            return srverr(self, 401, "Authentication failed")
        if acc.orgid != 1 or acc.lev != 2:
            return appuser.srverr(self, 403, "Admin access only.")
        vq = appuser.VizQuery(service.AppService, "WHERE name=:1", "pubpts")
        svcs = vq.fetch(1, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
        if not len(svcs):  # create the entry as a placeholder
            svc = service.AppService(name="pubpts", ckey="", csec="", data="")
            svc.put()
        res = []  # result accumulator
        if len(svcs) > 0 and len(svcs[0].data) > 100:
            for ptid in svcs[0].data.split(","):
                pt = Point.get_by_id(int(ptid))
                if is_deleted_point(pt):
                    continue
                res.append(pt)
        else:  # no point ids to process, fetch everything
            pts = Point.all()
            for pt in pts:
                if is_deleted_point(pt):
                    continue
                res.append(pt)
        appuser.return_json(self, res)


class UpdatePoint(webapp2.RequestHandler):
    def get(self):
        self.response.headers['Content-Type'] = 'text/html;charset=UTF-8'
        self.response.write('Ready')
    def post(self):
        # ptupld could be sending password in params so refuse if not secured
        if not appuser.verify_secure_comms(self):
            return
        acc = appuser.authenticated(self.request)
        if not acc:
            return srverr(self, 401, "Authentication failed")
        appuser.dump_params(self)
        params = appuser.read_params(self, ["ptid", "date", "text", "refs",
                                            "qtype", "groups", "regions", 
                                            "categories", "tags", "codes",
                                            "orgid", "source", "srclang", 
                                            "stats", "translations", 
                                            "pic", "picdelcb"]);
        # need to return proper content to form submission iframe regardless
        self.response.headers['Content-Type'] = 'text/html;charset=UTF-8'
        try:
            pt = update_or_create_point(self, acc, params)
        except Exception as e:
            # Client looks for text containing "failed: " + for error reporting
            self.response.out.write("Point update failed: " + str(e))
            return
        self.response.out.write("ptid: " + str(pt.key().id()))


class GetPointPic(webapp2.RequestHandler):
    def get(self):
        ptid = self.request.get('pointid')
        if not ptid:
            return appuser.srverr(self, 400, "pointid needed for lookup")
        pt = Point.get_by_id(int(ptid))
        if not pt:
            return appuser.srverr(self, 404, "Point " + ptid + " not found")
        if not pt.pic:
            return appuser.srverr(self, 404, "Point " + ptid + " has no pic")
        img = images.Image(pt.pic)
        img.resize(width=160, height=160)
        img = img.execute_transforms(output_encoding=images.PNG)
        self.response.headers['Content-Type'] = "image/png"
        self.response.out.write(img)


class FetchPoint(webapp2.RequestHandler):
    def get(self):
        # PENDING: verify caller is an org contributor
        if not appuser.verify_secure_comms(self):
            return
        acc = appuser.authenticated(self.request)
        if not acc:
            return srverr(self, 401, "Authentication failed")
        ptid = self.request.get('pointid')
        if not ptid:
            return appuser.srverr(self, 400, "pointid required for lookup")
        pt = Point.get_by_id(int(ptid))
        if not pt:
            return appuser.srverr(self, 404, "Point " + ptid + " not found")
        appuser.return_json(self, [pt])


class NukePointPic(webapp2.RequestHandler):
    def get(self):
        acc = appuser.authenticated(self.request)
        if not acc:
            return srverr(self, 401, "Authentication failed")
        if acc.orgid != 1 or acc.lev != 2:
            return appuser.srverr(self, 403, "Admin access only.")
        ptid = self.request.get('pointid')
        pt = Point.get_by_id(int(ptid))
        pt.pic = None
        pt.put()
        self.response.out.write("Pic set to None for Point " + ptid)


class BatchProcessPoints(webapp2.RequestHandler):
    def get(self):
        acc = appuser.authenticated(self.request)
        if not acc:
            return srverr(self, 401, "Authentication failed")
        if acc.orgid != 1 or acc.lev != 2:
            return appuser.srverr(self, 403, "Admin access only.")
        pts = Point.all()
        for pt in pts:
            pt.groups = ""
            pt.regions = ""
            pt.categories = ""
            pt.tags = ""
            cats = []
            if "N" in pt.codes:
                cats.append("Native American")
            if "B" in pt.codes:
                cats.append("African American")
            if "L" in pt.codes:
                cats.append("Latino/as")
            if "A" in pt.codes:
                cats.append("Asian American")
            if "M" in pt.codes:
                cats.append("Middle East/North Africa")
            if "R" in pt.codes:
                cats.append("Multiracial")
            pt.qtype = ""
            if "U" in pt.codes:
                pt.qtype = "U"
            if "F" in pt.codes:
                pt.qtype = "F"
            if "D" in pt.codes:
                pt.qtype = "D"
            pt.groups = ",".join(cats)
            pt.put()  # individual points are not cached
        self.response.out.write("BatchProcessPoints completed.")


app = webapp2.WSGIApplication([('.*/recentpoints', RecentPoints),
                               ('.*/dbqpts', FetchPublicPoints),
                               ('.*/updpt', UpdatePoint),
                               ('.*/ptdat', FetchPoint),
                               ('.*/ptpic', GetPointPic),
                               ('.*/nukepic', NukePointPic),
                               ('.*/batchpoints', BatchProcessPoints)],
                              debug=True)
