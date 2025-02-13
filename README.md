# Rcon-Bot
Easy way to communicate with battlefield servers.

PLEASE USE CLEAN BRANCH!

Discord part is for v14, as well as old legacy message.content handling
So in practise, any version should work with small edits

The Battlecon part was edited to handle disconnects, and exposed apis
The Module of BattleConClient handles creating plugins as well. Without perfect handling of errors.

Some of discord commands rely heavily on famous database plugin for bf servers, use them or just see as example.

# Docker Example

## Full docker for two servers
```
version: '3.3'

services:
  server1:
    image: 
    environment:
      - RCON_HOST=127.0.0.1
      - RCON_PORT=46000
      - RCON_PASS=1
      - GAME=BF3
    deploy:
      restart_policy:
        condition: any
        delay: 5s
        window: 120s
  restart: always

  server2:
    image: 
    environment:
      - RCON_HOST=127.0.0.1
      - RCON_PORT=47000
      - RCON_PASS=1
      - GAME=BF4
    deploy:
      restart_policy:
        condition: any
        delay: 5s
        window: 120s
  restart: always

  discord:
    image: 
    environment: 
      - DISCORD_TOKEN=
      - DISCORD_COMMAND_PREFIX=!
      - DISCORD_RCON_ROLEID=
      - BATTLECON_API_URLS=http://server1:3000,http://server2:3001
```

And then use the command `docker-compose up`

## Local test
Use env variables ``$env:<var>=<value>`` for each proccess

## Credits 
- [xFileFIN](https://github.com/Razer2015) -> Making helper with matching and rcon connection with apis
- [dcodeIO](https://github.com/dcodeIO) -> The author of BattleCon
