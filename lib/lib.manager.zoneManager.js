'use strict'; 
var ManagerBase = require('./lib.manager.base');
var SsdpClient = require("node-ssdp").Client;
var UpnpClient = require('upnp-device-client');
var Request = require('request');
var ParseString = require('xml2js').parseString;


module.exports = class ZoneManager extends ManagerBase
{
    constructor()
    {
        super();
        this.systemHost = "";
        this.zoneConfiguration = null;
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
        this.zoneConficurationRequest();
    }
    
    stopDiscover()
    {
        this.abortZoneConficurationRequest();
    }
    
    
    zoneConficurationRequest(_updateId = "")
    {
        var self = this;
        if(!this.systemHost)
        {   
            this.logError("Requesting zones without a host!");
            return;
        }

        
        var options = {
            url: "http://" + this.systemHost + ":" + "47365/getZones",
            headers: {
                'updateId': _updateId
            }
        };
    
        this.logVerbose("Getting zone configuration information from http://" + this.systemHost + " with updateId: " + _updateId);
      
        // TODO: Port should be in a settings file
        //request("http://" + this.systemHost + ":" + "47365/getZones", function (error, response, body) {
        Request(options, function (error, response, body) {
            // get the updateId from the response for creating long polling request
            var responseUpdateId = response.headers['updateid'];
            if(!responseUpdateId)
                responseUpdateId = response.headers['updateId'];
            
            if (!error && response.statusCode == 200) 
            {
                self.logDebug("Zone configuration changed request returns with updateId: '" + responseUpdateId  + "'");
                self.zoneConficurationChanged(body);
                // immediate reselection with a timer with the update id we got from the header
                setTimeout(function(){self.zoneConficurationRequest(responseUpdateId);}, 10);
            }
            else
            {
                self.logError("Error retrieving the zone informations from " + this.systemHost);
                // if there is an error we retry the request after a while 
                setTimeout(function(){self.zoneConficurationRequest(responseUpdateId);}, 5000);
            }
        });
    }
    
    abortZoneConficurationRequest()
    {
        if(this.currentZoneConfigurationRequest)
        {
            this.currentZoneConfigurationRequest.abort();
            this.currentZoneConfigurationRequest = null;
        }
    }
    
    /**
     * this method is getting called when the zone configuration was changed 
     */
    zoneConficurationChanged(_zoneConfiguration)
    {
        var self = this;
        this.logVerbose("Zone configuration changed");
                       
        // parse the xml data into a "usable" js object and store this object at a class instance
        ParseString(_zoneConfiguration, function (err, result) {
            if(!err && result)
            {
                self.zoneConfiguration = result;
                self.emit("zoneConfigurationChanged", self.zoneConfiguration);
            }
            else
            {
                self.logError("Error parsing zone Configuration file", { "xml": _zoneConfiguration } );
            }
        });
    }
    
    
}