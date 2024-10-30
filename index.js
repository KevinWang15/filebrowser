const express = require('express');
const fsPromises = require('fs').promises;
const fs = require('fs');
const path = require('path');
const tar = require('tar-stream');
const walk = require('walk');
const mime = require('mime-types');

// Get serve path from command line argument or environment variable or default
const SERVE_PATH = process.argv[2] || process.env.SERVE_PATH || './';

// Validate and resolve the serve path
const resolvedServePath = path.resolve(SERVE_PATH);

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Helper function to encode URI components safely
function safeEncode(str) {
    return encodeURIComponent(str).replace(/%20/g, '+');
}

// Helper function to get file size in human readable format
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Validate serve path exists before starting server
async function validateAndStart() {
    try {
        const stats = await fsPromises.stat(resolvedServePath);
        if (!stats.isDirectory()) {
            console.error(`Error: ${resolvedServePath} is not a directory`);
            process.exit(1);
        }

        app.get('*', async (req, res) => {
            try {
                // Handle download parameter
                const download = req.query.download === 'true';

                // Get the requested path, removing any query parameters
                let requestPath = decodeURIComponent(req.path);
                if (requestPath === '/') requestPath = '';

                const fullPath = path.join(resolvedServePath, requestPath);

                // Prevent directory traversal
                if (!fullPath.startsWith(resolvedServePath)) {
                    return res.status(403).send('Access denied');
                }

                // Check if path exists
                try {
                    await fsPromises.access(fullPath);
                } catch {
                    return res.status(404).send('Path not found');
                }

                const stats = await fsPromises.stat(fullPath);

                // If it's a download request
                if (download) {
                    if (stats.isFile()) {
                        // Single file download
                        const filename = path.basename(fullPath);
                        res.setHeader('Content-Type', mime.lookup(fullPath) || 'application/octet-stream');
                        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeEncode(filename)}`);
                        return fs.createReadStream(fullPath).pipe(res);
                    } else {
                        // Directory download as tar
                        res.setHeader('Content-Type', 'application/x-tar');
                        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeEncode(path.basename(fullPath))}.tar`);

                        const pack = tar.pack();
                        const walker = walk.walk(fullPath);

                        walker.on('file', (root, stats, next) => {
                            const filePath = path.join(root, stats.name);
                            const relativePath = path.relative(fullPath, filePath);
                            const entry = pack.entry({name: relativePath, size: stats.size});
                            fs.createReadStream(filePath).pipe(entry).on('finish', next);
                        });

                        walker.on('end', () => pack.finalize());
                        pack.pipe(res);

                        req.on('close', () => {
                            pack.destroy();
                            walker.pause();
                        });
                        return;
                    }
                }

                // If it's a directory, show listing
                if (stats.isDirectory()) {
                    const files = await fsPromises.readdir(fullPath, {withFileTypes: true});
                    const items = await Promise.all(files.map(async (file) => {
                        const filePath = path.join(fullPath, file.name);
                        const stats = await fsPromises.stat(filePath);
                        return {
                            name: file.name,
                            isDirectory: file.isDirectory(),
                            size: formatFileSize(stats.size),
                            mtime: stats.mtime.toLocaleString()
                        };
                    }));

                    const parentPath = requestPath.split('/').slice(0, -1).join('/') || '/';

                    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>File Browser</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }
        .current-path {
            font-size: 1.2em;
            color: #333;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        th {
            background: #f8f9fa;
            font-weight: bold;
        }
        .icon {
            margin-right: 8px;
            color: #666;
        }
        .name-cell {
            display: flex;
            align-items: center;
        }
        a {
            color: #0066cc;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        .download-link {
            color: #666;
            padding: 4px 8px;
            border-radius: 4px;
        }
        .download-link:hover {
            background: #f0f0f0;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="current-path">
                ${requestPath || '/'} ${parentPath !== requestPath ?
                        `<a href="${parentPath}"><i class="fas fa-level-up-alt"></i> Up</a>` : ''}
            </div>
        </div>
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Modified</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                    <tr>
                        <td class="name-cell">
                            <i class="icon fas ${item.isDirectory ? 'fa-folder' : 'fa-file'}"></i>
                            <a href="${path.join(requestPath, item.name)}${item.isDirectory ? '' : '?download=true'}">
                                ${item.name}
                            </a>
                        </td>
                        <td>${item.size}</td>
                        <td>${item.mtime}</td>
                        <td>
                            <a href="${path.join(requestPath, item.name)}?download=true" 
                               class="download-link" 
                               title="Download">
                                <i class="fas fa-download"></i>
                            </a>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
                    return res.send(html);
                }

                // If it's a file, trigger download
                const filename = path.basename(fullPath);
                res.setHeader('Content-Type', mime.lookup(fullPath) || 'application/octet-stream');
                res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeEncode(filename)}`);
                fs.createReadStream(fullPath).pipe(res);

            } catch (err) {
                console.error(err);
                res.status(500).send('Server error');
            }
        });

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
            console.log(`Serving files from: ${resolvedServePath}`);
        });

    } catch (err) {
        console.error(`Error: Cannot access ${resolvedServePath}`);
        console.error(err);
        process.exit(1);
    }
}

// Start the server
validateAndStart();
