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
    
    parmSystemHost(_systemHost = this.systemHost)
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
            url: "http://" + this.systemHost + ":" + self.getSettings().raumfeldHostRequestPort.toString() + "/getZones",
            headers: {
                'updateId': _updateId
            }
        };
    
        this.logVerbose("Getting zone configuration information from http://" + this.systemHost + " with updateId: " + _updateId);
      
        Request(options, function (error, response, body) {
        
           if(error || !response)
            {
                self.logError("Error retrieving the zone configuration from " + self.systemHost + ": " + error);
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
        for (var zoneRootIdx=0; zoneRootIdx<this.zoneConfiguration.zoneConfig.zones.length; zoneRootIdx++)
        {
            var zoneArray = this.zoneConfiguration.zoneConfig.zones[zoneRootIdx].zone;
            for (var zoneIdx=0; zoneIdx<zoneArray.length; zoneIdx++)
            {
                // here we come each zone   
                var zoneObject = zoneArray[zoneIdx];                                
                for (var roomIdx=0; roomIdx<zoneObject.room.length; roomIdx++)
                {
                    var roomObject = zoneObject.room[roomIdx];
                    if(roomObject.$.name.toLowerCase() == _childUdnOrName.toLowerCase())
                    {
                        return zoneObject.$.udn;
                    }
                    for (var rendererIdx=0; rendererIdx<roomObject.renderer.length; rendererIdx++)
                    {
                        var rendererObject  = roomObject.renderer[rendererIdx];
                        if(rendererObject.$.udn == _childUdnOrName)
                        {
                            return zoneObject.$.udn;
                        }
                    }
                }
            }
        }
        return "";
    }
    
    
    getRoomNameForMediaRendererUDN(_udn)
    {     
        var roomObj = this.getRoomObjectFromMediaRendererUdnOrName(_udn);
        if(roomObj)
        {            
            return roomObj.$.name;
        }
        return "";
    }
    
    
    getRoomUdnForMediaRendererUDN(_udn)
    {     
        var roomObj = this.getRoomObjectFromMediaRendererUdnOrName(_udn);
        if(roomObj)
        {
            return roomObj.$.udn;
        }
        return "";
    }
    
    
    getRendererUdnsForRoomUdnOrName(_udnOrName)
    {
        var roomObj = this.getRoomObjectFromMediaRendererUdnOrName(_udnOrName);
        var rendererUDNs = [];        
        if(roomObj)
        {
            for (var rendererIdx=0; rendererIdx<roomObj.renderer.length; rendererIdx++)
            {
                rendererUDNs.push(roomObj.renderer[rendererIdx].$.udn);
            }
        }
        return rendererUDNs;
    }
    
    
    getRoomObjectFromMediaRendererUdnOrName(_udnOrName)
    {
        this.logDebug("Get room information object for: " + _udnOrName);

        if(this.zoneConfiguration)
        {        
            if(this.zoneConfiguration.zoneConfig)   
            {         
                // zones
                for (var zoneRootIdx=0; zoneRootIdx<this.zoneConfiguration.zoneConfig.zones.length; zoneRootIdx++)
                {
                    var zoneArray = this.zoneConfiguration.zoneConfig.zones[zoneRootIdx].zone;
                    for (var zoneIdx=0; zoneIdx<zoneArray.length; zoneIdx++)
                    {
                        // here we come each zone                
                        var zoneObject = zoneArray[zoneIdx];
                        //this.logDebug("Checking rooms in zone : " + zoneObject.udn);
                        for (var roomIdx=0; roomIdx<zoneObject.room.length; roomIdx++)
                        {
                            var roomObject = zoneObject.room[roomIdx];   
                            if(roomObject.$.udn == _udnOrName || roomObject.$.name.toLowerCase() == _udnOrName.toLowerCase())
                            {
                                //this.logDebug("Found room information for: " + roomObject.$.name);
                                return roomObject;
                            }
                            for (var rendererIdx=0; rendererIdx<roomObject.renderer.length; rendererIdx++)
                            {
                                var rendererObject  = roomObject.renderer[rendererIdx];
                                if(rendererObject.$.udn == _udnOrName || rendererObject.$.name.toLowerCase() == _udnOrName.toLowerCase())
                                {
                                    //this.logDebug("Found room information for: " + rendererObject.$.name);  
                                    return roomObject
                                }
                            }
                        }
                    }
                }
            
            
                // unassigned rooms
                if(this.zoneConfiguration.zoneConfig.unassignedRooms)
                {
                    for (var unassignedRootIdx=0; unassignedRootIdx<this.zoneConfiguration.zoneConfig.unassignedRooms.length; unassignedRootIdx++)
                    {
                        var unassignedArray = this.zoneConfiguration.zoneConfig.unassignedRooms[unassignedRootIdx].room;
                        for (var unassignedIdx=0; unassignedIdx<unassignedArray.length; unassignedIdx++)
                        {
                            // here we come each unassigned room                
                            var roomObject = unassignedArray[unassignedIdx];
                            if(roomObject.$.udn == _udnOrName || roomObject.$.name.toLowerCase() == _udnOrName.toLowerCase())
                            {
                                //this.logDebug("Found room information for: " + roomObject.$.name);
                                return roomObject;
                            }
                            for (var rendererIdx=0; rendererIdx<roomObject.renderer.length; rendererIdx++)
                            {
                                var rendererObject  = roomObject.renderer[rendererIdx];       
                                if(rendererObject.$.udn == _udnOrName || rendererObject.$.name.toLowerCase() == _udnOrName.toLowerCase())
                                {
                                    //this.logDebug("Found room information for: " + rendererObject.$.name);  
                                    return roomObject
                                }
                            }
                        }
                    }
                }
            }
        }
        return null;
    }
    
    
    connectRoomToZone(_roomUdn, _zoneUdn)
    {
        var self = this;
        
        return new Promise(function(_resolve, _reject){
        
            if(!self.systemHost)
            {   
                self.logError("Executing connectRoomToZone zone without a host!");
                _reject(new Error("Executing connectRoomToZone zone without a host!"));
            }
            
            var options = {                
                url: "http://" + self.systemHost + ":" + self.getSettings().raumfeldHostRequestPort.toString() + "/connectRoomToZone?roomUDN=" + _roomUdn + "&zoneUDN=" + _zoneUdn            
            };
        
            self.logVerbose("Connecting room " + _roomUdn + " to zone " + _zoneUdn);
          
            Request(options, function (error, response, body) {
            
                if(error || !response)
                {
                    self.logError("Error connectRoomToZone: " + error);                    
                    _reject(new Error("Error connectRoomToZone: " + error));
                }
                
                if (!error && response.statusCode == 200) 
                {
                    self.logDebug("ConnectRoomToZone request was successful'");
                    _resolve({});
                }
                else
                {
                    self.logError("Error connectRoomToZone: " + error);                    
                    _reject(new Error("Error connectRoomToZone: " + error));
                }
            });
        });
    }
    
    
    async dropRoomFromZone(_roomUdn)
    {
        var self = this;
        
        
        return new Promise(function(_resolve, _reject){
        
            if(!self.systemHost)
            {   
                self.logError("Executing dropRoomFromZone zone without a host!");
                _reject(new Error("Executing dropRoomFromZone zone without a host!"));
            }

            var options = {                
                url: "http://" + self.systemHost + ":" + self.getSettings().raumfeldHostRequestPort.toString() + "/dropRoomJob?roomUDN="+_roomUdn
            };
        
            self.logVerbose("Drop room " + _roomUdn + " from zone");
          
            Request(options, function (error, response, body) {
            
                if(error || !response)
                {
                    self.logError("Error dropRoomFromZone: " + error);
                    _reject(new Error("Error dropRoomFromZone: " + error));
                }
                
                if (!error && response.statusCode == 200) 
                {
                    self.logDebug("DropRoomFromZone request was successful'");
                    _resolve({});
                }
                else
                {
                    self.logError("Error dropRoomFromZone: " + error);
                    _reject(new Error("Error dropRoomFromZone: " + error));
                }
            });
        });
    }
    
    
}