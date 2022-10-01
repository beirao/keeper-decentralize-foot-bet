# Smart contracts keeper Dockerize

This repo Dockerize a Chainlink keeper system for [Decentralize-foot-bet](https://github.com/beirao/main-decentralize-foot-bet). Use this when you don't want to spend LINK :)

# Docker

## Build

```bash
sudo docker build -t keeper-boarbet .
```

## Run image

```bash
sudo docker run -d -v dst:src keeper-boarbet
```

## Save the image

```bash
sudo docker save -o keeper-boarbet.tar keeper-boarbet
```
