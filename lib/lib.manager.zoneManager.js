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
        this.zoneConfigRequestStarted = false;
        this.lastUpdateId = "";
        // this map contains up to date data of current zone udn's with its room udns and name
        this.zoneMap = new Map();
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
        if(!this.zoneConfigRequestStarted)   
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
      
        this.zoneConfigRequestStarted = true;

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
        //this.zoneConfigRequestStarted = false
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
                self.updateZoneInformationMap();
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
    

    /**
     * update the internal map objct from the given xml json variant 
     * and do some trigger emitting
     */
    updateZoneInformationMap()
    {
        var self = this;

        // copy the current information into a temporary map for checking if a zone was added or removed
        var oldZoneMap = new Map(this.zoneMap);

        // clear the current zone map to beginn with empty data
        this.zoneMap.clear();
                 
        for (var zoneRootIdx=0; zoneRootIdx<this.zoneConfiguration.zoneConfig.zones.length; zoneRootIdx++)
        {
            var zoneArray = this.zoneConfiguration.zoneConfig.zones[zoneRootIdx].zone;
            for (var zoneIdx=0; zoneIdx<zoneArray.length; zoneIdx++)
            {
                var zoneObject = zoneArray[zoneIdx];

                // here we come each zone, so we can create our zone info object which will be inserted in the map
                var zoneMapObject = new Object();
                zoneMapObject.UDN = zoneObject.$.udn;
                zoneMapObject.rooms = new Map();
                       
                for (var roomIdx=0; roomIdx<zoneObject.room.length; roomIdx++)
                {
                    var roomObject = zoneObject.room[roomIdx];
                    // here we come each room in a zone and we can create the room Object and insert it to the zone object room map
                    var roomMapObject = this.createRoomMapObject(roomObject);
                    zoneMapObject.rooms.set(roomMapObject.UDN, roomMapObject);
                }
                
                this.zoneMap.set(zoneMapObject.UDN, zoneMapObject);

                // if the zone udn is not in the copied old map, it is a new created zone and we may have to 
                // trigger 'zoneCreated' if the linked device (zone renderer) has already appeared
                if(!oldZoneMap.has(zoneMapObject.UDN))
                {                    
                    this.triggerZoneCreated(zoneMapObject.UDN);
                }
            }
        }

        // handle unassigned rooms, we add them into "" (empty) map key       
        if(this.zoneConfiguration.zoneConfig.unassignedRooms)
        {
            
            var zoneMapObject = new Object();
            zoneMapObject.UDN = ""
            zoneMapObject.rooms = new Map(); 

            for (var unassignedRootIdx=0; unassignedRootIdx<this.zoneConfiguration.zoneConfig.unassignedRooms.length; unassignedRootIdx++)
            {
                var unassignedArray = this.zoneConfiguration.zoneConfig.unassignedRooms[unassignedRootIdx].room;
                for (var unassignedIdx=0; unassignedIdx<unassignedArray.length; unassignedIdx++)
                {
                    // here we come each unassigned room                
                    var roomObject = unassignedArray[unassignedIdx];
                    var roomMapObject = this.createRoomMapObject(roomObject);
                    zoneMapObject.rooms.set(roomMapObject.UDN, roomMapObject);
                }                
            }
            this.zoneMap.set(zoneMapObject.UDN, zoneMapObject);
        }

        // check if old map has some values the new created map does not have, then a zone was removed
        oldZoneMap.forEach(function(_value, _key, _map){
            if(!self.zoneMap.has(_key))
            {
                self.triggerZoneRemoved(zoneMapObject.UDN);
            }
        })              
    }


    createRoomMapObject(_roomObject)
    {
        var roomMapObject = new Object();
        roomMapObject.UDN = _roomObject.$.udn;
        roomMapObject.name = _roomObject.$.name;
        roomMapObject.color = _roomObject.$.color;
        roomMapObject.powerState = _roomObject.$.powerState;
        roomMapObject.renderers = new Map();
        
        for (var rendererIdx=0; rendererIdx<_roomObject.renderer.length; rendererIdx++)
        {
            var rendererObject  = _roomObject.renderer[rendererIdx];

            // here we came each renderer in the room (in normal cases there is only one renderer in a room)
            var rendererMapObject = new Object();
            rendererMapObject.UDN = rendererObject.$.udn ;
            rendererMapObject.name = rendererObject.$.name ;                       

            roomMapObject.renderers.set(rendererMapObject.UDN, rendererMapObject);
        }
        return roomMapObject;
    }


    triggerZoneCreated(_zoneUDN)
    {
        if(this.zoneMap.has(_zoneUDN))
        {
            var zoneMapObject = this.zoneMap.get(_zoneUDN);
            var zoneRenderer = this.managerDisposer.deviceManager.getVirtualMediaRenderer(_zoneUDN);
            if(zoneRenderer)
            {                        
                this.emit("zoneCreated", zoneMapObject.UDN, zoneMapObject);                
                if(zoneMapObject.rooms.size)
                {
                    var roomObject = zoneMapObject.rooms.values().next().value;
                    this.managerDisposer.triggerManager.trigger("zone", "zoneCreated", {    "zoneUDN": zoneMapObject.UDN,
                                                                                            "roomUDN": roomObject.UDN });
                }
            }
        }       
    }


    triggerZoneRemoved(_zoneUDN)
    {
        if(!this.zoneMap.has(_zoneUDN))
        {            
            var zoneRenderer = this.managerDisposer.deviceManager.getVirtualMediaRenderer(_zoneUDN);
            if(!zoneRenderer)
            {                        
                this.emit("zoneRemoved", _zoneUDN);                
                this.managerDisposer.triggerManager.trigger("zone", "zoneRemoved", {    "zoneUDN": _zoneUDN });
            }
        }   
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


    getRoomArrayFromVirtualMediaRenderer(_udn)
    {
        this.logDebug("Get room information objects for: " + _udn);

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
                        if(zoneObject.$.udn == _udn)
                            return zoneObject.room;                       
                    }
                }
            }
        }
        return null;
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
                    // TODO: create trigger and wait for appearance Wait for trigger to appear                               
                    if(_zoneUdn == "")
                    {
                        self.managerDisposer.triggerManager.setupTrigger("zone", "zoneCreated", { "roomUDN": _roomUdn}, true, function(_data){ 
                            self.logDebug("ConnectRoomToZone request was successful'");
                            resolve(_data);
                        });
                        // TODO: add timeout!!!
                    }
                    else
                    {                        
                        self.logDebug("ConnectRoomToZone request was successful'");
                        _resolve({});
                    }            
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