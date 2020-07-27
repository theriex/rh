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

# Create a default entrypoint for the app.
app = flask.Flask(__name__)

######################################################################
#  API:
#

@app.route('/api/version')
def appversion():
    return "1.2"


# Hook for calling the app directly using python on the command line, which
# can be useful for unit testing.  In the deployed app, a WSGI browser
# interface like Gunicorn or Passenger serves the app.
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8080, debug=True)
