# Docker CI/CD Guide for BackEnd

This guide explains how to build, test, publish, and deploy the BackEnd service using GitHub Actions and Docker.

## 1) Goal

Set up a pipeline that:
- Runs Continuous Integration (CI) on pull requests and pushes
- Builds a Docker image from the BackEnd Dockerfile
- Pushes the image to GitHub Container Registry (GHCR)
- Deploys the image to a target server on the production branch

## 2) Project Files Used

- .github/workflows/ci.yml
- Dockerfile
- docker-compose.yml
- package.json

## 3) Recommended Pipeline Design

Use two logical stages inside one workflow:

- CI stage
  - Checkout code
  - Set up Node.js
  - Install dependencies
  - Run lint and tests (if defined)
  - Build Docker image (validation build)

- CD stage
  - Trigger only on push to main (or production branch)
  - Log in to GHCR
  - Build and push tagged Docker image
  - Deploy on server using Docker Compose

## 4) Required GitHub Secrets

Add these repository secrets in GitHub:

- GHCR_TOKEN
  - Personal Access Token with package write permission
  - If using GITHUB_TOKEN for same-repo packages, this may be optional

- DEPLOY_HOST
  - Server IP or domain

- DEPLOY_USER
  - SSH user on deployment server

- DEPLOY_SSH_KEY
  - Private SSH key used by GitHub Actions to connect to server

- DEPLOY_PATH
  - Absolute path on server where docker-compose.yml exists
  - Example: /opt/jibobi3/backend

Optional:
- APP_ENV_FILE
  - Full .env content if you want workflow to write env vars on server

## 5) Suggested Branch Rules

- Protect main branch
- Require pull request reviews
- Require CI checks before merge

## 6) Docker Image Tagging Strategy

Use both immutable and rolling tags:

- ghcr.io/<owner>/jibobi3-backend:<commit-sha>
- ghcr.io/<owner>/jibobi3-backend:latest

This allows stable rollbacks using a known commit image.

## 7) Example Deployment Flow

1. Developer opens pull request
2. CI runs and validates Node install and Docker build
3. Pull request is merged to main
4. CD builds and pushes image to GHCR
5. CD connects to server over SSH
6. Server runs docker compose pull and docker compose up -d

## 8) Server Requirements

Install on target server:

- Docker Engine
- Docker Compose plugin
- Login permission to pull image from GHCR
- Firewall opening app port (for example 3000)

Server should contain:

- docker-compose.yml referencing image from GHCR
- .env file if runtime variables are needed

## 9) Suggested docker-compose.yml Pattern

Use image-based deployment in production:

services:
  api:
    image: ghcr.io/<owner>/jibobi3-backend:${IMAGE_TAG:-latest}
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env

## 10) Suggested Dockerfile Pattern

For current codebase, container startup should target index.js.

- Use node:18-alpine
- Copy package files and install only production deps for runtime images
- Copy application source
- Expose 3000
- Run: node index.js

## 11) Health and Reliability Recommendations

- Add a container healthcheck endpoint (for example /api/stats or /health)
- Add restart policy in Compose
- Use fixed base image versions when possible
- Keep uploads directory mounted as volume if persistent files are needed

## 12) Rollback Procedure

If latest deployment fails:

1. On server, set IMAGE_TAG to previous commit SHA
2. Run docker compose pull
3. Run docker compose up -d

This reverts to a known-good image quickly.

## 13) Troubleshooting

- CI fails on npm test
  - Add a test script in package.json or make test step conditional

- Container exits immediately
  - Verify Dockerfile CMD points to index.js

- Server cannot pull image
  - Verify GHCR login and package visibility/permissions

- SSH deployment fails
  - Validate key format, user permissions, and host reachability

## 14) Maintenance Checklist

- Rotate deploy SSH keys periodically
- Rotate tokens and limit scopes
- Keep Node and Docker base image updated
- Review workflow permissions regularly

## 15) Next Implementation Step

After this guide, apply the actual workflow and Docker refactor:
- Update .github/workflows/ci.yml for CI + CD
- Fix Dockerfile CMD to index.js
- Update docker-compose.yml to use pushed image tag
- Add .dockerignore
