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
import os
import service

# Container for login and whatever other info needs to be tracked per user.
# Login consists of retrieving an access token which is used for all
# subsequent API calls. Supports email/password login.  May be expanded to
# allow for 3rd party authentication processing if needed.
# Administrator isa Contributor isa User
#
# A timeline progress instance:
#      tlid: id of top-level timeline (aggregated timelines not separated)
#      st: ISO when the timeline was started (ISO, not wallclock)
#      svs*: CSV of svid;isoShown;isoClosed;dispcount
#      pts: CSV of ptid;isoShown;isoClosed;dispcount;tagcodes
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
    actsends = db.TextProperty(indexed=False)  # isodate;emaddr,d2;e2...
    actcode = db.StringProperty(indexed=False) # account activation code
    # optional public descriptive information
    name = db.StringProperty(indexed=False)
    title = db.StringProperty(indexed=False)
    web = db.StringProperty(indexed=False)
    # app working values
    lang = db.StringProperty()      # preferred lang code for data points
    settings = db.TextProperty()    # JSON object (age, parent's age etc)
    remtls = db.TextProperty()      # JSON [] remembered timeline ids/names
    completed = db.TextProperty()   # JSON [] tlid, name, first, latest
    started = db.TextProperty()     # JSON [] timeline progress instances
    built = db.TextProperty()       # JSON [] created timeline ids/names
    # write privileges
    orgid = db.IntegerProperty()    # Organization id (if any).
    lev = db.IntegerProperty()      # 0:User, 1:Contributor, 2:Administrator
    # activity sorting
    created = db.StringProperty()   # ISO datetime
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
    # logging.info("read_params: " + str(params));
    # logging.info("  request GET: " + str(handler.request.GET.items()))
    # logging.info("  request POST: " + str(handler.request.GET.items()))
    for param in params:
        val = handler.request.get(param)
        # logging.info("read_params " + param + ": " + str(val))
        if val != 0:
            val = val or ""
        if param == "email" or param == "updemail":
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
    # Write to db first to guarantee there is a key for the object
    dbobj.put()
    # If no ckey was provided, use the string version of the unique id
    if not ckey:
        ckey = str(dbobj.key().id())
    # logging.info("cached_put: " + str(dbobj.kind()) + " " + ckey)
    if not memcache.set(ckey, pickle.dumps(dbobj)):
        logging.warn("memcache set fail " + str(dbobj.kind()) + " " + ckey)
    # logging.info("cached_put: " + str(memcache.get_stats()))


def cached_get(ckey, qps):
    instance = memcache.get(ckey)
    if instance:
        instance = pickle.loads(instance)
        # logging.info("cached_get found cached instance: " + str(instance))
        return instance
    if "byid" in qps:
        instance = qps["dboc"].get_by_id(int(qps["byid"]))
        if instance:
            cached_put(ckey, instance)
            return instance
        return None
    vq = VizQuery(qps["dboc"], qps["where"], qps["wags"])
    instances = vq.fetch(1, read_policy=db.EVENTUAL_CONSISTENCY, deadline=20)
    if len(instances) > 0:
        instance = instances[0]
        cached_put(ckey, instance)
        return instance
    return None


def find_user_by_email(email):
    qp = {"dboc": AppUser, "where": "WHERE email=:1 LIMIT 1", "wags": email}
    return cached_get(email, qp)


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


def dectoken(key, token):
    token = token.replace("-", "+")
    token = token.replace("_", "/")
    token = token.replace(".", "=")
    token = base64.b64decode(token)
    token = AES.new(key, AES.MODE_CBC).decrypt(token)
    return token


def match_token_to_acc(token, acc):
    key = pwd2key(acc.password)
    decoded = dectoken(key, token)
    if not decoded:
        return None
    emidx = -1
    try:
        emidx = decoded.index(asciienc(acc.email))
    except:
        emidx = -1
    if emidx <= 2:
        return None
    # Not enforcing token expiration. Check the time here if that's needed
    return acc


def dt2ISO(dt):
    iso = str(dt.year) + "-" + str(dt.month).rjust(2, '0') + "-"
    iso += str(dt.day).rjust(2, '0') + "T" + str(dt.hour).rjust(2, '0')
    iso += ":" + str(dt.minute).rjust(2, '0') + ":"
    iso += str(dt.second).rjust(2, '0') + "Z"
    return iso


def nowISO():
    return dt2ISO(datetime.datetime.utcnow())


def iso2DT(isostr):
    isostr = re.sub(r'\.\d+Z', "Z", isostr)  # remove any included millis
    dt = datetime.datetime.utcnow()
    dt = dt.strptime(isostr, "%Y-%m-%dT%H:%M:%SZ")
    return dt


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
            now = nowISO()
            acc = AppUser(email=params["email"], password=params["password"],
                          status="Pending", actsends="", actcode="", name="",
                          title="", web="", lang="en-US", settings="",
                          remtls="", completed="", started="", built="", 
                          orgid=0, lev=0, created=now, accessed=now + ";1")
        else:
            return srverr(handler, 404, "Account not found.")
    else: # have acc
        if not params["password"] and not params["authtok"]:
            return srverr(handler, 403, "password or authtok required.")
        # if the token is valid, use it.  Might be updating the password.
        tok = match_token_to_acc(params["authtok"], acc)
        # if the password is valid, use it.  Token might be outdated.
        pok = False
        if params["password"] and params["password"] == acc.password:
            pok = True
        # if neither the token nor the password is correct, then fail
        if not (tok or pok):
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
    # Include instance id as a field for reference in JavaScript
    instid = "1234567890"
    if dbo.is_saved():
        instid = str(dbo.key().id())
    jsontxt = "{\"instid\":\"" + instid + "\", " + jsontxt[1:]
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


def mailgun_send(handler, eaddr, subj, body):
    if ((not os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine/'))
        or (handler and re.search("\:[0-9][0-9]80", handler.request.url))):
        logging.info("Mail not sent to " + eaddr + " from local dev" +
                     "\n\n" + body)
        return
    mg = service.get_service_info("mailgun")
    authkey = base64.b64encode("api:" + mg.ckey)
    # urlencode requires ascii (unicode crashes it). encode params vals utf-8
    params = urllib.urlencode({
            'from': 'PastKey Support <support@pastkey.org>',
            'to': eaddr.encode('utf-8'),
            'subject': subj.encode('utf-8'),
            'text': body.encode('utf-8')})
    headers = {'Authorization': 'Basic {0}'.format(authkey),
               'Content-Type': 'application/x-www-form-urlencoded'}
    conn = httplib.HTTPSConnection("api.mailgun.net", 443)
    conn.request('POST', '/v3/mg.pastkey.org/messages', params, headers)
    response = conn.getresponse()
    logging.info("mgsi " + eaddr + " " + subj + " " + str(response.status) + 
                 " " + str(response.reason))
    data = response.read()
    logging.info("mgsi " + eaddr + " data: " + str(data))
    conn.close()


def update_account(handler, acc):
    if len(acc.password) < 6:
        return srverr(handler, 403, "Password should be at least 6 characters")
    # verify token creation works, otherwise this can crash on return
    cached_put(acc.email, acc)
    return_json(handler, [acc, {"token": acctoken(acc.email, acc.password)}])


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
        params = read_params(self, ["updemail", "updpassword", "name", "title",
                                    "web", "lang", "settings", "remtls", 
                                    "completed", "started", "built"])
        if params["updemail"] and params["updemail"] != acc.email:
            memcache.delete(acc.email)
        if params["updpassword"] == "none":
            params["updpassword"] = acc.password
        for fieldname in params:
            attr = fieldname
            val = params[fieldname]
            if attr.startswith("upd"):
                attr = attr[3:]
            if val: 
                if val.lower() == "none":
                    val = ""
                setattr(acc, attr, val)
        update_account(self, acc)
        

class AccessAccount(webapp2.RequestHandler):
    def get(self):
        if not verify_secure_comms(self):
            return
        acc = get_authenticated_account(self, False)
        if not acc:
            return
        acc.accessed = nowISO()
        update_account(self, acc)


class UpdateMyTimelines(webapp2.RequestHandler):
    def post(self):
        # update account with tls param json
        return srverr(self, 500, "Not implemented yet")


class MailCredentials(webapp2.RequestHandler):
    def post(self):
        eaddr = self.request.get('email')
        if eaddr:
            eaddr = eaddr.lower()
            eaddr = re.sub('%40', '@', eaddr)
            content = "You requested your password be mailed to you..."
            content += "\n\nThe support system has looked up " + eaddr + " "
            vq = VizQuery(AppUser, "WHERE email=:1 LIMIT 9", eaddr)
            accounts = vq.fetch(1, read_policy=db.EVENTUAL_CONSISTENCY, 
                                deadline=10)
            if len(accounts) > 0:
                content += "and your password is: " + accounts[0].password
            else:
                content += "but found no matching accounts." +\
                    "\nEither you have not signed up yet, or you used" +\
                    " a different email address."
            content += "\n\nhttps://pastkey.org\n\n"
            mailgun_send(self, eaddr, "PastKey login", content)
        return_json(self, "[]")


class PublicUserInfo(webapp2.RequestHandler):
    def get(self):
        eaddr = self.request.get('email')
        if not eaddr:
            return srverr(self, 400, "email address not specified")
        eaddr = eaddr.lower()
        eaddr = re.sub('%40', '@', eaddr)
        account = find_user_by_email(eaddr)
        if not account:
            return srverr(self, 404, "email address " + eaddr + " not found.")
        pub = {"instid": str(account.key().id()),
               "email": account.email,
               "status": account.status,
               "name": account.name,
               "title": account.title,
               "web": account.web,
               "lang": account.lang,
               "completed": account.completed,
               "started": account.started,
               "created": account.created,
               "accessed": account.accessed}
        return_json(self, [pub])


app = webapp2.WSGIApplication([('.*/updacc', UpdateAccount),
                               ('.*/acctok', AccessAccount),
                               ('.*/mailcred', MailCredentials),
                               ('.*/updatetls', UpdateMyTimelines),
                               ('.*/pubuser', PublicUserInfo)],
                              debug=True)

