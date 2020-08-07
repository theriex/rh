""" Main API switchboard with all entrypoints """
#pylint: disable=invalid-name
#pylint: disable=missing-function-docstring
#pylint: disable=wrong-import-position
#pylint: disable=wrong-import-order
#pylint: disable=ungrouped-imports
import py.mconf as mconf
import logging
import logging.handlers
# logging may or may not have been set up, depending on environment.
logging.basicConfig(level=logging.INFO)
# Tune logging so it works the way it should, even if set up elsewhere
handler = logging.handlers.TimedRotatingFileHandler(
    mconf.logsdir + "plg_application.log", when='D', backupCount=10)
handler.setFormatter(logging.Formatter(
    '%(levelname)s %(module)s %(asctime)s %(message)s'))
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(handler)
import flask
import py.tldat as tldat
import py.util as util
import py.start as start


# Create a default entrypoint for the app.
app = flask.Flask(__name__)

######################################################################
#  API:
#

@app.route('/api/version')
def appversion():
    return "1.2"

@app.route('/api/fetchobj')
def fetchobj():  # params: dt (dsType), di (dsId)
    return tldat.fetchobj()

@app.route('/api/obimg')
def obimg():  # params: dt (dsType), di (dsId)
    return tldat.obimg()

@app.route('/api/fetchtl')
def fetchtl(): # params: uidp, tlid|slug
    return tldat.fetchtl()

@app.route('/api/newacct', methods=['GET', 'POST'])
def newacct(): # params: email, password
    return util.secure(util.newacct)

@app.route('/api/acctok')
def acctok(): # params: email, password
    return util.secure(util.acctok)

@app.route('/api/mailactcode', methods=['GET', 'POST'])
def mailactcode(): # params: email, returl
    return util.secure(util.mailactcode)

@app.route('/api/mailpwr', methods=['GET', 'POST'])
def mailpwr(): # params: email, returl
    return util.secure(util.mailpwr)

@app.route('/api/updacc', methods=['GET', 'POST'])
def updacc(): # params: auth, AppUser
    return util.secure(util.updacc)

@app.route('/api/supphelp')
def supphelp(): # params: adminauth, email
    return util.secure(util.supphelp)

@app.route('/api/updpt', methods=['GET', 'POST'])
def updpt(): # params: auth, Point data
    return util.secure(tldat.updpt)

@app.route('/api/updtl', methods=['GET', 'POST'])
def updtl(): # params: auth, Timeline data
    return util.secure(tldat.updtl)

@app.route('/api/notecomp', methods=['GET', 'POST'])
def notecomp(): # params: auth, TLComp descriptive fields
    return util.secure(tldat.notecomp)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def startpage(path):
    refer = flask.request.referrer or ""
    return util.secure(lambda: start.startpage(path, refer))


# Hook for calling the app directly using python on the command line, which
# can be useful for unit testing.  In the deployed app, a WSGI browser
# interface like Gunicorn or Passenger serves the app.
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8080, debug=True)
