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