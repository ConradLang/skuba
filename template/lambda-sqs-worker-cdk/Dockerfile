# syntax=docker/dockerfile:1.2

FROM --platform=${BUILDPLATFORM:-<%- platformName %>} node:18-alpine AS dev-deps

WORKDIR /workdir

COPY package.json yarn.lock ./

RUN \
  --mount=type=secret,id=npm,dst=/workdir/.npmrc \
  yarn install --frozen-lockfile --ignore-optional --non-interactive && \
  yarn package && \
  yarn cache clean
