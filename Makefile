up:
#	docker compose up -d redis postgres
	yarn install-local-ssl
	yarn install --pure-lockfile
	yarn dev:watch

build:
	docker compose build --pull outline

test:
	docker compose up -d redis postgres
	NODE_ENV=test yarn sequelize db:drop
	NODE_ENV=test yarn sequelize db:create
	NODE_ENV=test yarn sequelize db:migrate
	yarn test

watch:
	docker compose up -d redis postgres
	NODE_ENV=test yarn sequelize db:drop
	NODE_ENV=test yarn sequelize db:create
	NODE_ENV=test yarn sequelize db:migrate
	yarn test:watch

destroy:
	docker compose stop
	docker compose rm -f

docker_build:
	docker buildx build -f Dockerfile.custom -t ghcr.io/lufrey/outline_praxiszentrum:latest --platform=linux/arm64,linux/amd64 . --push



# docker_push_image:
# 	docker push ghcr.io/lufrey/outline_praxiszentrum:latest


# docker_update: docker_build docker_tag_image docker_push_image

.PHONY: up build destroy test watch # let's go to reserve rules names
