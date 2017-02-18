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
