### STAGE 1: Build ###
FROM oven/bun:1 AS build
WORKDIR /usr/src/app
COPY package.json bun.lock /usr/src/app/
RUN bun install --frozen-lockfile
COPY tsconfig.json tsconfig.node.json vite.config.mts index.html /usr/src/app/
COPY public /usr/src/app/public
COPY src /usr/src/app/src
ARG GIT_COMMIT
ENV VITE_GIT_SHA=$GIT_COMMIT
# Pflicht: Backend der Zielumgebung, z. B. https://www.dj-junkies.de (live) oder https://test.dj-junkies.de (test)
ARG REST_API_URL
ENV VITE_REST_API_URL=$REST_API_URL
# Optional: Keycloak-Realm für die Anmeldung (E5), z. B. https://auth.dj-junkies.de/realms/electrobox; leer = Login-Formular
ARG KEYCLOAK_URL=""
ENV VITE_KEYCLOAK_URL=$KEYCLOAK_URL
RUN bun run build

### STAGE 2: Production Environment ###
# build for example with:
# docker build -t $TAG \
#		--build-arg REST_API_URL=https://www.dj-junkies.de \
#		--build-arg GIT_COMMIT=$(git rev-parse HEAD) \
#		--build-arg GIT_VERSION="$(git log --pretty='format:%h %s' -q -1)" .
FROM nginx:1.30-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/build /usr/share/nginx/html
EXPOSE 3000
ARG GIT_COMMIT
ARG GIT_VERSION
LABEL platform=react git.commit=$GIT_COMMIT git.version=$GIT_VERSION
CMD ["nginx", "-g", "daemon off;"]
