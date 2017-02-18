'use strict'; 
var ManagerBase = require('./lib.manager.base');
var SsdpClient = require("node-ssdp").Client;
var UpnpClient = require('upnp-device-client');


module.exports = class ZoneManager extends ManagerBase
{
    constructor()
    {
        super();
        this.systemHost = "";
    }

    additionalLogIdentifier()
    {
        return "ZoneManager";
    }
    
    parmSystemHost(_systemHost)
    {
        this.systemHost = _systemHost
        return this.systemHost;
    }
    
    discover()
    {
        // close requesting zone configuration
        this.stopDiscover();
        
        // restart requesting zone configuration
    }
    
    stopDiscover()
    {
    
    }
    
    
}