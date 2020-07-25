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


def convert_refs():
    logging.info("convert_refs not implemented yet")


impfiles_root = "/general/temp/rhport/"   # local dev
load_data(impfiles_root)
convert_refs()
