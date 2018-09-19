#!/bin/bash

rm -f latest.dump
heroku pg:backups:capture --app ample-production
heroku pg:backups:download --app ample-production
pg_restore --verbose --clean --no-acl --no-owner -h localhost -U app -d ample_dev latest.dump
