FROM node:20-alpine
WORKDIR /app
COPY . .
ENV PORT=3000 DATA_DIR=/data COOKIE_SECURE=1
VOLUME /data
EXPOSE 3000
CMD ["sh","-c","[ -f /data/db.json ] || cp -r /app/data/. /data/; node server.js setup; node server.js"]
