# Development Stage
FROM node:18 AS dev

# Set working directory inside the container
WORKDIR /app

# Set environment variable to development
ENV NODE_ENV=development

# Install dependencies
COPY package*.json tsconfig*.json /app/

RUN npm install

# Copy source code
COPY src /app/src

# Compile TypeScript files to JavaScript
RUN npx tsc

# Expose the port the app will run on
EXPOSE 8000

# Command to run the app in development mode
CMD ["npm", "run", "start"]
