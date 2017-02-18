'use strict'; 
var UPNPMediaServer = require('./lib.device.upnp.mediaServer');

/**
 * this is the class which should be used for the raumfeld media server
 */
module.exports = class UPNPMediaServerRaumfeld extends UPNPMediaServer
{
    constructor(_upnpClient)
    {
        super(_upnpClient);
    }
}