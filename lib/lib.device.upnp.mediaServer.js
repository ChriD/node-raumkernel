'use strict'; 
var UPNPDevice = require('./lib.device.base.upnp');

/**
 * this is the base class to use for child's which are media server devices
 */
module.exports = class UPNPMediaServer extends UPNPDevice
{
    constructor(_upnpClient)
    {
        super(_upnpClient);
    }
}