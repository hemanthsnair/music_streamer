FROM node:20-slim

# Install Python 3 and FFmpeg required by youtube-dl
RUN apt-get update && \
    apt-get install -y python3 ffmpeg curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the server code
COPY . .

# Ensure the uploads directory exists and is writable
RUN mkdir -p uploads

# Expose port 5000 (standard for local, but Koyeb/Render will bind dynamically)
EXPOSE 5000

# Start server
CMD ["node", "index.js"]
