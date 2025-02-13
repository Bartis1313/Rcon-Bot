# Rcon-Bot
Easy way to communicate with battlefield servers.

Discord part is for v14, as well as old legacy message.content handling
So in practise, any version should work with small edits

The Battlecon part was edited to handle disconnects, and exposed apis
The Module of BattleConClient handles creating plugins as well. Without perfect handling of errors.
Probably focused over this part too much, you can see KickLogger as example how to write own plugin.

Some of discord commands rely heavily on famous database plugin for bf servers, use them or just see as example.
Deleting the folder will simply solve it, though you will have to implement unban yourself. Should be easy, with so many command examples.

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
      - DISCORD_CLIENT_ID=ID_OF_BOT
      - DISCORD_GUILD_ID=ID_OF_SERVER_OPTIONAL_IF_GLOBAL_COMMANDS_ARE_BAD_FOR_YOU
      - DISCORD_COMMAND_PREFIX=!
      - DISCORD_RCON_ROLEID=
      - BATTLECON_API_URLS=http://server1:3000,http://server2:3001
```

And then use the command `docker-compose up`

## Credits 
- [xFileFIN](https://github.com/Razer2015) -> Making helper with matching and rcon connection with apis
- [dcodeIO](https://github.com/dcodeIO) -> The author of BattleCon
