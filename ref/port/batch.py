""" Batch database update from json and supporting image files """
#pylint: disable=wrong-import-position
#pylint: disable=invalid-name
#pylint: disable=logging-not-lazy
#pylint: disable=missing-function-docstring
import logging
logging.basicConfig(level=logging.DEBUG)
import os
import json
import base64
import py.dbacc as dbacc

# See 06oc20 notes for setup and use

converted = 0

def get_db_object(fob):
    src = fob["source"]
    objs = dbacc.query_entity("Point", "WHERE source=\"" + src + "\" LIMIT 2")
    if len(objs) > 1:
        logging.warning("Multiple points for source " + src)
        return None
    if len(objs) < 1:
        logging.warning("Point source: " + src + ", importid: " +
                        fob["importid"] + " not found.")
        return None
    return objs[0]


def verify_db_instance(fr, fob):
    dbob = get_db_object(fob)
    if not dbob:
        return
    updated = ""
    if not dbob["importid"]:
        dbob["importid"] = fob["importid"]
        updated += " importid:" + fob["importid"]
    if fob["codes"] and not dbob["codes"]:
        dbob["codes"] = fob["codes"]
        updated += " codes:" + fob["codes"]
    if fob["pic"] and not dbob["pic"]:
        imgfilename = fr + "images/" + fob["importid"] + ".png"
        with open(imgfilename, 'rb') as imagefile:
            bdat = imagefile.read()
            dbob["pic"] = base64.b64encode(bdat)
        updated += " pic"
    if updated:
        global converted
        converted += 1
        logging.info("Updated Point " + dbob["dsId"] + updated)
        dbacc.write_entity(dbob, vck=dbob["modified"])


def batch_load_data():
    convmax = 400
    fr = os.getcwd() + "/Point/"
    for filename in os.listdir(fr):
        if converted >= convmax:
            logging.info("stopping after max " + str(convmax) + " conversions.")
            break
        if filename.endswith(".json"):
            with open(fr + filename, 'r') as datfile:
                obj = json.loads(datfile.read())
                verify_db_instance(fr, obj)


batch_load_data()
