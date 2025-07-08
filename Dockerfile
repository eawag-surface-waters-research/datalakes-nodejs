# Use a more recent Debian-based image
FROM debian:bullseye-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# Install required system dependencies
RUN apt-get update && \
    apt-get install -y \
    curl \
    git \
    python2.7 \
    awscli \
    gcc \
    gfortran \
    libnetcdf-dev \
    libnetcdff-dev \
    g++ \
    make \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set Python 2.7 for node-gyp
RUN ln -s /usr/bin/python2.7 /usr/bin/python

# Install n (Node version manager)
RUN curl -L https://raw.githubusercontent.com/tj/n/master/bin/n -o /usr/local/bin/n && \
    chmod +x /usr/local/bin/n

# Use n to install the desired Node.js version (8.10)
RUN n 8.10.0

# Set the correct Node.js and npm binaries
ENV PATH="/usr/local/n/versions/node/8.10.0/bin:${PATH}"

# Verify the installed Node.js version
RUN node -v
RUN npm -v

# Copy package.json and package-lock.json first (for efficient caching)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the entire application source code
COPY . .

# Copy the entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose the application port
EXPOSE 4000

# Create directories inside the container to store mounted data (optional)
RUN mkdir -p /usr/src/app/data /usr/src/app/logs

# Use the entrypoint script to run migrations + start server
ENTRYPOINT ["sh", "/usr/local/bin/docker-entrypoint.sh"]
