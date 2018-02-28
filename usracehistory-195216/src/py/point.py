import webapp2
import datetime
from google.appengine.ext import db
from google.appengine.api import images
import logging
import appuser

# Accepted date formats:
#  - point: Y[YYY][ BCE], YYYY-MM, YYYY-MM-DD
#  - range: YYYY's, YYYY's-YYYY's, YYYY+, YYYY-YYYY, YYYY-MM[-DD]-YYYY-MM[-DD]
# Point text may reference another point using html anchor syntax and the 
# point id. e.g. "<a href=\"#N35\">Pontiac</a> signs ..."
class Point(db.Model):
    """ A timeline data point """
    date = db.StringProperty(required=True)  # see comment
    text = db.TextProperty()       # max 1200 chars, prefer < 400
    codes = db.StringProperty()    # 1+ usrace codes (see point_codes)
    orgid = db.IntegerProperty()   # Organization id, 1 is public
    keywords = db.TextProperty()   # CSV of org defined keywords (reg/cat/key)
    refs = db.TextProperty()       # JSON array of reference source strings
    source = db.StringProperty()   # Initial creation load source
    srclang = db.StringProperty()  # en-US or en-US-x-grade only
    translations = db.TextProperty()  # JSON array {lang, text}
    pic = db.BlobProperty()        # optional freely shareable pic (file upload)
    endorsed = db.TextProperty()   # CSV of AppUser ids
    stats = db.TextProperty()      # optional JSON stats depending on codes
    created = db.StringProperty()  # ISO datetime;TLAcc id (owner)
    modified = db.StringProperty() # ISO datetime;TLAcc id


def point_codes():
    codes = { 
        # At least one usrace code must be assigned for every point.
        "usrace": [{"code": "N",
                    "name": "Native American",
                    "abbr": "Native" },
                   {"code": "B",
                    "name": "African American",
                    "abbr": "Black"},
                   {"code": "L",
                    "name": "Latino/as",
                    "abbr": "Latinx"},
                   {"code": "A",
                    "name": "Asian American",
                    "abbr": "AsAm"},
                   {"code": "M",
                    "name": "Middle East and North Africa",
                    "abbr": "MENA"},
                   {"code": "R",
                    "name": "Multiracial",
                    "abbr": "Multi"}],
        # Optional marker codes to trigger special presentation handling.
        "marker": [{"code": "U",            # Did you know?
                    "name": "Unusual",
                    "abbr": "Unusual"},
                   {"code": "F",            # Legacy
                    "name": "Firsts",
                    "abbr": "Firsts"},
                   {"code": "D",            # Click the correct date
                    "name": "Important Date",
                    "abbr": "Date"}]}
    return codes


def update_or_create_point(handler, acc, params):
    if not acc.lev:
        return appuser.srverr(handler, 403, "Not a contributor account")
    if acc.orgid != int(params["orgid"]) and acc.orgid != 1:
        return appuser.srverr(handler, 403, "Data does not match organization")
    vq = appuser.VizQuery(Point, "WHERE source=:1 LIMIT 1", params["source"])
    pts = vq.fetch(1, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
    tstamp = appuser.nowISO() + ";" + str(acc.key().id())
    if len(pts) > 0:
        pt = pts[0]
        if pt.orgid != acc.orgid:
            return appuser.srverr(handler, 403, "Point does not match org")
        pt.modified = tstamp
    else:
        pt = Point(date=params["date"],
                   text=params["text"],
                   codes=params["codes"],
                   orgid=int(params["orgid"]),
                   keywords=params["keywords"],
                   refs=params["refs"],
                   source=params["source"],
                   srclang=params["srclang"] or "en-US",
                   translations=params["translations"],
                   endorsed="",
                   stats="",
                   created=tstamp,
                   modified=tstamp)
    if params["pic"]:
        pt.pic = db.Blob(params["pic"])
        pt.pic = images.resize(pt.pic, 160, 160)
    pt.put()  # individual points are not cached


class RecentPoints(webapp2.RequestHandler):
    def get(self):
        acc = appuser.verifyToken(self)
        if not acc:
            return
        # Check for "recent_points" is mcache and that JSON if found
        # Query for all points modified > LASTBUILDMODIFIED
        # Cache the results and return.  Email notify admin if > 20k
        appuser.srverr(self, 500, "Not implemented yet")


class AllPoints(webapp2.RequestHandler):
    def get(self):
        acc = appuser.get_authenticated_account(self, False)
        if not acc:
            return
        if acc.orgid != 1 or acc.lev != 2:
            return appuser.srverr(self, 403, "Admin access only.")
        res = []
        pts = Point.all()
        for pt in pts:
            res.append(pt)
        appuser.return_json(self, res)


class UpdatePoint(webapp2.RequestHandler):
    def post(self):
        # ptupld could be sending password in params so refuse if not secured
        if not appuser.verify_secure_comms(self):
            return
        acc = appuser.get_authenticated_account(self, False)
        if not acc:
            return
        params = appuser.read_params(self, ["date", "text", "codes", "orgid",
                                            "keywords", "refs", "source", 
                                            "srclang", "translations", "pic"]);
        update_or_create_point(self, acc, params)


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


app = webapp2.WSGIApplication([('.*/recentpoints', RecentPoints),
                               ('.*/dbqpts', AllPoints),
                               ('.*/updpt', UpdatePoint),
                               ('.*/ptpic', GetPointPic)],
                              debug=True)
