'use strict'; 
var Url = require('url');
var ManagerBase = require('./lib.manager.base');


module.exports = class InfodataManager extends ManagerBase
{
    constructor()
    {
        super() 
        // this one holds combined data from zone and their renderers. This si good for external apps
        // who do not have to combine them by themselves
        this.combinedZoneState = this.createCombinedZoneStateObject()      
    }

    additionalLogIdentifier()
    {
        return "InfodataManager"
    }


    zoneConfigurationChanged(_zoneConfiguration)
    {
        this.updateCombinedZoneStateByZoneConfiguration(_zoneConfiguration)
    }


    rendererMediaItemDataChanged(_mediaRenderer, _currentMediaItemData)
    {        
        this.updateCombinedZoneStateByMediaRenderer(_mediaRenderer)
    }


    rendererStateKeyValueChanged(_mediaRenderer, _key, _oldValue, _newValue, _roomUdn)
    {        
    }


    rendererStateChanged( _mediaRenderer, _rendereState)
    {
        // we do update the combined data when some state of the media renderer changed
        // This is done very often and it would be better to use 'rendererStateKeyValueChanged' event and only do update
        // this values which have been changed, but for now we do copy all the renderer data into the combined state,
        // so we have to update it here! it should be no problem at all!
        this.updateCombinedZoneStateByMediaRenderer(_mediaRenderer)
    }


    mediaRendererRaumfeldVirtualAdded(_deviceUdn, _device)
    {
        this.updateCombinedZoneStateByMediaRenderer(_device)
    }


    createCombinedZoneStateObject()
    {
        this.combinedZoneState = new Object()
        this.combinedZoneState.zones = new Array()
        this.combinedZoneState.unassignedRooms = new Array()
    }


    updateCombinedZoneStateByZoneConfiguration(_zoneConfiguration)
    {
        var self = this
        var availableRooms = new Array()
        // for now always fully rebuild the state, we have to check if this will get us into performance problems 
        // but i think it will be okay!
        this.createCombinedZoneStateObject()
        
        // check if we have some zone objects which we may convert 
        if(_zoneConfiguration && _zoneConfiguration.zoneConfig && _zoneConfiguration.zoneConfig.zones)
        {           
            for (var zoneRootIdx=0; zoneRootIdx<_zoneConfiguration.zoneConfig.zones.length; zoneRootIdx++)
            {
                var zoneArray = _zoneConfiguration.zoneConfig.zones[zoneRootIdx].zone
                for (var zoneIdx=0; zoneIdx<zoneArray.length; zoneIdx++)
                {                 
                    var zoneObject = zoneArray[zoneIdx]
                    var combinedZone = new Object()
                    combinedZone.rooms = new Array()

                    var zoneName = ""

                    for (var roomIdx=0; roomIdx<zoneObject.room.length; roomIdx++)
                    {
                        var roomObject = zoneObject.room[roomIdx];  
                        var combinedRoom = this.combinedZoneStateObject_createRoom(roomObject)
                        combinedZone.rooms.push(combinedRoom)
                        availableRooms.push(combinedRoom)
                        
                        // generate a zone name which will consist of the room names
                        zoneName += zoneName ? ", " : ""
                        zoneName += combinedRoom.name
                    }
                    
                    combinedZone.udn    = zoneObject.$.udn
                    combinedZone.name   = zoneName
                    combinedZone.isZone = true
                    
                    // get the data from the linked renderer, it ,ay be that the rendere is not recognized by the kernel by now
                    // this method will be triggered an adding a renderer too!
                    this.addMediaRendererDataToObject(combinedZone, this.managerDisposer.deviceManager.getVirtualMediaRenderer(combinedZone.udn))
                    this.combinedZoneState.zones.push(combinedZone)
                }
               
            }           
        } 
                
        // create a zone for each unassigned room, thats good for GUI usage
        if(_zoneConfiguration && _zoneConfiguration.zoneConfig && _zoneConfiguration.zoneConfig.unassignedRooms)
        {           
            for (var roomRootIdx=0; roomRootIdx<_zoneConfiguration.zoneConfig.unassignedRooms.length; roomRootIdx++)            
            {
                var roomArray = _zoneConfiguration.zoneConfig.unassignedRooms[roomRootIdx].room
                for (var roomIdx=0; roomIdx<roomArray.length; roomIdx++)
                {                 
                    var roomObject = roomArray[roomIdx]
                                        
                    var combinedZone = new Object()
                    combinedZone.rooms = new Array()
                    var combinedRoom = this.combinedZoneStateObject_createRoom(roomObject)  
                    combinedZone.rooms.push(combinedRoom)                    
                    combinedZone.udn    = roomObject.$.udn
                    combinedZone.name   = roomObject.$.name
                    combinedZone.isZone = false                   

                    // we add those media infos here too, not sure if this is a good idea...
                    this.addMediaRendererDataToObject(combinedZone, this.managerDisposer.deviceManager.getMediaRenderer(combinedZone.udn))
                    this.combinedZoneState.zones.push(combinedZone)

                    // create a new object for the "unassigned" part, we do not want to use the "zone" object
                    var combinedRoomUR = this.combinedZoneStateObject_createRoom(roomObject) 
                    this.combinedZoneState.unassignedRooms.push(combinedRoomUR)
                    availableRooms.push(combinedRoomUR)
                }                                
            }        
        }

        this.combinedZoneState.availableRooms = availableRooms

        this.emit("combinedZoneStateChanged", this.combinedZoneState)        
    }

    combinedZoneStateObject_createRoom(_roomObject)
    {
        if(!_roomObject)
            return

        var combinedRoom = new Object()
        combinedRoom.renderers = new Array()                   
        
        for (var rendererIdx=0; rendererIdx<_roomObject.renderer.length; rendererIdx++)
        {
            var rendererObject  = _roomObject.renderer[rendererIdx]
            var combinedRenderer = new Object()
            combinedRenderer.udn    = rendererObject.$.udn
            combinedRenderer.name   = rendererObject.$.name
            combinedRoom.renderers.push(combinedRenderer)
        }
                                    
        combinedRoom.udn            = _roomObject.$.udn
        combinedRoom.name           = _roomObject.$.name
        combinedRoom.color          = _roomObject.$.color
        combinedRoom.powerState     = _roomObject.$.powerState
        
        return combinedRoom;
    }
    


    getCombinedZoneStateSubObjectFromUdn(_udn, _deepSearch = true)
    {
        // zones
        if(this.combinedZoneState && this.combinedZoneState.zones)
        {
            for(var i=0; i<this.combinedZoneState.zones.length; i++)
            {
                if(this.combinedZoneState.zones[i].udn == _udn)
                    return this.combinedZoneState.zones[i]
                
                if(this.combinedZoneState.zones[i].rooms && _deepSearch)
                {
                    for(var x=0; x<this.combinedZoneState.zones[i].rooms.length; x++)
                    {
                        if(this.combinedZoneState.zones[i].rooms[x].udn == _udn)
                            return this.combinedZoneState.zones[i].rooms[x]

                        if(this.combinedZoneState.zones[i].rooms[x].renderers)
                        {
                            for(var y=0; y<this.combinedZoneState.zones[i].rooms[x].renderers.length; y++)
                            {
                                if(this.combinedZoneState.zones[i].rooms[x].renderers[y].udn == _udn)
                                    return this.combinedZoneState.zones[i].rooms[x].renderers[y]
                            }
                        }
                    }
                }
            }
        }

        // unassigned rooms (in fact those udns may be found in the zones too)
        if(this.combinedZoneState && this.combinedZoneState.unassignedRooms)
        {
            for(var i=0; i<this.combinedZoneState.unassignedRooms.length; i++)
            {               
                if(this.combinedZoneState.unassignedRooms[i].udn == _udn)
                    return this.combinedZoneState.unassignedRooms[i]

                if(this.combinedZoneState.unassignedRooms[i].renderers)
                {
                    for(var y=0; y<this.combinedZoneState.unassignedRooms[i].renderers.length; y++)
                    {
                        if(this.combinedZoneState.unassignedRooms[i].renderers[y].udn == _udn)
                            return this.combinedZoneState.unassignedRooms[i].renderers[y]
                    }
                }             
            }
        }
    }


    updateCombinedZoneStateByMediaRenderer(_mediaRenderer)
    {
        var object = this.getCombinedZoneStateSubObjectFromUdn(_mediaRenderer.udn())
        if(!object)
            return            
        this.addMediaRendererDataToObject(object ,_mediaRenderer)
    }


    addMediaRendererDataToObject(_object, _mediaRenderer)
    {
        if(!_object || !_mediaRenderer)
            return   

        _object.mediaItem       = _mediaRenderer.currentMediaItemData
        _object.rendererState   = _mediaRenderer.rendererState
    }

    
}