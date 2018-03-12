FROM node:carbon-alpine

# Create app directory
WORKDIR /usr/src/app

# Both package.json and package-lock.json should be included for some reason
COPY package*.json ./

# Install packages
RUN npm install --only=production

# Bundle app source
COPY . .

# Run app
CMD ["npm", "start"]
