# Docker Example

## Full docker for one server
```
version: '3.3'

services:
  server1:
    image: 
    environment:
      - RCON_HOST=
      - RCON_PORT=
      - RCON_PASS=
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
      - DISCORD_RCON_ROLEID2=
      - BATTLECON_API_URLS=http://server1:3000,http://server2:3000,http://server3:3000
      - WAIT_HOSTS=server1:3000,server2:3000,server3:3000
```

## Docker config
1. Modify the environment variables accordingly
```
    - RCON_HOST=<ServerIp:192.168.1.1>
    - RCON_PORT=<RconPort:47200>
    - RCON_PASS=<RconPassword:password>

    - RCON_HOST=<ServerIp:192.168.1.2>
    - RCON_PORT=<RconPort:47200>
    - RCON_PASS=<RconPassword:password>

    - DISCORD_TOKEN=
    - DISCORD_COMMAND_PREFIX=!
    - DISCORD_RCON_ROLEID=
    - DISCORD_RCON_ROLEID2=
```
2. Use the command `docker-compose up`
3. This can be edited everytime, rerun process if new

## Config json Example
Remember that more servers = more api urls
```json
{
    "host": "",
    "port": "",
    "pass": "",
    "discordToken": "",
    "commandPrefix": "!",
    "bconApiUrls": [ "http://localhost:3000"],
    "rconRoleId": "",
    "rconRoleId2": "",
    "database_login": "",
    "database_pass": "",
    "address": ""
}
```

## Local test (windows) 
Use env variables for terminal or set the config
```bash
$env:RCON_HOST="127.0.0.1";$env:RCON_PORT="25200";$env:RCON_PASS="my password";$env:BATTLECON_PORT="3000";node index.js
```
## Local test (linux) 
```bash
RCON_HOST="127.0.0.1" RCON_PORT="25200" RCON_PASS="my password" BATTLECON_PORT="3000"
```
Using ``export`` to local envs on linux will make them to be always on the device, I don't recommend it.

## Why this?
It uses only Rcon to get server properties, in past it used to use BL keeper for that but I moved to fix this repo.
The code itself uses es6 and some of functions I commented could be made a bit better. For now it works without any problems.

## Common Bugs
1. Servers can really randomly freeze, unfortunately there is no good way outside of pinging the server
in the short interval, to detect it you need to modify/fix server files (best is internal way)

## Credits 
1. xFileFIN -> Making helper with matching and rcon connection with apis
