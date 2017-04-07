'use strict'; 
var UPNPMediaRendererRaumfeld = require('./lib.device.upnp.mediaRenderer.raumfeld');
var Tools = require('./lib.tools');
var Fs = require('fs');

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
        // update the renderer state object
        this.updateRendererStateObject();
        
        // save the old "rooms" data to check later which values has changed        
        var oldRoomsData = null;
        
        if(!("rooms" in this.rendererState))
            this.rendererState["rooms"] = new Map();
        else
            oldRoomsData = JSON.parse(JSON.stringify(this.rendererState["rooms"]));
            
        // update the room transition states
        if("RoomStates" in this.rendererState)
        {
            var activeRooms = [];
            var roomInfos = this.rendererState["RoomStates"].split(",");
            for(var roomIdx=0; roomIdx<roomInfos.length; roomIdx++)
            {
                var roomInfo = roomInfos[roomIdx].split("=");
                var roomObject = this.createAndGetRoomObjectInRendererState(roomInfo[0]);
                roomObject.roomUDN  = roomInfo[0];
                roomObject.transportState = roomInfo[1];
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
                var roomObject = this.createAndGetRoomObjectInRendererState(roomInfo[0]);
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
                var roomObject = this.createAndGetRoomObjectInRendererState(roomInfo[0]);
                roomObject.roomUDN  = roomInfo[0];
                roomObject.mute     = roomInfo[1];
                activeRooms.push(roomInfo[0]);
            }
            
            // if a room is not listed in the RoomVolumes key than it is not present anymore and has to be removed
            this.removeRoomsFromRoomState(activeRooms);
        }
        
        this.updateRendererState_RoomOnlineState();  
        
        this.updateRendererState_MuteState();   

        // compare the new "rooms" data with the old one and emit changes
        // (removed rooms will not be emitted, only new added ones will be emitted with the value)
        this.emitRoomsDataChange(oldRoomsData, this.rendererState["rooms"]);

        // create a new update id for the render
        this.updateRandomUpdateId();
        
        this.emit("rendererStateChanged", this.rendererState);
    }
    
    
    emitRoomsDataChange(_oldRoomsData, _newRoomsData)
    {
        // run through the rooms in the new data
        for(var roomUdn in _newRoomsData)
        {
            var roomDataOld = _oldRoomsData ? _oldRoomsData[roomUdn] : null;
            var roomData    = _newRoomsData[roomUdn];
            for(var key in roomData)
            {
                if(!roomDataOld || roomDataOld[key] != roomData[key])
                {
                    this.logVerbose(key + " has changed from '" + (roomDataOld ? roomDataOld[key] : "") + "' to '" + roomData[key] + "' on room '" + roomUdn + "'");
                    this.emit("rendererStateKeyValueChanged", this, key, (roomDataOld ? roomDataOld[key] : null), roomData[key], roomUdn);
                }
            }
        }
    }
    
    
    /**
     * updates the room online state by checking if room renderers are online
     */
    updateRendererState_RoomOnlineState()
    {
        for(var roomUdn in this.rendererState["rooms"])
        {
            var roomObject = this.createAndGetRoomObjectInRendererState(roomUdn);
            var roomOnline = false;
            // get the renderer udns for the room udn (there may be more renderers in a room)
            var rendererUDNs = this.managerDisposer.zoneManager.getRendererUdnsForRoomUdnOrName(roomUdn);            
            if(rendererUDNs.length)
                roomOnline = true;
            for(var r=0; r<rendererUDNs.length; r++)
            {
                if(!this.managerDisposer.deviceManager.isRendererOnline(rendererUDNs[r]))
                    roomOnline = false;
            }
            this.logDebug("Room: " + roomObject.roomUDN + ": Set room renderer(s) " + JSON.stringify(rendererUDNs) + " online to :" + roomOnline.toString());
            roomObject.online = roomOnline;
        }
    }
    
    
    /**
     * updates the overall mute state of the room
     */
    updateRendererState_MuteState()
    {
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
    }
    
    
    /**
     * adds a room object into the reansport state if not there and returns it
     * @param {String} room UDN
     */
    createAndGetRoomObjectInRendererState(_roomUdn)
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
    async fadeToVolumeRoom(_roomUdn, _desiredVolume, _duration = 2000)
    {
        try
        {
            var self = this;
            
            // await the current volume from the renderer
            var currentVolume = await this.getRoomVolume(_roomUdn);
            
            // create a new promise so that our caller can block and knows when we are finished
            return new Promise(function(_resolve, _reject){
            
                try
                {
                    _desiredVolume = parseInt(_desiredVolume);
                    _duration = parseInt(_duration);
                    currentVolume = parseInt(currentVolume);
                    
                    var volDifference = (_desiredVolume - currentVolume);
                    var currentFadeVolume = currentVolume;
                    
                    // if there is no difference, the return
                    if(!volDifference)
                        _resolve({});
                    
                    // calculate the time in MS for one volume step
                    var timeForOneVolStep = _duration / Math.abs(volDifference);
                    
                    self.logDebug("Set fade to volume interval step to : " + timeForOneVolStep);
                    
                    // set an interval for the volume 1 step
                    var volStepInterval = setInterval(function(){
                            if(volDifference > 0)
                                currentFadeVolume += 1
                            if(volDifference < 0)
                                currentFadeVolume -= 1                        
                            self.setRoomVolume(_roomUdn, currentFadeVolume);
                            
                             // if the volume is reached stop the interval
                            if(currentFadeVolume == _desiredVolume || currentFadeVolume <= 0 || currentFadeVolume >= 100)
                            {
                                clearInterval(volStepInterval);
                                _resolve({});
                            }
                            
                        }, timeForOneVolStep);
                }
                catch(exception)
                {
                    self.logError("Error when fading volume on " + this.name() + " for room " + _roomUdn);
                   _reject(exception);
                }
            });

        }
        catch(_exception)
        {
            self.logError("Error when fading volume on " + this.name() + " for room " + _roomUdn);
            throw (_exception);
        }
    }
    
    
    /**
     * enter the standby mode of a room
     * @param {String} the UDN of the room which should go into standby mode
     * @return {Promise} a promise with no result
     */
    enterManualStandby(_roomUDN)
    { 
        return this.callAction("AVTransport", "EnterManualStandby", { "Room" : _roomUDN });
    }
    
    
    /**
     * enter the automatic standby mode of a room
     * @param {String} the UDN of the room which should go into standby mode
     * @return {Promise} a promise with no result
     */
    enterAutomaticStandby(_roomUDN)
    { 
        return this.callAction("AVTransport", "EnterAutomaticStandby", { "Room" :  _roomUDN });
    }
    
    
    /**
     * enter the standby mode of a room
     * @param {String} the UDN of the room which should go into standby mode
     * @return {Promise} a promise with no result
     */
    leaveStandby(_roomUDN)
    { 
        return this.callAction("AVTransport", "LeaveStandby", { "Room" : _roomUDN });
    }
    
    
    /**
     * bend the transport uri to a new one (keep current track playing)
     * @param {String} the transport uri
     * @param {String} the transport uri metadata
     * @return {Promise} a promise with no result
     */
    bendAvTransportUri(_transportUri, _transporUriMetadata)
    {
        return this.callAction("AVTransport", "BendAVTransportURI", {"CurrentURI": _transportUri, "CurrentURIMetaData": _transporUriMetadata});
    }
    
    
    /**
     * like the current track  
     * @return {Promise} a promise with no result
     */
    likeCurrentTrack()
    { 
        return this.callAction("AVTransport", "LikeCurrentTrack", {});
    }
    
    
    /**
     * like the current track  
     * @return {Promise} a promise with no result
     */
    unlikeCurrentTrack()
    { 
        return this.callAction("AVTransport", "UnlikeCurrentTrack", {});
    }
    
    
    /**
     * load a playlist into the renderer
     * @return {Promise} a promise with no result
     */
    loadPlaylist(_playlistId, _trackNumber = 1)
    {
        var self = this;
        self.logDebug("Load playlist '" + _playlistId + "' and set track number to: " + _trackNumber.toString());
        return new Promise(function(_resolve, _reject){
            self.stop().then(function(_data){
                self.loadContainer("0/Playlists/MyPlaylists/" + self.encodeString(_playlistId), "",  _trackNumber).then(function(_data){
                    _resolve(_data);
                }).catch(function(_data){
                    _reject(_data)
                });    
            }).catch(function(_data){
                _reject(_data)
            });
        });
        
    }
    
    
    /**
     * load a container id into the renderer
     * @return {Promise} a promise with no result
     */
    loadContainer(_containerId, _containerMetaData = "", _trackNumber = 1, _bend = false)
    {
        var self = this;
        this.logDebug("Load container '" + _containerId + "' and set track number to: " + _trackNumber.toString());            
        var mediaServer = self.managerDisposer.deviceManager.getRaumfeldMediaServer(); 
        if(!mediaServer)
            return this.noMediaServer("loadContainer");

        var uri = Tools.createAVTransportUriForContainer(mediaServer.udn(), _containerId, _trackNumber-1);
        if (_bend)
            return self.bendAvTransportUri(uri, _containerMetaData);
        else
            return self.setAvTransportUri(uri, _containerMetaData);     
    }
    
    
    /**
     * load single id into the renderer
     * @return {Promise} a promise with no result
     */
    loadSingle(_singleId, _singleMetaData = "", _bend = false)
    {
        var self = this;        
        var mediaServer = self.managerDisposer.deviceManager.getRaumfeldMediaServer(); 
        if(!mediaServer)
            return this.noMediaServer("loadSingle");

        var uri = Tools.createAVTransportUriForSingle(mediaServer.udn(), _singleId);
        if(_bend)
            return self.bendAvTransportUri(uri, _singleMetaData);
        else
            return self.setAvTransportUri(uri, _singleMetaData);
    }
    
    
    /**
     * load a uri id into the renderer
     * @return {Promise} a promise with no result
     */
    loadUri(_uri, _bend = false)
    {
        var self = this;

        // load the dummy template for the given uri. We assume that it is a radio stream and the good thing is,
        // that if its really a radio stream, the RF host will nicely  get the current played title aso...
        var data = Fs.readFileSync("lib/setUriMetadata.template");        

        if(_bend)
            return self.bendAvTransportUri(_uri, data);
        else
            return self.setAvTransportUri(_uri, data);
    }    
    
    
    /**
     * load a container id into the renderer
     * @return {Promise} a promise with no result
     */
    loadShuffle(_shuffleContainerId, _shuffleSelection, _bend = false)
    {
        var self = this;            
            
        var mediaServer = self.managerDisposer.deviceManager.getRaumfeldMediaServer(); 
        if(!mediaServer) 
            return self.noMediaServer("loadShuffle");
    
        return new Promise(function(_resolve, _reject){

            mediaServer.shuffle(_shuffleContainerId, _shuffleSelection).then(function(_data){
                if(_data.PlaylistID)
                {
                    return self.loadContainer(_data.PlaylistID, _data.PlaylistMetadata, 1, _bend).then(function(_data){_resolve(_data)}).catch(function(_data){_reject(_data)});  
                }
                else  
                {
                    _reject(new Error("Error creating a shuffle for container '" + _shuffleContainerId + "' and selection '" + _shuffleSelection + "'", _data));
                }
            }).catch(function(_data){
                _reject(new Error("Error creating a shuffle for container '" + _shuffleContainerId + "' and selection '" + _shuffleSelection + "'", _data));                 
            });       
        });
    }
    

    /**
     * only a little helper for error return
     * @return {Promise} a promise
     */
    noMediaServer(_methodName)
    {
        this.logError("Calling " + _methodName + " renderer without a valid media server!");                    
        return Promise.reject(new Error("Calling " + _methodName + " on renderer without a valid media server!")); 
    }
    
    
}