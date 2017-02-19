'use strict'; 
var UPNPDevice = require('./lib.device.base.upnp');

/**
 * this is the base class to use for child's which are media Renderer devices
 */
module.exports = class UPNPMediaRenderer extends UPNPDevice
{
    constructor(_upnpClient)
    {
        super(_upnpClient);
    }
    

    subscribe()
    {
        var self = this;
        if(!this.upnpClient)
        {
            this.logError("Trying to subscribe to services on device '" + this.name() + "' without client object");
            return;
        }
        
        this.logVerbose("Set up AVTransport subscription on device '" + this.name() + "'")
        this.upnpClient.subscribe('AVTransport', function(_data) {          
            self.onAvTransportSubscription(_data);
        });
        
        this.logVerbose("Set up RenderingControl subscription on device '" + this.name() + "'")
        this.upnpClient.subscribe('RenderingControl', function(_data) {          
            self.onRenderingControlSubscription(_data);
        });
    }
    
    unsubscribe()
    {
        this.logVerbose("Remove service subscriptions from device '" + this.name() + "'");
        // TODO: remove subscriptions
    }
    
    /**
     * will be called when data of the AvTransport service was changed
     * @param {Object} a object with the changed data
     */
    onAvTransportSubscription(_data)
    {
        this.logDebug("AVTransport subscription callback triggered on device '" + this.name() + "'");
        // TODO: do something with the data
    }
    
    /**
     * will be called when data of the RenderingControl service was changed
     * @param {Object} a object with the changed data
     */
    onRenderingControlSubscription(_data)
    {
        this.logDebug("AVTransport subscription callback triggered on device '" + this.name() + "'");
        // TODO: do something with the data
    }

    /**
     * returns the current volume for the device
     * @return {Promise} a promise with the volume as result
     */
    getVolume()
    {
        return this.callAction("RenderingControl", "GetVolume", {"Channel": "Master"}, function (_result){
                return _result.CurrentVolume;
            });      
    }
    
    /**
     * returns the current mute for the device
     * @return {Promise} a promise with the mute state as result (0 or 1)
     */
    getMute()
    { 
        return this.callAction("RenderingControl", "GetMute", {"Channel": "Master"}, function (_result){
                return _result.CurrentMute;
            });
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
     * set the volume for the device
     * @param {Integer} the desired volume
     * @return {Promise} a promise with no result
     */
    setVolume(_volume)
    {
        return this.callAction("RenderingControl", "SetVolume", {"Channel": "Master", "DesiredVolume": _volume});
    }
    
     /**
     * set the mute for the device
     * @param {boolean} true or false
     * @return {Promise} a promise with no result
     */
    setMute(_mute)
    {
        return this.callAction("RenderingControl", "SetMute", {"Channel": "Master", "DesiredMute": _mute});
    }
    
    
    /**
     * start playing
     * @return {Promise} a promise with no result
     */
    play()
    {
        return this.callAction("AVTransport", "Play", {});
    }
    
    /**
     * stop playing
     * @return {Promise} a promise with no result
     */
    stop()
    {
        return this.callAction("AVTransport", "Stop", {});
    }
    
    /**
     * pause playing
     * @return {Promise} a promise with no result
     */
    pause()
    {
        return this.callAction("AVTransport", "Pause", {});
    }
    
    /**
     * play next
     * @return {Promise} a promise with no result
     */
    next()
    {
        return this.callAction("AVTransport", "Next", {});
    }
    
    /**
     * play previous
     * @return {Promise} a promise with no result
     */
    prev()
    {
        return this.callAction("AVTransport", "Previous", {});
    }
    
    // TODO: @@@
    // Play Mode!
    // Seek!
    
    // setAvTransportZri
    // getPositionInfo
    // getTransportInfo
    // get TransportSettings
}
