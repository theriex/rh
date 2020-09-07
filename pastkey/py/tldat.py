""" Timeline and related data access processing. """
#pylint: disable=line-too-long
#pylint: disable=invalid-name
#pylint: disable=missing-function-docstring
#pylint: disable=logging-not-lazy

import logging
import base64
import io
import re
import json
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


def verify_edit_authorization(appuser, obj):
    if not obj.get("dsType") in ["Point", "Timeline"]:
        raise ValueError("Unknown object type for edit authorization")
    if not obj.get("dsId"):
        obj["editors"] = appuser["dsId"]
        return None  # Done. Anyone may create a new Point or Timeline
    dbo = dbacc.cfbk(obj["dsType"], "dsId", obj["dsId"], required=True)
    if not util.val_in_csv(appuser["dsId"], dbo["editors"]):
        raise ValueError("Not an editor for " + obj["dsType"] + obj["dsId"])
    updeds = obj.get("editors")
    if not updeds:  # didn't pass editors info, use existing values
        obj["editors"] = dbo["editors"]
    else:  # verify editors value is ok
        if updeds != dbo["editors"]:
            owner = util.csv_to_list(dbo["editors"])[0]
            if owner != appuser["dsId"]:
                raise ValueError("Only the owner may change editors")
    return dbo


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


def verify_unique_timeline_field(tldat, field, tldb):
    # logging.info("vutf tldat: " + str(tldat))
    if field == "cname" and not tldat[field]:
        raise ValueError("A unique name is required.")
    if field == "slug" and not tldat.get(field):
        return True  # slug is optional.  May be missing from tldat.
    if tldb and (tldat[field] == tldb[field]):
        return True  # hasn't changed, so still unique
    where = "WHERE " + field + "=\"" + tldat[field] + "\" LIMIT 1"
    objs = dbacc.query_entity("Timeline", where)
    if len(objs) > 0:
        if field == "cname":
            field = "name"
        raise ValueError("There is already a timeline with that " + field)
    return True


def point_preb_summary(point):
    # Timelines are language specific, so translations are not included
    sumflds = ["dsType", "dsId", "editors", "srctl", "source", "date",
               "text", "refs", "qtype", "communities", "regions", "categories",
               "tags", "codes", "stats"]
    summary = {k: point[k] for k in sumflds}
    if point.get("pic"):
        summary["pic"] = point["dsId"]
    else:
        summary["pic"] = ""
    return summary


# A regular dbacc query includes image data in the returned object, which
# means fetch overhead with the database on a separate server, which means
# make maximum use of existing info.  Unless a complete rebuild was
# triggered, this should be able to complete with a couple of reasonable
# size queries.
def update_prebuilt(tldat, tldb):
    if tldat.get("ctype") == "Timelines":
        return  # Only have preb for timelines containing points
    lpx = "update_prebuilt Timeline " + str(tldat.get("dsId", "new") + " ")
    # make a reference dict out of whatever existing preb is available
    preb = tldat.get("preb")
    if not preb and tldb:
        preb = tldb.get("preb")
    preb = preb or "[]"
    preb = util.load_json_or_default(preb, [])
    ptd = {k["dsId"]: k for k in preb}
    # update any ptd entries that were modified since last timeline save
    if tldb and tldat.get("cids"):
        logging.info(lpx + "fetching points updated since last timeline save")
        where = ("WHERE modified > \"" + tldb["modified"] + "\"" +
                 "AND dsId IN (" + tldat["cids"] + ")")
        points = dbacc.query_entity("Point", where)
        for point in points:
            ptd[point["dsId"]] = point_preb_summary(point)
    # rebuild preb, fetching points for any missing ptd entries
    logging.info(lpx + "rebuilding preb")
    preb = []
    for pid in util.csv_to_list(tldat.get("cids", "")):
        summary = ptd.get(pid)  # dict or None
        if not summary:
            point = dbacc.cfbk("Point", "dsId", pid)
            if point:
                summary = point_preb_summary(point)
        if not summary:
            logging.info(lpx + "No point info for pid " + pid)
        else: # have summary info
            preb.append(summary)
    tldat["preb"] = json.dumps(preb)


def stats_from_data(csv):
    if not csv:
        return 0, 0, 0
    ttl = 0
    entries = csv.split(",")
    for entry in entries:
        elements = entry.split(";")
        # ident = elements[0]
        start = dbacc.ISO2dt(elements[1])
        end = dbacc.ISO2dt(elements[2])
        ttl += (end - start).total_seconds()
    return ttl / len(entries), ttl, len(entries)


def completion_stats(prog):
    pavg, pttl, pcount = stats_from_data(prog["pts"])
    savg, sttl, scount = 0, 0, 0
    if "svs" in prog:
        savg, sttl, scount = stats_from_data(prog["svs"])
    return {"pavg":pavg, "pttl":pttl, "pcount":pcount,
            "savg":savg, "sttl":sttl, "scount":scount}


def pop_proginst_from_started(appuser, tlid):
    # Seems wasteful to use multiple list comprehensions, but apparently best.
    started = json.loads(appuser["started"])
    popped = [pi for pi in started if pi["tlid"] == tlid]
    if len(popped) <= 0:
        raise ValueError("Timeline " + tlid + " not started")
    started = [pi for pi in started if pi["tlid"] != tlid]
    appuser["started"] = json.dumps(started)
    return popped[0]


def push_or_update_completion(appuser, tlc, proginst):
    completed = json.loads(appuser["completed"])
    other = [pi for pi in completed if pi["tlid"] != tlc["tlid"]]
    cinst = [pi for pi in completed if pi["tlid"] == tlc["tlid"]]
    if len(cinst) > 0:
        cinst = cinst[0]
    else:
        cinst = {"tlid":tlc["tlid"], "count":0, "first":tlc["modified"]}
    for fld in ["name", "title", "subtitle"]:  # set or update
        cinst[fld] = tlc[fld]
    cinst["latest"] = tlc["modified"]
    if not cinst.get("count"):
        cinst["count"] = 0
    cinst["count"] += 1
    cinst["stats"] = completion_stats(proginst)
    completed = other.append(cinst)
    appuser["completed"] = json.dumps(completed)


def remove_html(val):
    val = re.sub(r"</?[^>]*>", "", val)
    val = re.sub(r"\n\n\n+", "\n\n", val)  # max 2 newlines in a row
    return val


def remove_html_from_point_fields(ptdat):
    """ remove html from any fields that could have accepted pasted values """
    for fld in ["source", "date", "text"]:
        ptdat[fld] = remove_html(ptdat.get(fld, ""))
    if ptdat.get("refs"):
        refs = json.loads(ptdat["refs"])
        for i, ref in refs:
            refs[i] = remove_html(ref)


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
def updpt_old():
    """ Create or update the point from the multipart form data. """
    try:
        # flask.request.method always returns "GET".  Test for form content.
        picfile = flask.request.files.get("picin")
        pdat = util.set_fields_from_reqargs([
            "dsId", "modified", "source", "date", "text", "refs", "qtype",
            "communities", "regions", "categories", "tags", "codes", "srclang",
            "translations", "endorsed", "stats"], {})
        if not (picfile or pdat):  # no info sent, assume GET
            return util.respond("Ready", mimetype="text/plain")
        # Have POST data
        pdat["dsType"] = "Point"
        appuser, _ = util.authenticate()
        verify_edit_authorization(appuser, pdat)
        set_image_field_value(pdat, "pic", picfile)
        dbacc.write_entity(pdat, pdat["modified"])
    except ValueError as e:
        return util.serve_value_error(e)
    return util.respond("ptid: " + pdat["dsId"], mimetype="text/plain")


def updtl():
    """ Standard app POST call to update a Timeline. """
    try:
        appuser, _ = util.authenticate()
        tldat = util.set_fields_from_reqargs([
            "dsId", "dsType", "modified", "editors", "name", "slug",
            "title", "subtitle", "featured", "lang", "comment", "about",
            "kwds", "ctype", "cids", "rempts", "svs"], {})
        tldb = verify_edit_authorization(appuser, tldat)
        tldat["cname"] = canonize(tldat.get("name", ""))
        verify_unique_timeline_field(tldat, "cname", tldb)
        verify_unique_timeline_field(tldat, "slug", tldb)
        update_prebuilt(tldat, tldb)
        tl = dbacc.write_entity(tldat, tldat.get("modified", ""))
    except ValueError as e:
        return util.serve_value_error(e)
    return util.respJSON(tl)


def notecomp():
    """ Note Timeline completion in TLComp instance. """
    try:
        appuser, token = util.authenticate()
        tlc = {"dsType":"TLComp", "userid":appuser["dsId"]}
        tlc = util.set_fields_from_reqargs([
            "tlid", "tlname", "tltitle", "tlsubtitle"], tlc)
        proginst = pop_proginst_from_started(appuser, tlc["tlid"])
        tlc["data"] = json.dumps(proginst)
        tlc = dbacc.write_entity(tlc)
        push_or_update_completion(appuser, tlc, proginst)
        appuser = dbacc.write_entity(appuser, appuser["modified"])
        dbacc.entcache.cache_put(appuser)  # ensure cache has latest
    except ValueError as e:
        return util.serve_value_error(e)
    return util.respJSON([appuser, token], audience="private")


def findcomps():
    """ Return completions from other people for the given timeline. """
    try:
        appuser, _ = util.authenticate()
        tlid = dbacc.reqarg("tlid", "dbid", required=True)
        where = ("tlid = " + tlid + " AND userid != " + appuser["dsId"] +
                 " ORDER BY modified DESC LIMIT 50")
        tlcs = dbacc.query_entity("TLComp", where)
    except ValueError as e:
        return util.serve_value_error(e)
    return util.respJSON(tlcs)


def featured():
    """ Return currently featured timelines to select from. """
    try:
        where = []
        for badval in ["Unlisted", "Archived", "Deleted"]:
            where.append("featured != \"" + badval + "\"")
        where = "WHERE " + " AND ".join(where)
        tls = dbacc.query_entity("Timeline", where)
    except ValueError as e:
        return util.serve_value_error(e)
    return util.respJSON(tls)


def updpt():
    """ Standard app POST call to update a Point. """
    try:
        appuser, _ = util.authenticate()
        ptdat = util.set_fields_from_reqargs([
            "dsId", "dsType", "modified", "editors", "srctl", "source",
            "date", "text", "refs", "qtype", "communities", "regions",
            "categories", "tags", "srclang", "translations", "stats"], {})
        dbpt = verify_edit_authorization(appuser, ptdat)
        if dbpt:
            dbst = dbpt.get("srctl")
            if dbst and (dbst != ptdat.get("srctl")):
                raise ValueError("Source Timeline cannot be changed.")
        for fld in ["srctl", "date", "text"]:
            if not ptdat.get(fld):
                raise ValueError("Point " + fld + " value is required.")
        # date format validity checking is done client side
        remove_html_from_point_fields(ptdat)
        pt = dbacc.write_entity(ptdat, ptdat.get("modified", ""))
    except ValueError as e:
        return util.serve_value_error(e)
    return util.respJSON(pt)
