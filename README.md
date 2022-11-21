# Datalakes Rest-API

[![License: MIT][mit-by-shield]][mit-by] ![Uptime][uptime-by-shield]

## Description

This is a NodeJS REST-API for the datalakes project. 

## Server Set Up

These set up instructions are for a Ubuntu server and may vary depending on version and operating system.

### Install packages 
```console
sudo su
sudo add-apt-repository ppa:git-core/ppa -y
sudo apt-get update
sudo apt-get install git -y
curl -s https://packagecloud.io/install/repositories/github/git-lfs/script.deb.sh | sudo bash
sudo apt-get install git-lfs
git lfs install
sudo apt-get install python3
sudo apt-get install gcc gfortran
sudo apt-get install libnetcdf-dev libnetcdff-dev
sudo apt-get install curl
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt-get install gcc g++ make
npm install -g node-gyp
```

### Add AWS Credentials
```console
nano ~/.aws/credentials
[default]
aws_access_key_id =
aws_secret_access_key =
```

### Clone Repo and install packages
```console
git clone git@github.com:Datalakes-Eawag/datalakes-nodejs.git
cd datalakes-nodejs
sudo npm install
```

### Setup PM2 
(Advanced process manager for production Node.js applications)
```console
npm install -g pm2
pm2 start app.js --name datalakes
pm2 save
pm2 startup
```
PM2 Controls
```console
pm2 list
pm2 stop datalakes
pm2 restart datalakes
pm2 delete datalakes
```

### Add CronJobs for updating external datasets
```console
crontab -e
0 1 * * * curl -s http://api.datalakes-eawag.ch/externaldata/update/simstrat > /dev/null
0 1 * * * curl -s http://api.datalakes-eawag.ch/externaldata/update/meteolakes > /dev/null
```

## Database set up

The PostgreSQL database schema is available [here](https://github.com/Datalakes-Eawag/datalakes-nodejs/blob/master/db/datalakes_schema.sql). This can be used to recreate the datalakes database and be populated with custom data. The database is vital for the functioning of the application. 

[mit-by]: https://opensource.org/licenses/MIT
[mit-by-shield]: https://img.shields.io/badge/License-MIT-g.svg
[uptime-by-shield]: https://img.shields.io/uptimerobot/ratio/m787532337-a369e1ee818df93c931a3bdb