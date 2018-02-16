import webapp2
import datetime
from google.appengine.ext import db
from google.appengine.api.datastore_types import Blob
from google.appengine.api import memcache
from google.appengine.api import mail
import logging
from Crypto.Cipher import AES
import base64
import httplib
import urllib
import time
import json
import re
import pickle
import string

# Container for login and whatever other info needs to be tracked per user.
# Login consists of retrieving an access token which is used for all
# subsequent API calls. Supports email/password login.  May be expanded to
# allow for 3rd party authentication processing if needed.
# Administrator isa Contributor isa User
#
# A timeline progress instance:
#      tlid: id of timeline
#      st: ISO when the timeline was started (ISO, not wallclock)
#      sv*: zero or more sv code fields, each with ISOStart;durationSeconds
#      pts: CSV of ptid;durationSeconds;tagcodes
#         tagcodes: 'r' (remembered) point noted to revisit later
#                   'k' (known) knew this before
#                   'u' (unknown) did not know this before
#                   '1' (1st try) guessed date correctly on first click
#                   '2' (2nd try) guessed date correctly on second click
#                   '3' (3rd try) guessed date correctly on third click
#                   '4' (4th try) guessed date correctly on fourth click
class AppUser(db.Model):
    """ User authorization account with optional public fields """
    # login fields
    email = db.EmailProperty(required=True)
    password = db.StringProperty(required=True)
    status = db.StringProperty()        # Pending|Active|Inactive|Unreachable
    accessed = db.StringProperty()      # isodate
    actsends = db.TextProperty(indexed=False)  # isodate;emaddr,d2;e2...
    actcode = db.StringProperty(indexed=False) # account activation code
    # optional public descriptive information
    name = db.StringProperty(indexed=False)
    url = db.StringProperty(indexed=False)
    shoutout = db.TextProperty()
    # app working values
    lang = db.StringProperty()      # preferred lang code for data points
    settings = db.TextProperty()    # JSON object (age, parent's age etc)
    remtls = db.TextProperty()      # CSV of remembered timeline ids
    rempts = db.TextProperty()      # CSV of remembered point ids
    completed = db.TextProperty()   # CSV of tlid;ISOFirst;ISOLatest;count
    started = db.TextProperty()     # JSON array of timeline progress instances
    built = db.TextProperty()       # CSV of timeline ids created by this user
    # write privileges
    org = db.IntegerProperty()      # Organization id
    lev = db.IntegerProperty()      # 0:User, 1:Contributor, 2:Administrator
    # activity sorting
    created = db.StringProperty()   # ISO datetime;creator
    accessed = db.StringProperty()  # ISO datetime;count
    

# You can't return a value from a webapp2.RequestHandler, so this method
# does not return a value.  Common error codes:
# 400 Bad Request, 401 Not Authorized, 403 Forbidden, 404 Not Found, 
# 405 Method Not Allowed, 406 Not Acceptable, 409 Conflict
def srverr(handler, code, errtxt):
    handler.error(code)
    handler.response.out.write(errtxt)


def verify_secure_comms(handler):
    url = handler.request.url
    if url.startswith('https') or re.search("\:[0-9][0-9]80", url):
        return True
    handler.error(405)
    handler.response.out.write("Request must be over https")
    return False


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


class VizQuery(object):
    dboc = None
    where = ""
    wags = None
    gql = None
    def __init__(self, dboc, where, *args):
        self.dboc = dboc
        self.where = where
        self.wags = args
        self.gql = dboc.gql(where, *args)
    def __str__(self):
        return str(self.dboc) + " " + self.where + " " + str(self.wags)
    def cursor(self):
        return self.gql.cursor()
    def with_cursor(self, **kwargs):
        return self.gql.with_cursor(**kwargs)
    def run(self, **kwargs):
        logging.info("DBVQR " + str(self) + " " + str(kwargs))
        return self.gql.run(**kwargs)
    def fetch(self, *args, **kwargs):
        logging.info("DBVQF " + str(self) + " " + str(args) + " " + str(kwargs))
        return self.gql.fetch(*args, **kwargs)


# If param not found in input then it is set to "". Simpler value testing.
def read_params(handler, params):
    pd = {}
    logging.info("read_params: " + str(params));
    logging.info("  request: " + str(handler.request.GET.items()))
    for param in params:
        val = handler.request.get(param) or ""
        if param == "email":
            # normalize to lower case and undo extra encoding if needed
            val = val.lower()
            re.sub('%40', '@', val)
        pd[param] = val
    logging.info("read_params: " + str(pd))
    return pd


def valid_email_address(emaddr):
    # something @ something . something
    if not re.match(r"[^@]+@[^@]+\.[^@]+", emaddr):
        return False
    return True


def cached_put(ckey, dbobj):
    dbobj.put()
    memcache.set(ckey, pickle.dumps(dbobj))


def cached_get(ckey, qps):
    instance = memcache.get(ckey)
    if instance:
        instance = pickle.loads(instance)
        # logging.info("cached_get found cached instance: " + str(instance))
        return instance
    vq = VizQuery(qps["dboc"], qps["where"], qps["wags"])
    instances = vq.fetch(1, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
    if len(instances) > 0:
        instance = intances[0]
        cached_put(ckey, instance)
        return instance
    return None


def find_user_by_email(email):
    qp = {"dboc": AppUser, "where": "WHERE email=:1 LIMIT 1", "wags": email}
    return cached_get(email, qp)


# The email parameter is required. Then either password or authok.
def get_authenticated_account(handler, create):
    params = read_params(handler, ["email", "authtok", "password"])
    if not params["email"] or not(params["authtok"] or params["password"]):
        return srverr(handler, 401, "email and password or authtok required.")
    if not valid_email_address(params["email"]):
        return srverr(handler, 401, "email not recognized as valid.")
    acc = find_user_by_email(params["email"])
    if not acc:
        if create and params["password"]:
            acc = AppUser(email=params["email"], password=params["password"])
        else:
            return srverr(handler, 404, "Account not found.")
    else: # have acc
        if(params["password"] != acc.password and 
           params["authtok"] != acctoken(acc)):
            return srverr(handler, 403, "Authentication failed.")
    return acc


def dbo2json(dbo):
    write_only_fields = ["email", "password"]
    props = db.to_dict(dbo)
    for prop, val in props.iteritems():
        if prop in write_only_fields:
            continue
        # Associated images are fetched separately, not via JSON
        if(isinstance(val, Blob)):
            props[prop] = str(dbo.key().id())
        # JavaScript max integer value is smaller than database integer
        # value so return it as a string.  By convention all database fields
        # referencing other database instance ids end with "id".
        if(isinstance(val, (int, long)) and (prop.endswith("id"))):
            props[prop] = str(props[prop])
    jsontxt = json.dumps(props, True)
    # Include entity id as a field for reference in JavaScript
    jsontxt = "{\"_id\":\"" + str(dbo.key().id()) + "\", " + jsontxt[1:]
    return jsontxt


def return_json(handler, data):
    jsontxt = ""
    for datum in data:
        if jsontxt:
            jsontxt += ", "
        if isinstance(datum, db.Model):
            jsontxt += dbo2json(datum)
        else:
            jsontxt += json.dumps(datum, True)
    jsontxt = "[" + jsontxt + "]"
    response = handler.response
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Content-Type'] = 'application/json'
    response.out.write(jsontxt)


def asciienc(val):
    val = unicode(val)
    return val.encode('utf8')


def pwd2key(password):
    pwd = unicode(password)
    pwd = asciienc(pwd)
    # passwords have a min length of 6 so get at least 32 by repeating it
    key = str(pwd) * 6
    key = key[:32]
    return key


def acctoken(email, password):
    key = pwd2key(password)
    token = ":" + str(int(round(time.time()))) + ":" + asciienc(email)
    token = token.rjust(48, 'X')
    token = token[:48]
    token = AES.new(key, AES.MODE_CBC).encrypt(token)
    token = base64.b64encode(token)
    # make base64 encoding url safe
    token = token.replace("+", "-")
    token = token.replace("/", "_")
    token = token.replace("=", ".")
    return token


class UpdateAccount(webapp2.RequestHandler):
    def post(self):
        if not verify_secure_comms(self):
            return
        acc = get_authenticated_account(self, True)
        if not acc:
            return
        params = read_params(self, ["actcode"])
        if "actcode" in params:
            if params["actcode"] == acc.actcode:
                acc.status = "Active"
        params = read_params(self, ["updemail", "updpassword", "name", "url",
                                    "shoutout", "lang", "settings", "remtls",
                                    "rempts", "completed", "started", "built"])
        for fieldname in params:
            if fieldname.startswith("upd"):
                fieldname = fieldname[3:]
            setattr(acc, fieldname, params[fieldname])
        cached_put(acc.email, acc)
        return_json(self, [acc, {"token": acctoken(acc.email, acc.password)}])
        

class AccessAccount(webapp2.RequestHandler):
    def get(self):
        if not verify_secure_comms(self):
            return
        acc = get_authenticated_account(self, False)
        if not acc:
            return
        return_json(self, [acc, {"token": acctoken(acc.email, acc.password)}])


class UpdateMyTimelines(webapp2.RequestHandler):
    def post(self):
        # update account with tls param json
        return srverr(self, 500, "Not implemented yet")


app = webapp2.WSGIApplication([('.*/updacc', UpdateAccount),
                               ('.*/acctok', AccessAccount),
                               ('.*/updatetls', UpdateMyTimelines)],
                              debug=True)



