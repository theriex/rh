import webapp2
import datetime
from google.appengine.ext import db
import logging

# A DayCount keeps track of which timelines were accessed how many times
# each day so that information is available for activity reporting.  Anytime
# a save happens, or a timeline is completed, the counts for that timeline
# get incremented.  Non-critical, async and non-blocking as possible.
#
# The toptlsum is computed by periodic task after day close or by admin.
# Each summary entry has fields tlid, name, lang, desc, org, status, ctype,
# created, modified, count30d (total access count past 30 days).  The
# summaries are built by retrieving the top 200 most recently modified
# timelines, then merging those with the count data over the past 30 days
# faulting in any timeline instances that weren't already retrieved.
class DayCount(db.Model):
    """ Traffic access accumulator. May under-report if save errors. """
    day = db.StringProperty(required=True)  # ISO day (midnight eastern)
    tlcounts = db.TextProperty()  # CSV tlid:count
    toptlsum = db.TextProperty()  # JSON array of tl summaries (after day over)
