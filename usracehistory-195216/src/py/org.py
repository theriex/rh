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
    groups = db.TextProperty()     # e.g. African American, Asian American
    regions = db.TextProperty()    # e.g. National, Boston, Puerto Rico, Hawai'i
    categories = db.TextProperty() # e.g. Statistics, Awards, Stereotypes
    tags = db.TextProperty()       # other org grouping keywords
    # Prebuilt json for most recently edited 512k worth of points maintained
    # by the organization. If any older points get rolled off, they will
    # still be available from any timelines that include them.  The
    # expectation is most timelines will be built from other timelines, so
    # this prebuilt field is primarily for ease of access and increased
    # visibility of newly added/modified points.
    recpre = db.TextProperty()


def update_organization(org, params):
    for field in params:
        attr = field
        val = params[field]
        if attr.startswith("upd"):
            attr = attr[3:]
        if val:
            if val.lower() == "noval":
                val = ""
            setattr(org, attr, val)
    appuser.cached_put(str(org.key().id()), org)
    return org


def public_member_record(user):
    # Return only the public fields needed for managing membership. No email.
    return {"instid": str(user.key().id()),
            "name": user.name,
            "title": user.title or "",
            "web": user.web or "",
            "orgid": user.orgid or 0,
            "lev": user.lev or 0}


class GetOrgById(webapp2.RequestHandler):
    def get(self):
        if not appuser.verify_secure_comms(self):
            return
        acc = appuser.authenticated(self.request)
        if not acc:
            return srverr(self, 401, "Authentication failed")
        params = appuser.read_params(self, ["orgid"])
        orgid = params["orgid"]  # str
        org = appuser.cached_get(orgid, {"dboc": Organization, "byid": orgid})
        appuser.return_json(self, [org])


class UpdateOrg(webapp2.RequestHandler):
    def post(self):
        if not appuser.verify_secure_comms(self):
            return
        acc = appuser.authenticated(self.request)
        if not acc:
            return srverr(self, 401, "Authentication failed")
        fields = ["orgid", "name", "code", "contacturl", "projecturl", 
                  "groups", "regions", "categories", "tags"]
        params = appuser.read_params(self, fields)
        orgid = int(params["orgid"])
        org = Organization.get_by_id(orgid)
        if acc.orgid != orgid or acc.lev != 2:
            return appuser.srverr(self, 403, "Not Organization Administrator")
        org = update_organization(org, params)
        if org:
            appuser.return_json(self, [org])


class FetchOrgMembers(webapp2.RequestHandler):
    def get(self):
        if not appuser.verify_secure_comms(self):
            return
        acc = appuser.authenticated(self.request)
        if not acc:
            return srverr(self, 401, "Authentication failed")
        params = appuser.read_params(self, ["orgid"])
        if not params["orgid"] or int(params["orgid"]) != acc.orgid:
            return appuser.srverr(self, 403, "Not your Organization")
        vq = appuser.VizQuery(appuser.AppUser, "WHERE orgid=:1", 
                              int(params["orgid"]))
        res = vq.fetch(500, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
        oms = []
        for user in res:  # only public info and org info, no email etc..
            oms.append(public_member_record(user))
        logging.info("Org " + params["orgid"] + " has " + str(len(oms)) + 
                     " members");
        appuser.return_json(self, oms)


class UpdateOrgMembership(webapp2.RequestHandler):
    def post(self):
        if not appuser.verify_secure_comms(self):
            return
        acc = appuser.authenticated(self.request)
        if not acc:
            return srverr(self, 401, "Authentication failed")
        params = appuser.read_params(self, ["orgid", "userid", "lev"])
        if not params["orgid"] or int(params["orgid"]) != acc.orgid:
            return appuser.srverr(self, 403, "Not your Organization")
        orgid = int(params["orgid"])
        userid = int(params["userid"])
        lev = int(params["lev"])
        if acc.key().id() != userid and acc.lev != 2:
            return appuser.srverr(self, 403, "Not an Administrator")
        if acc.key().id() == userid and lev > acc.lev:
            return appuser.srverr(self, 403, "Can't promote yourself")
        user = appuser.AppUser.get_by_id(userid)
        if lev < 0:
            user.orgid = 0
            user.lev = 0
        else:
            user.lev = lev
        appuser.cached_put(user.email, user)
        appuser.return_json(self, [])


class AddNewMember(webapp2.RequestHandler):
    def post(self):
        if not appuser.verify_secure_comms(self):
            return
        acc = appuser.authenticated(self.request)
        if not acc:
            return srverr(self, 401, "Authentication failed")
        if not acc.orgid or acc.lev != 2:
            return appuser.srverr(self, 403, "Not an Administrator")
        params = appuser.read_params(self, ["membermail"])
        mem = appuser.account_from_email(params["membermail"])
        if not mem:
            return appuser.srverr(self, 404, "User not found")
        if mem.orgid:
            if mem.orgid == acc.orgid:
                return appuser.srverr(self, 400, "Already a member")
            else:
                return appuser.srverr(self, 403, "Member of other Org")
        mem.orgid = acc.orgid
        mem.lev = 0
        appuser.cached_put(mem.email, mem)
        appuser.return_json(self, [public_member_record(mem)])


# This method exists just because it can be difficult to get a new
# Organization instance created, particularly during local development when
# there are no Organization instances in the db yet.  This makes an org
# instance named "Placeholder" which can be modified manually to onboard a
# new organization.
class VerifyPlaceholderOrg(webapp2.RequestHandler):
    # To call, get params from web console cookie load. Paste into browser
    def get(self):
        if not appuser.verify_secure_comms(self):
            return
        acc = appuser.authenticated(self.request)
        if not acc:
            return srverr(self, 401, "Authentication failed")
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
                               ('.*/orgmembers', FetchOrgMembers),
                               ('.*/updorg', UpdateOrg),
                               ('.*/updmembership', UpdateOrgMembership),
                               ('.*/addmember', AddNewMember),
                               ('.*/placeorg', VerifyPlaceholderOrg)], 
                              debug=True)

