# qume-api
API Connector for QUME Crypto Exchange

    npm install qume-api

API wrapper for the [QUME REST API](https://docs.qume.io/#rest-api). Please refer to [this documentation](https://docs.qume.io) for all calls explained. Check out `sample.js` for lib usage.

This is a low level wrapper with zero dependencies focussed on speed:

- Disables Nagle's algorithm
- No complex code
- No third party libraries
- Allows you to pre compile your message (see below under low latency usage)\

## Usage

### Import and Initialization

    const QumeAPI = require("qume-api")

    const qumeClient = new Qume({
        apiKey: "--api-key--",
        apiSecret: "--api-secret--",
        passPhrase: "--pass-phrase--"
    })


### Standard usage

    const response = await qumeClient.request({
        method: "GET",
        path: "/wallets"
    })

### Low latency usage
This library allows you to prepare an API request draft before hand (doing all the heavy work) :

    const draft = qumeClient.createDraft({
        method: 'GET',
        path: '/wallets'
    });

    const data = await qumeClient.requestDraft(draft);

Note that this only works in scenarios where you can estimate what will happen or which scenarios might happen: You can create drafts for all of them and only end up sending one later.
