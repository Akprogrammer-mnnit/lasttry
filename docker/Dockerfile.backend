FROM node:16

WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./
COPY src/package*.json ./src/

RUN npm install

# Copy all source files
COPY . .

EXPOSE 3000
CMD ["node", "src/index.js"]