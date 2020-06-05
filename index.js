const http = require("http");
const fs = require("fs");
const formidable = require("formidable");
const request = require("request");

http.createServer((req, res) => {
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
}).listen(5012);