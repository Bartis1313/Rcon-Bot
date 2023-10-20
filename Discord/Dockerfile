FROM node:20.8.1
LABEL maintainer="Bartis"

COPY package.json /src/package.json
RUN cd /src && npm install --loglevel error
RUN apt-get update

COPY . /src
WORKDIR /src

ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.5.0/wait /wait
RUN chmod +x /wait
CMD /wait && npm run start