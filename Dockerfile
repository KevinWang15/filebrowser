# Use Node.js LTS (slim version for smaller image size)
FROM node:20-slim

# Create app directory
WORKDIR /app

# Setup directory to serve files from
RUN mkdir /serve

# Install app dependencies
COPY package.json ./
RUN npm install --production

# Copy app source
COPY index.js ./

# Expose port
EXPOSE 3000

# Set user to non-root
USER node

# Run the application with /serve as default path
CMD ["node", "index.js", "/serve"]
