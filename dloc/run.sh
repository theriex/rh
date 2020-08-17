#!/bin/bash
# Run relative to rh/pastkey e.g. $ ../dloc/run.sh
#
# If gunicorn fails to start with [ERROR] Connection in use: ('', 8081) then
# ps -A | grep "gunicorn"
# and kill -SIGINT any leftover processes.
gunicorn -b :8081 --pythonpath 'pastkey/' main:app &
echo "gunicorn main process: $!"
nginx -c $HOME/general/rh/dloc/nginx.conf
echo "# mysql.server start"
