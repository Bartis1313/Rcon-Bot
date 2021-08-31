FROM node:13.10.1
LABEL maintainer="Bartis"

COPY package.json /src/package.json
RUN cd /src && npm install --loglevel error
RUN apt-get update

COPY . /src
WORKDIR /src

EXPOSE 3000
CMD npm run start