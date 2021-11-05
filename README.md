# Datalakes Rest-API

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
//sudo chown -R 1000:1000 "/home/ubuntu/.npm"
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

### Setup ip PM2 
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
