FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV EXPO_PUBLIC_API_URL=https://inthon-demo-20261031-dh.koreacentral.cloudapp.azure.com
RUN npm run build:web

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 8080
