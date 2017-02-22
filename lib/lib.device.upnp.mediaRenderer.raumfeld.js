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
    
    // AvTransport -->
    // Enter Automatic Standby
    // Enter Manual Standby
    // Leave Standby
    // setNextStartTriggerTime
    
    // RenderingControl -->
    // Get Balance
    // SetBalance
    //GetFilter
    //GetLineInStream
    //PlaySystemSound
    //QueryFilter
    //SetFilter
    //ToggleFilter
    //SetVolumeDB
     // setNextAvTransportUri
    
    
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