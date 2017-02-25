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
        this.lastUpdateId = "";
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
        this.zoneConfigurationRequest();
    }
    
    stopDiscover()
    {
        this.abortZoneConfigurationRequest();
    }
    
    
    zoneConfigurationRequest(_updateId = "")
    {
        var self = this;
        if(!this.systemHost)
        {   
            this.logError("Requesting zone configuration without a host!");
            return;
        }

        var options = {
            // TODO: Port should be in a settings file
            url: "http://" + this.systemHost + ":" + "47365/getZones",
            headers: {
                'updateId': _updateId
            }
        };
    
        this.logVerbose("Getting zone configuration information from http://" + this.systemHost + " with updateId: " + _updateId);
      
        Request(options, function (error, response, body) {
        
           if(error || !response)
            {
                self.logError("Error retrieving the zone configuration from " + self.systemHost + ":" + error);
                // if we do not have any system host we jump out of the request loop.
                // That's okay because the request loop will be triggered again when host comes up again
                if (self.systemHost)
                    setTimeout(function(){self.zoneConfigurationRequest(responseUpdateId);}, 5000);
                return;
            }
            
            // get the updateId from the response for creating long polling request
            var responseUpdateId = response.headers['updateid'];
            if(!responseUpdateId)
                responseUpdateId = response.headers['updateId'];
            
            if (!error && response.statusCode == 200) 
            {
                self.logDebug("Zone configuration request returns with updateId: '" + responseUpdateId  + "'");
                self.zoneConfigurationChanged(body, responseUpdateId);
                // immediate reselection with a timer with the update id we got from the header
                setTimeout(function(){self.zoneConfigurationRequest(responseUpdateId);}, 10);
            }
            else
            {
                self.logError("Error retrieving the zone informations from " + this.systemHost);
                // if there is an error we retry the request after a while 
                setTimeout(function(){self.zoneConfigurationRequest(responseUpdateId);}, 5000);
            }
        });
    }
    
    abortZoneConfigurationRequest()
    {       
    }
    
    /**
     * this method is getting called when the zone configuration was changed 
     */
    zoneConfigurationChanged(_zoneConfigurationXML, _lastUpdateId)
    {
        var self = this;
        this.logVerbose("Zone configuration changed");
                       
        // parse the xml data into a "usable" js object and store this object at a class instance
        ParseString(_zoneConfigurationXML, function (err, result) {
            if(!err && result)
            {
                self.zoneConfiguration = result;
                self.lastUpdateId = _lastUpdateId;
                self.logDebug("Zone Configuration changed to: " + JSON.stringify(self.zoneConfiguration));
                self.emit("zoneConfigurationChanged", self.zoneConfiguration);
            }
            else
            {
                self.logError("Error parsing zone configuration result", { "xml": _zoneConfigurationXML } );
            }
        });
    }
    
    
    getVirtualRendererUdnForChildUdnOrName(_childUdnOrName)
    {        
        // run through zones and check the rooms udn/names in there
        for (var zoneIdx=0; i<self.zoneConfiguration.zones.length; zoneIdx++)
        {
            var zoneObject = self.zoneConfiguration.zones[zoneIdx];
            for (var roomIdx=0; roomIdx<zoneObject.room.length; roomIdx++)
            {
                var roomObject = zoneObject.room[roomIdx];
                if(roomObject.$.name.toLowerCase() == _childUdnOrName.toLowerCase())
                {
                    return zoneObject.$.udn;
                }
                for (var rendererIdx=0; roomObject.renderer.lenght; rendererIdx++)
                {
                    var rendererObject  = roomObject.renderer[rendererIdx];
                    if(rendererObject.$.udn == _childUdnOrName)
                    {
                        return zoneObject.$.udn;
                    }
                }
                
            }
        }
        return "";
    }
    
    
}