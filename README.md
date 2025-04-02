# Datalakes Rest-API

[![License: MIT][mit-by-shield]][mit-by] ![Uptime][uptime-by-shield]

## Description

This is a NodeJS REST-API for the datalakes project. 

## Local Development

1. Clone the repository

```console 
git clone https://github.com/eawag-surface-waters-research/datalakes-nodejs.git
```

2. Set up ssh keys for https://gitlab.renkulab.io/

3. Create `.env` file from template `env.example`

4. Create `config.json` file from template `config_example.json`

5. Run docker compose

```console 
docker compose up -d --build
```

You can stop service with 

```console 
docker compose down
```

## Production

As above but add production DB credentials to `config.json`

```console 
docker build -t datalakes .

docker run -v $(pwd)/data:/usr/src/app/data -v ~/.ssh:/root/.ssh -e AWS_ACCESS_KEY_ID=***** -e AWS_SECRET_ACCESS_KEY=***** -p 4000:4000 datalakes
```

[mit-by]: https://opensource.org/licenses/MIT
[mit-by-shield]: https://img.shields.io/badge/License-MIT-g.svg
[uptime-by-shield]: https://img.shields.io/uptimerobot/ratio/m787532337-a369e1ee818df93c931a3bdb