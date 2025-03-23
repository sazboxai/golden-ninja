FROM node:18

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose the port the app runs on
EXPOSE 8989

# Start the app
CMD ["npm", "start"] 