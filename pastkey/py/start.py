""" Return appropriate start page content """
# This page has to be generated dynamically for a static bot crawl to get
# an appropriate title, description and pic reference(s).
#pylint: disable=line-too-long
#pylint: disable=logging-not-lazy
#pylint: disable=missing-function-docstring

import logging
import py.util as util

CACHE_BUST_PARAM = "v=200921"  # Updated via ../../build/cachev.js

INDEXHTML = """
<!doctype html>
<html itemscope="itemscope" itemtype="https://schema.org/WebPage"
      xmlns="https://www.w3.org/1999/xhtml" dir="ltr" lang="en-US">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="robots" content="noodp" />
  <meta name="description" content="$DESCR" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="mobile-web-app-capable" content="yes" />
  <link rel="icon" href="$SITEPIC">
  <link rel="image_src" href="$SITEPIC" />
  <meta property="og:image" content="$SITEPIC" />
  <meta property="twitter:image" content="$SITEPIC" />
  <meta itemprop="image" content="$SITEPIC" />
  <title>$TITLE</title>
  <link href="$RDRcss/site.css?$CBPARAM" rel="stylesheet" type="text/css" />
</head>
<body id="bodyid">

<div id="rhouterdiv">
  <div id="rhcontentdiv">
    <div id="splashdiv">

<div id="recomTLsdiv" class="tlinksdiv"></div>

<p>PastKey is a platform for creating historical timelines.  Each timeline
point has concise text with an optional picture and links to
resources. Timelines can be viewed interactively or as searchable reference
archives. </p>

<img src="$RDRimg/svsampscr.png"/>

<p>Supplemental visualizations based on specialized datasets can be added to
any timeline to create multiple levels.  Longer timelines are automatically
divided into chapters.</p>

<img src="$RDRimg/svsampsupp.png"/>

<p>PastKey is an open source project.  Data for timelines and visualizations
are provided by contributing members.  <a href="timeline/default">Sign
In</a> from the menu on any timeline.  </p>

<img src="$RDRimg/pastkey.png"/>

    </div>
    <div id="loadstatdiv">
      Starting...
    </div>
  </div>
</div>


<script src="$RDRjs/lib/jtmin.js?$CACHEBUSTPARAM"></script>
<script src="$RDRjs/lib/d3.v4.min.js?$CACHEBUSTPARAM"></script>
<script src="$RDRjs/app.js?$CACHEBUSTPARAM"></script>

<script>
  app.refer = "$REFER";
  app.init();
</script>

</body>
</html>
"""

# path is everything after the root url slash.
def startpage(path, refer):
    stinf = {
        "rawpath": path,
        "path": path.lower(),
        "refer": refer or "",
        "replace": {
            "$RDR": "",  # Relative docroot
            "$CBPARAM": CACHE_BUST_PARAM,
            "$DESCR": "PastKey is a platform for creating and interacting with timelines.  People use PastKey to learn about historical events, reference timeline points, or create timelines for others.",
            "$SITEPIC": "img/pastkey.png?" + CACHE_BUST_PARAM,
            "$TITLE": "PastKey"}}
    if stinf["refer"]:
        logging.info("startpage referral: " + refer)
    if path and not path.startswith("index.htm"):
        # PENDING: fetch timeline and return JSON with index page for cache
        # Replace the title/pic/descr with the timeline info
        stinf["replace"]["$RDR"] = "../"
        stinf["replace"]["$SITEPIC"] = "../" + stinf["replace"]["$SITEPIC"]
    html = INDEXHTML
    for dcode, value in stinf["replace"].items():
        html = html.replace(dcode, value)
    return util.respond(html)
