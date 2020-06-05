const http = require("http");
const fs = require("fs");
const formidable = require("formidable");
const request = require("request");
const WebSocket = require('ws');
const url = require('url');

const wss1 = new WebSocket.Server({ noServer: true });

wss1.on('connection', function connection(ws) {
    console.debug("new connection");
});

const server = http.createServer((req, res) => {
    if (req.method.toLowerCase() === "post") {
        const form = formidable();

        form.parse(req, (err, fields, files) => {
            const options = {
                uri: "http://localhost:5000/predict", /* Set url here. */
                body: fs.createReadStream(files.image.path),
                headers: {
                    'Content-Type': 'application/octet-stream'
                }
            };

            request.post(options, (error, response, body) => {
                if (error) {
                    console.log('Error: ', error);
                    return;
                }
                res.end(body);
            });
        });
    }
    res.statusCode = 404;
    res.end();
});

server.on('upgrade', function upgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname;

    if (pathname === '/ws') {
        wss1.handleUpgrade(request, socket, head, function done(ws) {
            wss1.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

server.listen(5012);