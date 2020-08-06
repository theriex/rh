""" Load the database from JSON data files and supporting images """
#pylint: disable=wrong-import-position
#pylint: disable=invalid-name
#pylint: disable=logging-not-lazy
#pylint: disable=missing-function-docstring
import logging
logging.basicConfig(level=logging.DEBUG)
import os
import json
import base64
# ln -s ../../pastkey/py py
import py.dbacc as dbacc


def verify_db_instance(fbase, fields, fob):
    dbob = dbacc.cfbk(fob["dsType"], "importid", fob["importid"])
    if not dbob:
        for fieldname, fattrs in fields.items():
            if fattrs["pt"] == "image" and fob[fieldname]:
                imgfilename = fbase + "images/" + fob["importid"] + ".png"
                with open(imgfilename, 'rb') as imagefile:
                    bdat = imagefile.read()
                    fob[fieldname] = base64.b64encode(bdat)
        logging.info("Writing " + fob["dsType"] + fob["importid"])
        dbacc.write_entity(fob)


def load_data(fr):
    for entity, fields in dbacc.entdefs.items():
        logging.info("Loading " + entity)
        for filename in os.listdir(fr + entity):
            if filename.endswith(".json"):
                fbase = fr + entity + "/"
                with open(fbase + filename, 'r') as datfile:
                    obj = json.loads(datfile.read())
                    obj["dsType"] = entity
                    verify_db_instance(fbase, fields, obj)


# {entity: { importid:dsId, importid2:dsId2, ...}}
imp2ds = {}

def convert_dbid(entity, importid):
    if not importid:
        return ""
    enti2d = imp2ds.get(entity)
    if not enti2d:
        imp2ds[entity] = {}
        enti2d = imp2ds[entity]
    dsId = enti2d.get(importid)
    if not dsId:
        refobj = dbacc.cfbk(entity, "importid", importid, required=True)
        enti2d[importid] = refobj["dsId"]
        dsId = refobj["dsId"]
    return dsId


def convert_json_array(jsa, fcs):
    objs = json.loads(jsa or "[]")
    for obj in objs:
        for fc in fcs:
            obj[fc["fld"]] = convert_dbid(fc["et"], obj[fc["fld"]])
            # convert embedded objects to have dsId if encountered
            if fc["fld"] == "instid":
                obj["dsId"] = obj[fc["fld"]]
    return json.dumps(objs)


def convert_idcsv(idcsv, reftype):
    if not idcsv:
        return ""
    ids = idcsv.split(",")
    for i, refid in enumerate(ids):
        ids[i] = convert_dbid(reftype, refid)
    return ",".join(ids)


def convert_completion_data(dat):
    if not dat:
        return ""
    dat = json.loads(dat)
    compfields = {
        "tlid": {"rt":"foreignkey", "et":"Timeline"},
        "pts": {"rt":"pcompcsv"}}
    dat = convert_ref_fields(dat, compfields)
    dat = json.dumps(dat)
    return dat


def convert_point_completion_csv(pcompcsv):
    if not pcompcsv:
        return ""
    pcs = pcompcsv.split(",")
    for i, pcomp in enumerate(pcs):
        ces = pcomp.split(";")
        ces[0] = convert_dbid("Point", ces[0])
        pcs[i] = ";".join(ces)
    return ",".join(pcs)


refcons = {
    "AppUser": {
        # "remtls" doesn't need to be converted because all NULL in db
        "completed": {"rt":"jsarr", "fld":"tlid", "et":"Timeline"},
        "started": {"rt":"jsarr", "fld":"tlid", "et":"Timeline"}},
        # "built" doesn't need to be converted because all NULL in db
        # "orgid": has been removed
    # The DayCount details are truncated by the download process.  Not
    # worth enabling billing, trying to export to a cloud bucket etc.
    # "Organization": {
    #     "recpre": {"rt":"jsarr", "flds": [  # same as Timeline.preb
    #         {"fld":"orgid", "et":"Organization"},
    #         {"fld":"instid", "et":"Point"}]}},
    # "Point": {
    #     "orgid": {"rt":"foreignkey", "et":"Organization"}},
    # AppService has no conversions
    "Timeline": {
        # "orgid": {"rt":"foreignkey", "et":"Organization"},
        "cids": {"rt":"potidcsv"},
        "preb": {"rt":"jsarr", "flds": [  # same as Organization.recpre
            # {"fld":"orgid", "et":"Organization"},
            {"fld":"instid", "et":"Point"}]}},
    "TLComp": {
        "userid": {"rt":"foreignkey", "et":"AppUser"},
        "tlid": {"rt":"foreignkey", "et":"Timeline"},
        "data": {"rt":"compdat"}}}


def convert_ref_fields(obj, fcs):
    """ Walk the field conversions and apply them to the obj. """
    for cfield, conv in fcs.items():
        if conv["rt"] == "foreignkey":
            obj[cfield] = convert_dbid(conv["et"], obj[cfield])
        elif conv["rt"] == "jsarr":
            subfcs = conv.get("flds")
            if not subfcs:
                subfcs = [{"fld":conv["fld"], "et":conv["et"]}]
            obj[cfield] = convert_json_array(obj[cfield], subfcs)
        elif obj.get("dsType") == "Timeline" and conv["rt"] == "potidcsv":
            reftype = "Point"
            if obj["ctype"] == "Timelines":
                reftype = "Timeline"
            obj[cfield] = convert_idcsv(obj[cfield], reftype)
        elif conv["rt"] == "compdat":
            obj[cfield] = convert_completion_data(obj[cfield])
        elif conv["rt"] == "pcompcsv":
            obj[cfield] = convert_point_completion_csv(obj[cfield])
        else:
            raise ValueError("Unknown conversion type " + str(conv["rt"]))
    return obj


def convert_refs():
    """ Walk the database for unconverted instances and convert each. """
    for entity, fcs in refcons.items():
        where = "WHERE batchconv IS NULL OR batchconv != \"importconv\""
        cobs = dbacc.query_entity(entity, where)
        for cob in cobs:
            cob = convert_ref_fields(cob, fcs)
            cob["batchconv"] = "importconv"
            dbacc.write_entity(cob, vck=cob["modified"])


impfiles_root = "/general/temp/rhport/"   # local dev
load_data(impfiles_root)
convert_refs()
