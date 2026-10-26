FROM node:22-alpine
WORKDIR /app
COPY campfire-backend/ /app/
RUN mkdir -p /data && chown -R node:node /data /app
USER node
ENV CAMPFIRE_DB_PATH=/data/campfire.sqlite \
    CAMPFIRE_HOST=0.0.0.0 \
    CAMPFIRE_PORT=3417 \
    CAMPFIRE_ALLOW_NETWORK=yes
EXPOSE 3417
CMD ["node","server.mjs"]
