FROM node:9.2-alpine

WORKDIR /app

COPY . .

ENV HTTP_PORT=8080 HTTPS_PORT=8443

RUN npm install --production

RUN apk --no-cache add openssl && sh generate-cert.sh && rm -rf /var/cache/apk/*
 
ENTRYPOINT ["node", "./index.js"]
EXPOSE 8080 8443
CMD []
