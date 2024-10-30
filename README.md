# FileBrowser

A lightweight, web-based file browser with special focus on directory/file downloads. Perfect for quickly sharing files over HTTP with automatic tar compression for directory downloads.

## Features

- 🌐 Web-based file browser interface
- 📁 Directory browsing with hierarchical navigation
- 📦 One-click downloads for both files and directories
- 🗜️ Automatic tar compression for directory downloads
- 🎯 Specialized for serving and downloading files
- 🐳 Ready-to-use Docker image

## Quick Start

### Using Node.js directly

```bash
# Install dependencies
npm install

# Start server (serves current directory by default)
node index.js

# Or specify a directory to serve
node index.js /path/to/serve
```

### Using Docker

```bash
# Quick start (serves files from mounted volume)
docker run -p 3000:3000 -v /path/to/your/files:/serve ghcr.io/kevinwang15/filebrowser:master
```

Then open http://localhost:3000 in your browser.

## Docker Compose Example

```yaml
version: '3'
services:
  filebrowser:
    image: ghcr.io/kevinwang15/filebrowser:master
    ports:
      - "3000:3000"
    volumes:
      - /path/to/your/files:/serve
    restart: unless-stopped
```

## Platform Compatibility

### Running on Apple Silicon (M1/M2) MacBooks

This image is built for AMD64 architecture. To run it on Apple Silicon (ARM64) machines, you need to enable Docker's built-in emulation. You have two options:

1. **Enable emulation for this specific container**:
   ```bash
   docker run --platform linux/amd64 -p 3000:3000 -v /path/to/files:/serve:ro ghcr.io/kevinwang15/filebrowser:master
   ```

2. **Using Docker Compose**:
   ```yaml
   version: '3'
   services:
     filebrowser:
       platform: linux/amd64  # Enable emulation for Apple Silicon
       image: ghcr.io/kevinwang15/filebrowser:master
       ports:
         - "3000:3000"
       volumes:
         - /path/to/your/files:/serve:ro
       restart: unless-stopped
   ```


## Command Line Usage

The application accepts the serve path as an optional first argument:

```bash
# Default usage (serves current directory)
node index.js

# Serve specific directory
node index.js /path/to/serve

# Using custom port
PORT=8080 node index.js /path/to/serve

# Using environment variable for path
SERVE_PATH=/path/to/serve node index.js
```

## Features in Detail

### Directory Downloads
- Directories are automatically compressed into tar files when downloaded
- Files maintain their relative paths within the tar archive
- Downloads are streamed, minimizing memory usage

### File Browser Interface
- Clean, modern interface with file/directory icons
- Shows file sizes and modification times
- One-click navigation through directories
- Separate download buttons for both files and directories
- Breadcrumb navigation with "Up" button

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port to run the server on |
| `SERVE_PATH` | `./` | Directory to serve files from (can be overridden by command line argument) |

## Usage Notes

- Mount volumes read-only if you only need download functionality:
  ```bash
  docker run -v /path/to/files:/serve:ro ghcr.io/kevinwang15/filebrowser:master
  ```
- For better security, consider running behind a reverse proxy with authentication
- Large directory downloads might take some time depending on size and network speed

## Development

1. Clone the repository:
```bash
git clone https://github.com/kevinwang15/filebrowser.git
```

2. Install dependencies:
```bash
npm install
```

3. Run the server:
```bash
node index.js [serve_path]
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Author

Kevin Wang

## Security Considerations

- This is a file serving tool - be careful what directories you expose
- Consider running behind a reverse proxy with authentication for public-facing deployments
- Mount volumes read-only when possible to prevent write access
