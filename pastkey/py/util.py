""" General use request processing functions and utilities. """
#pylint: disable=missing-function-docstring
#pylint: disable=invalid-name
#pylint: disable=logging-not-lazy

import logging
import hmac
import json
import re
import os
import flask
import py.dbacc as dbacc


def srverr(msg, code=400):
    # 400 Bad Request
    # 405 Method Not Allowed
    resp = flask.make_response(msg)
    resp.mimetype = "text/plain"
    resp.status_code = int(code)
    return resp


def serve_value_error(ve, quiet=False):
    if not quiet:
        logging.exception("serve_value_error")
    return srverr(str(ve))


def respond(contentstr, mimetype="text/html"):
    # flask.Response defaults to HTML mimetype, so just returning a string
    # from a flask endpoint will probably work.  Best to route everything
    # through here and set it explicitely just in case
    resp = flask.make_response(contentstr)
    resp.mimetype = mimetype
    return resp


def respJSON(jsontxt):
    if type(jsontxt) is dict:
        jsontxt = "[" + json.dumps(jsontxt) + "]"
    elif type(jsontxt) is list:
        jsontxt = json.dumps(jsontxt)
    return respond(jsontxt, mimetype="application/json")


def get_connection_service(svcname):
    cs = dbacc.cfbk("ConnectionService", "name", svcname)
    if not cs:
        # create needed placeholder for administrators to update
        cs = dbacc.write_entity({"dsType": "ConnectionService",
                                 "name": svcname})
    return cs


def token_for_user(appuser):
    ts = get_connection_service("TokenSvc")
    hasher = hmac.new(ts["secret"].encode("utf8"), digestmod="sha512")
    hasher.update((appuser["email"] + "_" + appuser["phash"]).encode("utf8"))
    token = hasher.hexdigest()
    token = token.replace("+", "-")
    token = token.replace("/", "_")
    token = token.replace("=", ".")
    return token


def safe_JSON(obj, audience="public"):  # "private" includes personal info
    filtobj = dbacc.visible_fields(obj, audience)
    if obj["dsType"] == "AppUser" and audience == "private":
        filtobj["token"] = token_for_user(obj)
    return json.dumps(filtobj)


def is_development_server():
    info = {"isdev":False, "why":"No development conditions matched"}
    if flask.has_request_context():
        if re.search(r"\:\d{4}", flask.request.url):
            info["isdev"] = True
            info["why"] = "flask.request.url has a 4 digit port number)"
    elif os.environ["HOME"] != "/home/theriex":
        info["isdev"] = True
        info["why"] = ("\"HOME\" env var \"" + os.environ["HOME"] +
                       "\" != \"/home/theriex\")")  # deployment home dir
    if info["isdev"]:
        return info
    return False


def secure(func):
    url = flask.request.url
    logging.debug("secure url: " + url)
    if url.startswith('https') or is_development_server():
        return func()
    return srverr("Request must be over https", 405)
