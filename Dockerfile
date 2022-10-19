# syntax=docker/dockerfile:1

FROM node:lts-alpine
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]
RUN apt-get update && apt-get install -y ffmpeg
ENV NODE_ENV=production
WORKDIR /app
COPY ["package.json", "package-lock.json*", "./"]
RUN npm install --production
COPY server.js douban.js poster.js proxy.js ./
CMD [ "node", "server.js" ]