#!/usr/bin/env bash
sudo docker build -t lundstig/chatter .
sudo docker run --name chatter -p "44001:8080" -d --restart unless-stopped --mount source=chatter-logs,target=/data lundstig/chatter
