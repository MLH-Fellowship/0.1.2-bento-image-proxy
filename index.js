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
    console.debug(query);

    if (pathname.startsWith("/img")) {
        console.info("IMG response");
        const file = iMap[query.id];
        console.debug(file);
        const type = mime[path.extname(file).slice(1)] || 'text/plain';
        const s = fs.createReadStream(file);
        s.on('open', function () {
            res.setHeader('Content-Type', type);
            s.pipe(res);
        });
        s.on('error', function () {
            res.setHeader('Content-Type', 'text/plain');
            res.statusCode = 404;
            res.end('Not found');
        });

    }
    else if (pathname !== "/ws" && req.method.toLowerCase() === "post") {
        console.info("POST");
        const form = formidable();

        form.parse(req, (err, fields, files) => {
            const imgId = uuid();
            dashboards.forEach(ws => {
                iMap[imgId] = files.image.path;
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
    }
});

server.on('upgrade', function upgrade(request, socket, head) {
    const pathname = url.parse(request.url).pathname;

    if (pathname === '/ws') {
        console.info("Upgrading dashboard");
        wss1.handleUpgrade(request, socket, head, function done(ws) {
            wss1.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

server.listen(5012);
