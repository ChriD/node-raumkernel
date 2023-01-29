'use strict';

// Use old GOT version because of ES6 imports
//import got from 'got';
//var got = require("got");
// npm install got@7.1.0

// use node-fetch old version --> version 2!!!! later switch to nodejs version if nodejs 18 is used in iobroker

module.exports = function Request(_requestOptions, _callback)
{ 
    let options = {};
    let request = got.get(_requestOptions.url, options);
    request.then((_response) => {
        _callback(false, _response, _response.body)
    }).catch((_error) => {
        _callback(true, err.response, err.response.body)
    });
    
    // response.statusCode
    // response.headers
}