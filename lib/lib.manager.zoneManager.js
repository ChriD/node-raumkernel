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
        super()
        this.systemHost = ""
        this.zoneConfiguration = null
        this.zoneConfigRequestStarted = false
        this.zoneConfigRequestObject = null
        this.lastUpdateId = ""
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
    
    requestZones()
    {
        // close requesting zone configuration
        this.stopRequestZones();
        
        // restart requesting zone configuration            
        if(!this.zoneConfigRequestStarted)   
            this.zoneConfigurationRequest();
    }
    
    stopRequestZones()
    {
        this.abortZoneConfigurationRequest()
        this.zoneConfigRequestStarted = false
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
      
        // be sure only one device request is pending    
        this.abortZoneConfigurationRequest()

        this.zoneConfigRequestStarted = true;
        this.zoneConfigRequestObject = Request(options, function (error, response, body) {
        
           if(error || !response)
            {
                self.logError("Error retrieving the zone configuration from " + self.systemHost + ": " + error);                
                // if we do not have any system host we stop the request on error (we do not send it anymore)                
                // That's okay because the request loop will be triggered again when host comes up again
                if (!self.systemHost | !response)
                {
                    self.zoneConfigRequestStarted = false
                    return
                }
                //all other errors which are not created by host removement should try to request again!
                setTimeout(function(){self.zoneConfigurationRequest("")}, 5000)                 
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
        if(this.zoneConfigRequestObject)
            this.zoneConfigRequestObject.abort()
        this.zoneConfigRequestStarted = false
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
                 
        if(this.zoneConfiguration.zoneConfig.zones)
        {
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

                    // try to find the zone renderer and tell him to update his room array with the 
                    // new room data (standby rooms may not appear in the renderer infos)     
                    // we do fully update the renderer state               
                    var zoneRenderer = this.managerDisposer.deviceManager.getVirtualMediaRenderer(zoneMapObject.UDN)
                    if(zoneRenderer)
                        zoneRenderer.updateRendererState()
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
                // roomRemovedFromZone for all rooms in the old zone is done in the trigger itself!                
                self.triggerZoneRemoved(_value.UDN);            
            }
        });

        // check if new map hase vom values old map does not have, then a zone was created
        self.zoneMap.forEach(function(_value, _key, _map){
            if(!oldZoneMap.has(_key))
            {
                // trigger roomAddedToZone for all rooms in the old zone is done in the trigger itself!
                self.triggerZoneCreated(_value.UDN);                
            }
        });

        // now check the euqal zones and trigger the room changes
        self.zoneMap.forEach(function(_value, _key, _map){
            if(oldZoneMap.has(_key))
            {
                // run through the rooms in current zone data and check if there are some which are not 
                // in the old zone. Then they where added
                self.zoneMap.get(_key).rooms.forEach(function(_valueRoom, _keyRoom, _mapRoom){
                    if (!oldZoneMap.get(_key).rooms.has(_valueRoom.UDN))                    
                        self.triggerRoomAddedToZone(_value.UDN, _valueRoom.UDN)                    
                });

                // run through the old rooms and check if there are some which are not 
                // in the actual zone data. Then they had been removed
                oldZoneMap.get(_key).rooms.forEach(function(_valueRoom, _keyRoom, _mapRoom){
                    if (!self.zoneMap.get(_key).rooms.has(_valueRoom.UDN))                    
                        self.triggerRoomRemovedFromZone(_value.UDN, _valueRoom.UDN)                    
                });
            }
        });

    }


    createRoomMapObject(_roomObject)
    {
        var roomMapObject = new Object();
        roomMapObject.UDN = _roomObject.$.udn;
        roomMapObject.name = _roomObject.$.name;
        roomMapObject.color = _roomObject.$.color;
        roomMapObject.PowerState = _roomObject.$.powerState;
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
        var self = this;
        if(this.zoneMap.has(_zoneUDN))
        {
            var zoneMapObject = this.zoneMap.get(_zoneUDN);
            var zoneRenderer = this.managerDisposer.deviceManager.getVirtualMediaRenderer(_zoneUDN);
            if(zoneRenderer)
            {                        
                this.emit("zoneCreated", zoneMapObject.UDN);                
                if(zoneMapObject.rooms.size)
                {
                    var roomObject = zoneMapObject.rooms.values().next().value; 
                    //this.managerDisposer.triggerManager.trigger("zone", "zoneCreated", {     "zoneUDN": zoneMapObject.UDN,
                    //                                                                         "roomUDN": roomObject.UDN });   
                    this.managerDisposer.triggerManager.trigger("zone", "zoneCreated", {    "roomUDN": roomObject.UDN });                                                                                                   
                    // after triggering the zone created trigger we can trigger the room added triggers
                    zoneMapObject.rooms.forEach(function(_valueRoom, _keyRoom, _mapRoom){
                        self.triggerRoomAddedToZone(zoneMapObject.UDN, _valueRoom.UDN)
                    });
                }
            }
        }       
    }


    triggerZoneRemoved(_zoneUDN)
    {
        var self = this;
        if(!this.zoneMap.has(_zoneUDN))
        {            
            var zoneRenderer = self.managerDisposer.deviceManager.getVirtualMediaRenderer(_zoneUDN);
            if(!zoneRenderer)
            {     
                // TODO: we don't have the old data here                   
                // before triggering the zone removed trigger we can trigger the room removed triggers
                //zoneMapObject.rooms.forEach(function(_valueRoom, _keyRoom, _mapRoom){
                //    self.triggerRoomRemovedFromZone(zoneMapObject.UDN, _valueRoom.UDN)
                //});

                // do not trigger 'unassigned' zone
                if(_zoneUDN)
                {
                    this.emit("zoneRemoved", _zoneUDN);                
                    this.managerDisposer.triggerManager.trigger("zone", "zoneRemoved", {    "zoneUDN": _zoneUDN });
                }
            }
        }   
    }


    triggerRoomAddedToZone(_zoneUDN, _roomUDN)
    {
        // do not trigger 'unassigned' zone
        if(_zoneUDN)
        {
            this.emit("roomAddedToZone", _zoneUDN, _roomUDN);                
            this.managerDisposer.triggerManager.trigger("zone", "roomAddedToZone", {    "zoneUDN": _zoneUDN,
                                                                                        "roomUDN": _roomUDN });
        }
    }


    
    triggerRoomRemovedFromZone(_zoneUDN, _roomUDN)
    {
        // do not trigger 'unassigned' zone
        if(_zoneUDN)
        {
            this.emit("roomRemovedFromZone", _zoneUDN, _roomUDN);                
            this.managerDisposer.triggerManager.trigger("zone", "roomRemovedFromZone", {    "zoneUDN": _zoneUDN,
                                                                                            "roomUDN": _roomUDN });
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
                    this.logSilly(roomObject.$.name.toLowerCase() + " = " +  _childUdnOrName.toLowerCase())
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
                if(this.zoneConfiguration.zoneConfig.zones)
                {
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
                                if(roomObject.$.udn == _udnOrName || roomObject.$.name.toLowerCase() == _udnOrName.toLowerCase())
                                {                                
                                    return roomObject;
                                }
                                for (var rendererIdx=0; rendererIdx<roomObject.renderer.length; rendererIdx++)
                                {
                                    var rendererObject  = roomObject.renderer[rendererIdx];
                                    if(rendererObject.$.udn == _udnOrName || rendererObject.$.name.toLowerCase() == _udnOrName.toLowerCase())
                                    {                                    
                                        return roomObject
                                    }
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
                                return roomObject;
                            }
                            for (var rendererIdx=0; rendererIdx<roomObject.renderer.length; rendererIdx++)
                            {
                                var rendererObject  = roomObject.renderer[rendererIdx];       
                                if(rendererObject.$.udn == _udnOrName || rendererObject.$.name.toLowerCase() == _udnOrName.toLowerCase())
                                {                                    
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
    
    
    connectRoomToZone(_roomUDN, _zoneUDN, _confirm = false)
    {
        var self = this;
        var timeoutId = 0;
        
        return new Promise(function(_resolve, _reject){
        
            if(!self.systemHost)
            {   
                self.logError("Executing connectRoomToZone zone without a host!");
                _reject(new Error("Executing connectRoomToZone zone without a host!"));
            }
            
            var options = {                
                url: "http://" + self.systemHost + ":" + self.getSettings().raumfeldHostRequestPort.toString() + "/connectRoomToZone?roomUDN=" + _roomUDN + "&zoneUDN=" + _zoneUDN            
            };
        
            self.logVerbose("Connecting room " + _roomUDN + " to zone " + _zoneUDN);

            var zoneUDN = self.getZoneUDNFromRoomUDN(_roomUDN);
            if(zoneUDN == _zoneUDN && _zoneUDN)
            {
                self.logVerbose("Room " + _roomUDN + " is already in zone " + _zoneUDN);
                _resolve({});
                return;
            }
          
            Request(options, function (error, response, body) {
            
                if(error || !response)
                {
                    self.logError("Error connectRoomToZone: " + error);                    
                    _reject(new Error("Error connectRoomToZone: " + error));
                }
                
                if (!error && response.statusCode == 200) 
                {                   
                    if(_confirm)
                    {
                        // we do a add a timeout to be sure the method will at least reject if the trigger is not triggered
                        timeoutId = setTimeout(function() {
                            _reject(new Error("ConnectRoomToZone trigger was not triggered in a valid time!"));
                        }, self.getSettings().zoneTriggerConfirmationTimout);

                        // if the zoneUDN is empty, we are creating a new zone from the room. To check when the zone is ready
                        // we use a trigger to check when the zone renderer is appeared and the zone configuration has changed
                        if(_zoneUDN == "")
                        {
                            self.managerDisposer.triggerManager.setupTrigger("zone", "zoneCreated", { "roomUDN": _roomUDN}, true, function(_data){ 
                                // clear the timeout if the trigger returned in a valid time
                                if(timeoutId) 
                                    clearTimeout(timeoutId);
                                self.logDebug("ConnectRoomToZone request was successful'");
                                _resolve(_data);
                            });                            
                        }
                        // if we do have a zone id we are adding a room to a zone, in this case no zone is beeing created and we 
                        // do have to trigger if the room was attached to the zone. No renderer will be created so only the zone
                        // configuration state will tell us the change
                        else
                        {
                             self.managerDisposer.triggerManager.setupTrigger("zone", "roomAddedToZone", { "zoneUDN": _zoneUDN, "roomUDN": _roomUDN}, true, function(_data){ 
                                // clear the timeout if the trigger returned in a valid time
                                if(timeoutId) 
                                    clearTimeout(timeoutId);
                                self.logDebug("ConnectRoomToZone request was successful'");
                                _resolve(_data);
                            });  
                        }
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
    
    
    async dropRoomFromZone(_roomUDN, _confirm = false)
    {
        var self = this;
        var timeoutId = 0;
        var zoneUDN = "";
        
        return new Promise(function(_resolve, _reject){
        
            if(!self.systemHost)
            {   
                self.logError("Executing dropRoomFromZone zone without a host!");
                _reject(new Error("Executing dropRoomFromZone zone without a host!"));
            }            

            var options = {                
                url: "http://" + self.systemHost + ":" + self.getSettings().raumfeldHostRequestPort.toString() + "/dropRoomJob?roomUDN="+_roomUDN
            };

            zoneUDN = self.getZoneUDNFromRoomUDN(_roomUDN);
            if(!zoneUDN)
            {
                self.logVerbose("Room " + _roomUDN + " is in no zone!");
                _resolve({});
                return;
            }
        
            self.logVerbose("Drop room " + _roomUDN + " from zone");            
          
            Request(options, function (error, response, body) {
            
                if(error || !response)
                {
                    self.logError("Error dropRoomFromZone: " + error);
                    _reject(new Error("Error dropRoomFromZone: " + error));
                }
                
                if (!error && response.statusCode == 200) 
                {
                    if(_confirm)
                    {
                        // we do a add a timeout to be sure the method will at least reject if the trigger is not triggered
                        timeoutId = setTimeout(function() {
                            _reject(new Error("DropRoomFromZone trigger was not triggered in a valid time!"));
                        }, self.getSettings().zoneTriggerConfirmationTimout);
                       
                        // if there is only one room in the zone we have to listen to "zoneRemoved"" trigger
                        if(self.getRoomCountForZoneUDN(zoneUDN) > 1)
                        {                        
                            self.managerDisposer.triggerManager.setupTrigger("zone", "roomRemovedFromZone", { "zoneUDN": zoneUDN, "roomUDN": _roomUDN}, true, function(_data){ 
                                // clear the timeout if the trigger returned in a valid time
                                if(timeoutId) 
                                    clearTimeout(timeoutId);
                                self.logDebug("DropRoomFromZone request was successful'");
                                _resolve(_data);
                            }); 
                        }
                        else
                        {     
                            self.managerDisposer.triggerManager.setupTrigger("zone", "zoneRemoved", { "zoneUDN": zoneUDN }, true, function(_data){ 
                                // clear the timeout if the trigger returned in a valid time
                                if(timeoutId) 
                                    clearTimeout(timeoutId);
                                self.logDebug("DropRoomFromZone request was successful'");
                                _resolve(_data);      
                            });              
                        }
                    }
                    else
                    {
                        self.logDebug("DropRoomFromZone request was successful'");
                        _resolve({});
                    }
                }
                else
                {
                    self.logError("Error dropRoomFromZone: " + error);
                    _reject(new Error("Error dropRoomFromZone: " + error));
                }
            });
        });
    }


    getZoneUDNFromRoomUDN(_roomUDN)
    {
        if(_roomUDN == "")
            return "";

        for (var value of this.zoneMap.values()) {
            if(value.rooms.has(_roomUDN))
                return value.UDN;   
        }
        return "";
    }


    getRoomCountForZoneUDN(_zoneUDN)
    {        
        if(_zoneUDN == "")
            return 0;

        if(!this.zoneMap.has(_zoneUDN))
            return 0;
        
        return this.zoneMap.get(_zoneUDN).rooms.size;    
    }
    
    
}