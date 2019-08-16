import webapp2
import datetime
from google.appengine.ext import db
from google.appengine.api.datastore_types import Blob
from google.appengine.api import memcache
from google.appengine.api import mail
import logging
from Crypto.Hash import HMAC, SHA512
import base64
import httplib
import urllib
import time
import json
import re
import pickle
import string
import random
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
    phash = db.StringProperty(required=True)
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


def dump_params(handler):
    for param in handler.request.params:
        logging.info(str(param))


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
        logging.info("invalid email address: " + emaddr)
        return False
    return True


logging_cache_actions = False


def cached_put(ckey, dbobj):
    # Write to db first to guarantee there is a key for the object
    dbobj.put()
    # If no ckey was provided, use the string version of the unique id
    if not ckey:
        ckey = str(dbobj.key().id())
    if logging_cache_actions:
        logging.info("cached_put: " + str(dbobj.kind()) + " " + ckey)
    if not memcache.set(ckey, pickle.dumps(dbobj)):
        logging.warn("memcache set fail " + str(dbobj.kind()) + " " + ckey)
    # logging.info("cached_put: " + str(memcache.get_stats()))


def cached_get(ckey, qps):
    instance = memcache.get(ckey)
    if instance:
        instance = pickle.loads(instance)
        if logging_cache_actions:
            logging.info("cached_get " + ckey + " found cached instance")
        return instance
    if "byid" in qps:
        if logging_cache_actions:
            logging.info("cached_get " + qps["dboc"].kind() + " " + qps["byid"])
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


# Favoring setting the ckey to "" rather than calling memcache.delete since
# it is equivalent in logic and easier to debug.
def cache_bust(ckey):
    if logging_cache_actions:
        logging.info("cache_bust " + ckey)
    memcache.set(ckey, "")


# Apparently on some devices/browsers it is possible for the email
# address used for login to be sent encoded.  Decode and lowercase.
def normalize_email(emaddr):
    emaddr = emaddr.lower()
    emaddr = re.sub('%40', '@', emaddr)
    return emaddr


def account_from_email(emaddr):
    emaddr = emaddr or ""
    emaddr = normalize_email(emaddr)
    # logging.info("account_from_email looking up " + emaddr)
    qp = {"dboc": AppUser, "where": "WHERE email=:1 LIMIT 1", "wags": emaddr}
    return cached_get(emaddr, qp)


def make_password_hash(emaddr, pwd, cretime):
    hmac = HMAC.new(pwd.encode("utf8"), digestmod=SHA512)
    hmac.update((emaddr + "_" + cretime).encode("utf8"))
    return hmac.hexdigest()
    

def token_for_user(appuser):
    ts = service.get_service_info("TokenSvc")
    hmac = HMAC.new(ts.csec.encode("utf8"), digestmod=SHA512)
    hmac.update((appuser.email + "_" + appuser.phash).encode("utf8"))
    token = hmac.hexdigest()
    token = token.replace("+", "-")
    token = token.replace("/", "_")
    token = token.replace("=", ".")
    return token


def authenticated(request):
    """ Return an account for the given auth type if the token is valid """
    emaddr = normalize_email(request.get('email') or "")
    reqtok = request.get('authtok')
    appuser = account_from_email(emaddr)
    if not appuser:
        logging.info("authenticated appuser not found emaddr: " + emaddr)
        return None
    srvtok = token_for_user(appuser)
    if reqtok != srvtok:  # possible the TokenSvc ckey changed, try password
        pwd = request.get('password')
        if pwd:
            phash = make_password_hash(emaddr, pwd, appuser.created)
            if phash == appuser.phash:  # authenticated
                reqtok = token_for_user(appuser)
    if reqtok != srvtok:
        logging.info("authenticated token did not match\n" +
                     "  reqtok: " + reqtok + "\n" +
                     "  srvtok: " + srvtok)
        return None
    logging.info("appuser.py authenticated " + emaddr)
    return appuser


def valid_new_email_address(handler, emaddr):
    if not (valid_email_address(emaddr)):
        return srverr(handler, 412, "Invalid email address")
    existing = account_from_email(emaddr)
    if existing:
        return srverr(handler, 422, "Email address used already")
    return emaddr


def get_request_value(request, params):
    val = ""
    for param in params:
        val = val or request.get(param)
    if val == "noval":
        val = ""
    return val


# Password is required for updating email since we need to rebuild phash
# before rebuilding the access token.
def update_email_and_password(handler, acc):
    # do not read "email" as a parameter here, it's part of the authentication
    emaddr = get_request_value(handler.request, ["emailin", "updemail"])
    emaddr = normalize_email(emaddr)
    pwd = get_request_value(handler.request, ["password", "updpassword"])
    logging.info("update_email_and_password " + emaddr + " " + pwd)
    if not emaddr and not pwd and acc.email != "placeholder":
        return "nochange"  # not updating credentials so done
    # updating email+password or password
    if emaddr and emaddr != acc.email and not pwd:
        return srverr(handler, 400, "Password required to change email")
    if len(pwd) < 6:
        return srverr(handler, 412, "Password must be at least 6 characters")
    change = "password"
    if emaddr != acc.email:
        if not valid_new_email_address(handler, emaddr):
            return False  # error already reported
        cache_bust(acc.email)  # clear out the current cached version
        acc.email = emaddr
        change = "email"
    acc.phash = make_password_hash(acc.email, pwd, acc.created)
    if change == "email":
        cache_bust(acc.email)  # shouldn't be necessary, but just in case
        acc.status = "Pending"
        acc.actsends = ""
        chars = string.ascii_letters + string.digits
        acc.actcode = "".join(random.choice(chars) for _ in range(30))
    return change


def update_account_fields(handler, acc):
    params = read_params(handler, ["name", "title", "web", "lang", "settings",
                                   "remtls", "completed", "started", "built"])
    for fieldname in params:
        attr = fieldname
        val = params[fieldname]
        if val:
            if val.lower() == "noval":
                val = ""
            setattr(acc, attr, val)
    return True


def update_access_time(acc):
    count = "1"
    stamp = acc.accessed or ""
    stamp = stamp.split(";")
    if len(stamp) > 1:
        count = stamp[1]
    count = int(count) + 1
    acc.accessed = nowISO() + ";" + str(count)


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


def dbo2json(dbo, skips=[]):
    # email is not write only because it needs to be retrieved by the user
    # for their completion certificate links.  For members, the admin
    # already has the email address when they added them so that's also ok.
    write_only_fields = ["password"]
    props = db.to_dict(dbo)
    for prop, val in props.iteritems():
        if prop in write_only_fields or prop in skips:
            props[prop] = ""  # leave key in dict so it is clear it was nuked
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


def is_local_devenv(handler):
    if ((not os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine/'))
        or (handler and re.search("\:[0-9][0-9]80", handler.request.url))):
        return True
    return False


def mailgun_send(handler, eaddr, subj, body):
    if is_local_devenv(handler):
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


class CreateAccount(webapp2.RequestHandler):
    def post(self):
        if not verify_secure_comms(self):
            return  # error already reported
        emaddr = get_request_value(self.request, ["email", "updemail"])
        acc = account_from_email(emaddr)
        if acc:
            return srverr(self, 400, "Account exists already")
        acc = AppUser(email="placeholder", phash="whatever")  # corrected below
        cretime = nowISO()
        acc.created = cretime
        acc.accessed = cretime + ";1"
        authupd = update_email_and_password(self, acc)
        if not authupd:
            return  # error already reported
        if not update_account_fields(self, acc):
            return  # error already reported
        cached_put(acc.email, acc)
        return_json(self, [acc, {"token":token_for_user(acc)}])


class UpdateAccount(webapp2.RequestHandler):
    def post(self):
        if not verify_secure_comms(self):
            return  # error already reported
        acc = authenticated(self.request)
        if not acc:
            return srverr(self, 401, "Authentication failed")
        authupd = update_email_and_password(self, acc)
        if not authupd:
            return  # error already reported
        if not update_account_fields(self, acc):
            return  # error already reported
        # handle activation, if given
        params = read_params(self, ["actcode"])
        if "actcode" in params:
            if params["actcode"] == acc.actcode:
                acc.status = "Active"
        update_access_time(acc)
        cached_put(acc.email, acc)
        return_json(self, [acc, {"token":token_for_user(acc)}])
        

class AccessAccount(webapp2.RequestHandler):
    def get(self):
        if not verify_secure_comms(self):
            return
        acc = authenticated(self.request)
        if not acc:
            return srverr(self, 401, "Authentication failed")
        update_access_time(acc)
        cached_put(acc.email, acc)
        return_json(self, [acc, {"token":token_for_user(acc)}])


class UpdateMyTimelines(webapp2.RequestHandler):
    def post(self):
        # update account with tls param json
        return srverr(self, 500, "Not implemented yet")


class MailResetPasswordLink(webapp2.RequestHandler):
    def post(self):
        eaddr = normalize_email(self.request.get('email'))
        if eaddr:
            content = "You requested your PastKey password be reset...\n\n"
            vq = VizQuery(AppUser, "WHERE email=:1 LIMIT 9", eaddr)
            accounts = vq.fetch(1, read_policy=db.EVENTUAL_CONSISTENCY, 
                                deadline=10)
            if len(accounts) > 0:
                acc = accounts[0]
                content += "Use this link to sign in, then choose My Account" +\
                           " from the menu to change your Password:\n" +\
                           "https://pastkey.org?email=" + eaddr +\
                           "&authtok=" + token_for_user(acc) + "\n\n"
            else:
                content += "There was no account found for " + eaddr + ".\n" +\
                           "Either you have not signed up yet, or you used" +\
                           " a different email address.\n\n"
            content += "https://pastkey.org\n\n"
            mailgun_send(self, eaddr, "PastKey login", content)
        return_json(self, "[]")


class PublicUserInfo(webapp2.RequestHandler):
    def get(self):
        eaddr = normalize_email(self.request.get('email'))
        if not eaddr:
            return srverr(self, 400, "email address not specified")
        account = account_from_email(eaddr)
        if not account:
            return srverr(self, 404, "email address " + eaddr + " not found.")
        pub = {"instid": str(account.key().id()),
               "email": account.email,  # matches what they sent us, so ok
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


class ConvertAppUsers(webapp2.RequestHandler):
    def get(self):
        msgs = ""
        vq = VizQuery(AppUser, "")
        accounts = vq.run(read_policy=db.STRONG_CONSISTENCY, deadline=60)
        for acc in accounts:
            if not acc.phash:
                acc.phash = make_password_hash(acc.email, acc.password,
                                               acc.created)
                cached_put(acc.email, acc)
                msgs += acc.email + " set phash\n"
            else:
                msgs += acc.email + " already set\n"
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(msgs)


class TechSupportHelp(webapp2.RequestHandler):
    def get(self):
        emaddr = self.request.get("user") or ""
        suppurl = "No user found, emaddr: " + emaddr
        acc = None
        if emaddr:
            if "." in emaddr:  # @ may be escaped, look for domain dot
                acc = account_from_email(emaddr)
            else:  # try looking up by id
                acc = AppUser.get_by_id(int(emaddr))
        if acc:
            suppurl = "https://pastkey.org?email=" + acc.email + "&authtok="
            suppurl += token_for_user(acc)
        self.response.headers['Content-Type'] = 'text/plain'
        self.response.out.write(suppurl)


app = webapp2.WSGIApplication([('.*/newacct', CreateAccount),
                               ('.*/updacc', UpdateAccount),
                               ('.*/acctok', AccessAccount),
                               ('.*/convau', ConvertAppUsers),
                               ('.*/mailpwr', MailResetPasswordLink),
                               ('.*/supphelp', TechSupportHelp),
                               ('.*/updatetls', UpdateMyTimelines),
                               ('.*/pubuser', PublicUserInfo)],
                              debug=True)

