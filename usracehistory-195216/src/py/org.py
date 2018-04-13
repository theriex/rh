import webapp2
import datetime
from google.appengine.ext import db
import logging
import appuser

# An independent working group maintaining data points and timelines for
# education and benefit to their community.
class Organization(db.Model):
    name = db.StringProperty(required=True)     # name of organization
    code = db.StringProperty()     # short name or initials
    contacturl = db.StringProperty()  # main site
    projecturl = db.StringProperty()  # optional page describing timelines work
    # search filtering keyword definitions
    regions = db.TextProperty()    # e.g. National, Boston, Puerto Rico, Hawai'i
    categories = db.TextProperty()  # e.g. Statistics, Awards, Stereotypes
    tags = db.TextProperty()       # other org grouping keywords
    # prebuilt json for all points maintained by the organization
    pts = db.TextProperty()


def update_organization(org, params):
    for field in params:
        attr = field
        val = params[field]
        if attr.startswith("upd"):
            attr = attr[3:]
        setattr(org, attr, val)
    appuser.cached_put(str(org.key().id), org)


class GetOrgById(webapp2.RequestHandler):
    def get(self):
        if not appuser.verify_secure_comms(self):
            return
        acc = appuser.get_authenticated_account(self, True)
        if not acc:
            return
        params = read_params(self, ["orgid"])
        orgid = params["orgid"]  # str
        org = appuser.cached_get(orgid, {"dboc": Organization, "byid": orgid})
        appuser.return_json(self, [org])


class UpdateOrg(webapp2.RequestHandler):
    def post(self):
        if not appuser.verify_secure_comms(self):
            return
        acc = appuser.get_authenticated_account(self, True)
        if not acc:
            return
        fields = ["orgid", "name", "code", "contacturl", "projecturl", 
                  "regions", "categories", "tags"]
        params = read_params(self, fields)
        orgid = int(params["orgid"])
        org = Organization.get_by_id(orgid)
        if acc.orgid != orgid or acc.lev != 2:
            return appuser.srverr("You must be an Organization Administrator")
        org = update_organization(org, params)
        if org:
            appuser.return_json(self, [org])


class VerifyPlaceholderOrg(webapp2.RequestHandler):
    # To call, get params from web console cookie load. Paste into browser
    def get(self):
        if not appuser.verify_secure_comms(self):
            return
        acc = appuser.get_authenticated_account(self, True)
        if not acc:
            return
        if acc.orgid != 1 or acc.lev != 2:
            return appuser.srverr(self, 403, "System admin access only.")
        pn = "Placeholder"
        vq = appuser.VizQuery(Organization, "WHERE name=:1 LIMIT 1", pn)
        orgs = vq.fetch(1, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
        if len(orgs) > 0:
            org = orgs[0]
        else:
            org = Organization(name=pn)
            org.put()
        appuser.return_json(self, [org])


app = webapp2.WSGIApplication([('.*/getorg', GetOrgById),
                               ('.*/updorg', UpdateOrg),
                               ('.*/placeorg', VerifyPlaceholderOrg)], 
                              debug=True)

