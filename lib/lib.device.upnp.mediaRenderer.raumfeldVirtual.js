'use strict'; 
var UPNPMediaRendererRaumfeld = require('./lib.device.upnp.mediaRenderer.raumfeld');

/**
 * this is the class for a virtual media renderer
 */
module.exports = class UPNPMediaRendererRaumfeldVirtual extends UPNPMediaRendererRaumfeld
{
    constructor(_upnpClient)
    {
        super(_upnpClient);
    }
    
    
    roomName()
    {
        return this.name();
    }
    
    roomUdn()
    {
        return "";
    }
    
    
    updateRendererState()
    {
        // we do not call super() because we do not want to trigger the "rendereStateChanged" event before we done our child code
        // so we do have same code here as in the parent class
        for(var key in this.lastChangedAvTransportData) this.rendererState[key]=this.lastChangedAvTransportData[key];
        for(var key in this.lastChangedRenderingControlData) this.rendererState[key]=this.lastChangedRenderingControlData[key];
                 
        if(!("rooms" in this.rendererState))
            this.rendererState["rooms"] = new Map();
            
        // update the room transition states
        if("RoomStates" in this.rendererState)
        {
            var activeRooms = [];
            var roomInfos = this.rendererState["RoomStates"].split(",");
            for(var roomIdx=0; roomIdx<roomInfos.length; roomIdx++)
            {
                var roomInfo = roomInfos[roomIdx].split("=");
                var roomObject = this.createAndGetRoomObectInRendererState(roomInfo[0]);
                roomObject.roomUDN  = roomInfo[0];
                roomObject.volume   = roomInfo[1];                
                activeRooms.push(roomInfo[0]);
            }
            
            // if a room is not listed in the RoomVolumes key than it is not present anymore and has to be removed
            this.removeRoomsFromRoomState(activeRooms);
        }
         
        // update the room volumes in the room state
        if("RoomVolumes" in this.rendererState)
        {
            var activeRooms = [];
            var roomInfos = this.rendererState["RoomVolumes"].split(",");
            for(var roomIdx=0; roomIdx<roomInfos.length; roomIdx++)
            {
                var roomInfo = roomInfos[roomIdx].split("=");
                var roomObject = this.createAndGetRoomObectInRendererState(roomInfo[0]);
                roomObject.roomUDN  = roomInfo[0];
                roomObject.volume   = roomInfo[1];
                activeRooms.push(roomInfo[0]);
            }
            
            // if a room is not listed in the RoomVolumes key than it is not present anymore and has to be removed
            this.removeRoomsFromRoomState(activeRooms);
        }
        
        // update the room mute states in the room state
        if("RoomMutes" in this.rendererState)
        {
            var activeRooms = [];
            var roomInfos = this.rendererState["RoomMutes"].split(",");
            for(var roomIdx=0; roomIdx<roomInfos.length; roomIdx++)
            {
                var roomInfo = roomInfos[roomIdx].split("=");
                var roomObject = this.createAndGetRoomObectInRendererState(roomInfo[0]);
                roomObject.roomUDN  = roomInfo[0];
                roomObject.mute     = roomInfo[1];
                activeRooms.push(roomInfo[0]);
            }
            
            // if a room is not listed in the RoomVolumes key than it is not present anymore and has to be removed
            this.removeRoomsFromRoomState(activeRooms);
        }
        
        // update the online states of the rooms
        // TODO: @@@ for now set all to online
        for(var roomUdn in this.rendererState["rooms"])
        {
            var roomObject = this.createAndGetRoomObectInRendererState(roomUdn);
            roomObject.online =  true;
        }
        
        // update overall mute state of the renderer (mute, not mute, partial mute)
        var roomMuteCount = 0, roomCount = 0;
        for(var roomUdn in this.rendererState["rooms"])
        {
            if (this.rendererState["rooms"][roomUdn].online)
            {
                roomMuteCount += parseInt(this.rendererState["rooms"][roomUdn].mute);
                roomCount++;
            }
        }
       
        // set the room mute state (0=unmuted, 1=muted, 2=partial muted)
        this.rendererState.mute = 0
        if(roomMuteCount == roomCount)
            this.rendererState.mute = 1
        else if(roomMuteCount > 0)
            this.rendererState.mute = 2

        this.emit("rendererStateChanged", this.rendererState);
    }
    
    
    /**
     * adds a room object into the reansport state if not there and returns it
     * @param {String} room UDN
     */
    createAndGetRoomObectInRendererState(_roomUdn)
    {
        if(!this.rendererState["rooms"][_roomUdn])
            this.rendererState["rooms"][_roomUdn] = new Object();
        var roomObject = this.rendererState["rooms"][_roomUdn];
        return roomObject
    }
    
    
    /**
     * removes rooms which are not listed in the parameter from the room state object
     * @param {Array} a string array of active rooms
     */
    removeRoomsFromRoomState(_activeRooms)
    {
        this.logSilly("Remove inactive rooms from renderer state");
        var inactiveRooms = [];
        for(var roomUdn in this.rendererState["rooms"])
        {
            if(_activeRooms.indexOf(roomUdn) < 0)
            {
                this.logDebug("Found inactive room in renderer '" + this.name() + "' with udn: " + roomUdn);
                inactiveRooms.push(roomUdn);
            }
        }
        
        for(var i=0; i<inactiveRooms.length; i++)
        {
            this.logDebug("Deleting inactive room in renderer '" + this.name() + "' with udn: " + inactiveRooms[i]);
            delete this.rendererState["rooms"][inactiveRooms[i]];
        }
    }
    
    /**
     * returns the current mute for the room
     * @param {String} the room udn
     * @return {Promise} a promise with the mute state as result (0 or 1)
     */
    getRoomMute(_roomUDN)
    { 
        return this.callAction("RenderingControl", "GetRoomMute", {"Channel": "Master", "Room": _roomUDN}, function (_result){
                return _result.CurrentMute;
            });
    }
    
    
    /**
     * sets the current volume for the room
     * @param {String} the room udn
     * @param {String} the desired volume
     * @return {Promise} a promise with empt result
     */
    setRoomMute(_roomUDN, _mute)
    { 
        this.logDebug("Set room mute to " + _mute + " on room " + _roomUDN);
        return this.callAction("RenderingControl", "SetRoomMute", {"Room": _roomUDN, "DesiredMute": _mute});
    }
    
     /**
     * returns the current volume for the 
     * @param {String} the room udn
     * @return {Promise} a promise with the volume as result
     */
    getRoomVolume(_roomUDN)
    { 
        return this.callAction("RenderingControl", "GetRoomVolume", {"Channel": "Master", "Room": _roomUDN}, function (_result){
                return _result.CurrentVolume;
            });
    }
    
    /**
     * sets the current volume for the room
     * @param {String} the room udn
     * @param {String} the desired volume
     * @return {Promise} a promise with empt result
     */
    setRoomVolume(_roomUDN, _volume)
    { 
        this.logDebug("Set room volume to " + _volume + " on room " + _roomUDN);
        return this.callAction("RenderingControl", "SetRoomVolume", {"Room": _roomUDN, "DesiredVolume": _volume});
    }
    
    
    /**
     * returns the current media info for the device
     * @return {Promise} a promise with the media info as object
     */
    getMediaInfo()
    {
        return this.callAction("AVTransport", "GetMediaInfo", {"Channel": "Master"});
    }
    
    
    /**
     * starts the sleep timer for the renderer/zone
     * @params {integer} seconds until the zone will stop playing
     * @params {integer} seconds for the volume ramp (when volume will be decreased)
     * @return {Promise} a promise with no info
     */
    startSleepTimer(_secondsUntilSleep, _secondsForVolumeRamp)
    {
        this.logDebug("Start sleep timer with " + _secondsUntilSleep + " seconds on " + this.name());
        return this.callAction("AVTransport", "StartSleepTimer", {"SecondsUntilSleep": _secondsUntilSleep, "SecondsForVolumeRamp" : _secondsForVolumeRamp});
    }
    
    
    /**
     * Cancels the sleep timer
     * @return {Promise} a promise with the media info as object
     */
    cancelSleepTimer()
    {
        this.logDebug("Cancel Sleep Timer on " + this.name());
        return this.callAction("AVTransport", "CancelSleepTimer", {});
    }
    
    
    /**
     * get the state of the sleep timer
     * @return {Promise} a promise with the sleep timer state
     */
    getSleepTimerState()
    {
        return this.callAction("AVTransport", "GetSleepTimerState", {});
    }

    
    /**
     * starts a timer which will fade the room volume to a specific value
     * @return {Promise} a promise with nothing
     */
    fadeToRoomVolume()
    {
        // TODO: @@@
    }
    
      // BendAvTransportUri            
      // LikeCurrentTrack
      // UnlikeCurrentTrack
    
}