# Rcon-Bot
Easy way to communicate with battlefield servers.

## Instalation
1. Install [nodejs](https://nodejs.org/en/download) preferably 21+ version for in-build fetch reasons
2. Install dependencies in Battlecon & Discord
```
cd Discord npm i
cd BattleCon npm i
```
3. Run the project using ``docker-compose up``

## Why?
The side project of mine to do something with high level languages.
And all rcon clients tend to such, have much of bloat etc...

- create simple routes for commands
- embed it anywhere you want
- handle creating plugins dynamically (very easy to add to routes as well)
- very easy to listen custom modded server apis, simply listen to the socket, or if you are advanced make own rcon command command callback (internal part of server)
- light, a single rcon client takes ~50MB
- no bloat
- ready commands as good example

# Docker Example for 2 servers
```
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
  restart: always

  discord:
    image: 
    environment: 
      - DISCORD_TOKEN=
      - DISCORD_CLIENT_ID=ID_OF_BOT
      - DISCORD_GUILD_ID=ID_OF_SERVER_OPTIONAL_IF_GLOBAL_COMMANDS_ARE_BAD_FOR_YOU
      - DISCORD_COMMAND_PREFIX=!
      - DISCORD_RCON_ROLEID=
      - BATTLECON_API_URLS=http://server1:3000,http://server2:3001
```

## Credits 
- [xFileFIN](https://github.com/Razer2015) -> Making helper with matching and rcon connection with apis
- [dcodeIO](https://github.com/dcodeIO) -> The author of BattleCon

## Licence
idgaf...