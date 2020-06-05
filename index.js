const http = require("http");
const fs = require("fs");
const formidable = require("formidable");
const request = require("request");
const WebSocket = require('ws');
const url = require('url');
const {uuid} = require("uuidv4");
const path = require("path");

const wss1 = new WebSocket.Server({ noServer: true });
const dashboards = [];

wss1.on('connection', function connection(ws) {
    console.debug("new connection");
    dashboards.push(ws);
});

const iMap = {};

const mime = {
    jpg: 'image/jpeg',
    png: 'image/png'
};

const server = http.createServer((req, res) => {
    const {pathname, query} = url.parse(req.url, true);

    if (pathname.startsWith("/img")) {
        const file = iMap[query.id];
        const type = mime[path.extname(file).slice(1)] || 'text/plain';
        const s = file.createReadStream(file);
        s.on('open', function () {
            res.setHeader('Content-Type', type);
            s.pipe(res);
        });
        s.on('error', function () {
            res.setHeader('Content-Type', 'text/plain');
            res.statusCode = 404;
            res.end('Not found');
        });
        return;
    }
    else if (req.method.toLowerCase() === "post") {
        const form = formidable();

        form.parse(req, (err, fields, files) => {
            const imgId = uuid();
            dashboards.forEach(ws => {
                ws.send(JSON.stringify({
                    image: `http://localhost:5012/img?id=${imgId}`,
                    type: "request"
                }));
            })
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
                dashboards.forEach(ws => {
                    ws.send(JSON.stringify({
                        outcome: JSON.parse(body),
                        type: "result"
                    }));
                })
                res.end(body);
            });
        });
        return;
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
