const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');
const { METHODS } = require('http');
const version = require('./package.json').version;
const name = require('./package.json').name;

const USER_AGENT = `${name}@${version}`;

class QumeAPI {
    constructor(config) {
        this.ua = USER_AGENT;
        this.timeout = 90 * 1000;
        this.host = "api.qume.io";
        this.agent = new https.Agent({
            keepAlive: true,
            timeout: 90 * 1000,
            keepAliveMsecs: 1000 * 60
        });

        if (!config) {
            return;
        }

        if (config.apiKey && config.apiSecret && config.passPhrase) {
            this.apiKey = config.apiKey;
            this.apiSecret = config.apiSecret;
            this.passPhrase = config.passPhrase
        }

        if (config.timeout) {
            this.timeout = config.timeout;
        }

        if (config.host) {
            this.host = config.host
        }
        if (config.userAgent) {
            this.ua += ' | ' + config.userAgent;
        }
    }

    // this fn can easily take more than 0.15ms due to heavy crypto functions
    // if your application is _very_ latency sensitive prepare the drafts
    // before you realize you want to send them.
    createDraft({ path, method, data, timeout }) {
        if (!timeout) {
            timeout = this.timeout;
        }
        method = method.toUpperCase()
        path = '/v1.1' + path;

        let payload = '';
        if (method === 'GET' && data) {
            path += '?' + querystring.stringify(data);
        } else if (method === 'DELETE' && typeof data === 'number') {
            path += data;
        } else if (data) {
            payload = JSON.stringify(data);
        }

        const timestamp = + new Date;

        const signature = crypto.createHmac('sha256', this.apiSecret)
            .update(`${payload}${timestamp}${method}${path}`).digest('hex');

        const options = {
            host: this.host,
            path: path,
            method,
            agent: this.agent,
            headers: {
                'User-Agent': this.ua,
                'content-type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                "X-QUME-SIGNATURE": signature,
                "X-QUME-TIMESTAMP": timestamp,
                "X-QUME-API-KEY": this.apiKey,
                "X-QUME-PASSPHRASE": this.passPhrase,
            },
            timeout,
            payload
        };
        return options;
    }

    // a draft is an option object created (potentially previously) with createDraft
    requestDraft(draft) {
        return new Promise((resolve, reject) => {
            const req = https.request(draft, res => {
                res.setEncoding('utf8');
                let buffer = '';
                res.on('data', function (data) {
                    buffer += data;
                });
                res.on('end', function () {
                    if (res.statusCode >= 300) {
                        let message;
                        let data;

                        try {
                            data = JSON.parse(buffer);
                            message = data
                        } catch (e) {
                            message = buffer;
                        }

                        console.error('ERROR!', res.statusCode, message);
                        const error = new Error(message.error)
                        error.statusCode = res.statusCode;
                        return reject(error);
                    }

                    let data;
                    try {
                        data = JSON.parse(buffer);
                    } catch (err) {
                        console.error('JSON ERROR!', buffer);
                        return reject(new Error('Json error'));
                    }

                    resolve(data);
                });
            });

            req.on('error', err => {
                reject(err);
            });

            req.on('socket', socket => {
                if (socket.connecting) {
                    socket.setNoDelay(true);
                    socket.setTimeout(draft.timeout);
                    socket.on('timeout', function () {
                        req.abort();
                    });
                }
            });

            req.end(draft.payload);
        });
    }
    request(props) {
        return this.requestDraft(this.createDraft(props));
    }
};

module.exports = QumeAPI;