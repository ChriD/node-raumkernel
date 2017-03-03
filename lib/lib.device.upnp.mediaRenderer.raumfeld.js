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
    
    // AvTransport -->    
    // setNextStartTriggerTime
    
    // RenderingControl -->
    // Get Balance
    // SetBalance
    // GetFilter
    // GetLineInStream
    // PlaySystemSound
    // QueryFilter
    // SetFilter
    // ToggleFilter
    // SetVolumeDB
    // setNextAvTransportUri
     
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
    leaveStandby()
    { 
        return this.callAction("AVTransport", "LeaveStandby", {});
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
        
}