# Rcon-Bot
Easy way to communicate with battlefield servers.

Rcon backend server is fairly easy to use, see all examples [here](https://github.com/Bartis1313/Rcon-Bot/tree/master/Discord/src/commands/moderation).
It's hassle-free to transform this compact project into a functional RCON API only, allowing you to manage everything externally in your preferred programming language.

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
      - WEBHOOK_TOKEN=httplink
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
      - WEBHOOK_TOKEN=httplink
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
      - BATTLECON_GAMES=BF3,BF4
      - DBS_HOST=1.1.1.1,2.2.2.2
      - DBS_NAME=one,two
      - DBS_USER=adam1,adam2
      - DBS_PASS=pass1,pass2
      - DBS_PORT=3098,3099
      - WEBHOOK_TOKENS=httplink,httplink
```

And then use the command `docker-compose up`

## Local test
Use env variables ``$env:<var>=<value>`` for each proccess

## Credits 
- [xFileFIN](https://github.com/Razer2015) -> Making helper with matching and rcon connection with apis
- [dcodeIO](https://github.com/dcodeIO) -> The author of BattleCon
