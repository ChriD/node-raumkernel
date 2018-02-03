'use strict'; 
var UPNPMediaRenderer = require('./lib.device.upnp.mediaRenderer');

/**
 * this is the class for a virtual media renderer
 */
module.exports = class UPNPMediaRendererRaumfeld extends UPNPMediaRenderer
{
    constructor(_upnpClient)
    {
        super(_upnpClient);
    }
    
    
    roomName()
    {
        // the room name is given in the zone configuration file, so every time we want to have the room name
        // we have to look up there. There is no other way of getting the room name
        return this.managerDisposer.zoneManager.getRoomNameForMediaRendererUDN(this.udn());        
    }
    
    roomUdn()
    {
        return this.managerDisposer.zoneManager.getRoomUdnForMediaRendererUDN(this.udn());
    }
    
    
    isRaumfeldRenderer()
    {
        return true;
    }
    
    /**
     * starts a timer which will fade the renderer volume to a specific value     
     * @return {Promise} a promise with nothing
     */
    async fadeToVolume(_desiredVolume, _duration = 2000)
    {
    
        try
        {
            var self = this;
            
            // await the current volume from the renderer
            var currentVolume = await this.getVolume();
            
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
                            self.setVolume(currentFadeVolume);
                            
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
                    self.logError("Error when fading volume on " + this.name());
                   _reject(exception);
                }
            });
        }
        catch(_exception)
        {
            this.logError("Error when fading volume on " + this.name());
            throw (_exception);
        }
    }

     
    /**
     * enter the standby mode of a room
     * @param {String} the UDN of the room which should go into standby mode
     * @return {Promise} a promise with no result
     */
    enterManualStandby()
    { 
        return this.callAction("AVTransport", "EnterManualStandby", {});
    }
    
    
    /**
     * enter the automatic standby mode of a room
     * @param {String} the UDN of the room which should go into standby mode
     * @return {Promise} a promise with no result
     */
    enterAutomaticStandby()
    { 
        return this.callAction("AVTransport", "EnterAutomaticStandby", {});
    }
    
    
    /**
     * enter the standby mode of a room
     * @param {String} the UDN of the room which should go into standby mode
     * @return {Promise} a promise with no result
     */
    leaveStandby(_confirm = false)
    {         
        //return this.callAction("AVTransport", "LeaveStandby", {});
        return this.callActionWithTriggerWait("AVTransport", "LeaveStandby", {}, null, { "key" : "PowerState", "values" : ["ACTIVE", "IDLE"] } , _confirm)                
    }
       
    
    /**
     * change the current volume for the renderer (for the full zone)
     * @param {Integer} the desired volume
     * @return {Promise} a promise with no result
     */
    changeVolume(_amount)
    { 
        return this.callAction("RenderingControl", "ChangeVolume", {"Amount": _amount});
    }
    
    
    /**
     * change the current volume for the renderer (for the full zone)
     * @param {String} the sound id (Failure, Success)
     * @return {Promise} a promise with no result
     */
    playSystemSound(_soundId)
    { 
        return this.callAction("RenderingControl", "PlaySystemSound", {"Sound": _soundId});
    }
    
    
    /**
     * returns the lineIns Stream url     
     * @return {Promise} a promise with url and mimetype
     */
    getLineInStream()
    { 
        return this.callAction("RenderingControl", "GetLineInStreamURL", {});
    }
    
    
    /**
     * sets the equalizer values   
     * @return {Promise} a promise with nothing
     */
    setFilter(_lowDB, _midDB, _highDB)
    { 
        return this.callAction("RenderingControl", "SetFilter", {"LowDB" : _lowDB, "MidDB" : _midDB, "HighDB" : _highDB});
    }
    
    
    /**
     * get the equalizer values   
     * @return {Promise} a promise with the equalizer data
     */
    getFilter()
    { 
        return this.callAction("RenderingControl", "GetFilter", {});
    }


    /**
     * sets a device setting 
     * @param {string} id of the setting
     *                  SounbarId's :   "Source Select" --> LineIn, OpticalIn, TV_ARC, Raumfeld
     *                                  "Audio Mode" --> Arena, Voice, Theater ???
     *                                  "Subwoofer Playback Volume" --> ???
     *                                  "Subwoofer X-Over" --> ???
     *                                  and many more???
     * @param {string} the value for the id
     * @return {Promise} a promise with nothing
     */
    setDeviceSetting(_key, _value)
    { 
        return this.callAction("RenderingControl", "SetDeviceSetting", {"Name" : _key, "Value" : _value });
    }


    /**
     * get a device setting 
     * @return {Promise} a promise with nothing
     */
    getDeviceSetting(_key)
    { 
        return this.callAction("RenderingControl", "GetDeviceSetting", {"Name" : _key });
    }
    

    // AvTransport -->    
    // setNextStartTriggerTime
    
    // RenderingControl -->
    // Get Balance
    // SetBalance    
    // QueryFilter    
    // ToggleFilter
    // SetVolumeDB
    // setNextAvTransportUri
}