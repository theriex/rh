""" Timeline and related data access processing. """
#pylint: disable=line-too-long
#pylint: disable=invalid-name
#pylint: disable=missing-function-docstring

import logging
import base64
import io
import flask
from PIL import Image, ImageOps   # from Pillow
import py.dbacc as dbacc
import py.util as util

B64ENCTRANSPARENT4X4PNG = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x04\x00\x00\x00\x04\x08\x06\x00\x00\x00\xa9\xf1\x9e~\x00\x00\x00\x0cIDATx\x9cc`\xa0\x1c\x00\x00\x00D\x00\x01\xd7\xe3H\xfd\x00\x00\x00\x00IEND\xaeB`\x82'

def contained_timelines(tl):
    allts = [tl]
    if tl["ctype"].startswith("Timelines"):
        for cid in tl["cids"].split(","):
            allts.append(dbacc.cfbk("Timeline", "dsId", cid, required=True))
    return allts


def verify_point_update_authorized(pdat):
    appuser, _ = util.authenticate()
    lev = appuser.get("lev")
    if not lev or lev <= 0:
        raise ValueError("Not a Contributor or Administrator")
    orgid = appuser.get("orgid")
    if not orgid:
        raise ValueError("Not a Member of a partner Organization")
    org = dbacc.cfbk("Organization", "dsId", orgid, required=True)
    dbpt = None
    ptid = pdat.get("dsId")
    if ptid:
        dbpt = dbacc.cfbk("Point", "dsId", ptid, required=True)
        if dbpt["orgid"] != orgid:
            raise ValueError("Not your Organization's Point")
    pdat["orgid"] = org["dsId"]  # verify set
    return appuser, dbpt


def note_point_endorsement(appuser, pdat, dbpt):
    csv = dbpt.get("endorsed", "")
    if not util.val_in_csv(appuser["dsId"], csv):
        if csv:
            csv += ","
        csv += appuser["dsId"]
    pdat["endorsed"] = csv


def set_image_field_value(pobj, picfld, picfile):
    if not picfile:
        logging.debug("set_image_field_value: no picfile")
        return
    logging.debug("set_image_field_value: processing picfile")
    img = Image.open(picfile)
    img = ImageOps.exif_transpose(img)  # correct vertical orientation
    sizemaxdims = 400, 400   # max allowed width/height for thumbnail resize
    img.thumbnail(sizemaxdims)   # modify, preserving aspect ratio
    bbuf = io.BytesIO()          # file-like object for save
    img.save(bbuf, format="PNG")
    pobj[picfld] = base64.b64encode(bbuf.getvalue())


############################################################
## API endpoints:

def fetchobj():
    """ General purpose object retrieval, public info only. """
    oj = ""
    try:
        dsType = dbacc.reqarg("dt", "string", required=True)
        keyfld = dbacc.reqarg("ak", "string")  # alternate key
        if keyfld:
            fldval = dbacc.reqarg("kv", "string", required=True)
        else:
            keyfld = "dsId"
            fldval = dbacc.reqarg("di", "string", required=True)
        inst = dbacc.cfbk(dsType, keyfld, fldval)
        if not inst:
            raise ValueError(dsType + " " + keyfld + ": " + fldval +
                             " not found")
        oj = util.safe_JSON(inst)
    except ValueError as e:
        return util.serve_value_error(e)
    return util.respJSON("[" + oj + "]")


def obimg():
    """ Return the associated image for the give object, or a blank 4x4. """
    # The client might make a call to get a pic for an object which might
    # not have one.  Better to return a blank than an error in that case.
    imgdat = B64ENCTRANSPARENT4X4PNG
    try:
        dsType = dbacc.reqarg("dt", "string", required=True)
        dsId = dbacc.reqarg("di", "string", required=True)
        inst = dbacc.cfbk(dsType, "dsId", dsId)
        if inst:
            picfldmap = {"Point": "pic"}
            imgdat = inst[picfldmap[dsType]]
            imgdat = base64.b64decode(imgdat)
    except ValueError as e:
        return util.serve_value_error(e)
    return util.respond(imgdat, mimetype="image/png")


def fetchtl():
    """ Return the requested timeline and note the fetch. """
    try:
        tlid = dbacc.reqarg("tlid", "dbid")
        slug = ""
        if tlid:
            tl = dbacc.cfbk("Timeline", "dsId", str(tlid), required=True)
        else:
            slug = dbacc.reqarg("slug", "string")
            if not slug:
                slug = "default"
            slug = slug.lower()  # in case someone camelcased the url.
            tl = dbacc.cfbk("Timeline", "slug", slug, required=True)
        # Need to note the timeline was fetched, noting at least the Referer
        # and User-Agent, along with anything else useful for stats reporting.
        logging.info("TODO: tlfetch not recording DayCount stats yet")
        tls = contained_timelines(tl)
    except ValueError as e:
        return util.serve_value_error(e)
    return util.respJSON(tls)


# Called via form submit.  Returns plain text or error.
def updpt():
    """ Create or update the point from the multipart form data. """
    try:
        # flask.request.method always returns "GET".  Test for form content.
        picfile = flask.request.files.get("picin")
        pdat = util.set_fields_from_reqargs([
            "dsId", "source", "date", "text", "refs", "qtype", "communities",
            "regions", "categories", "tags", "codes", "srclang",
            "translations", "endorsed", "stats"], {})
        if not (picfile or pdat):  # no info sent, assume GET
            return util.respond("Ready", mimetype="text/plain")
        # Have POST data
        pdat["dsType"] = "Point"
        appuser, dbpt = verify_point_update_authorized(pdat)
        note_point_endorsement(appuser, pdat, dbpt)
        set_image_field_value(pdat, "pic", picfile)
        dbacc.write_entity(pdat, pdat["modified"])
    except ValueError as e:
        return util.serve_value_error(e)
    return util.respond("ptid: " + pdat["dsId"], mimetype="text/plain")
