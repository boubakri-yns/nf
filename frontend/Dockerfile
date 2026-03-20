FROM node:20-alpine

WORKDIR /app

COPY docker/entrypoint.sh /usr/local/bin/frontend-entrypoint

RUN chmod +x /usr/local/bin/frontend-entrypoint

EXPOSE 5173

ENTRYPOINT ["frontend-entrypoint"]
