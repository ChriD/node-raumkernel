'use strict'; 
var UPNPMediaRenderer = require('./lib.device.upnp.mediaRenderer');

/**
 * this is the class for a virtual media renderer
 */
module.exports = class UPNPMediaRendererVirtual extends UPNPMediaRenderer
{
    constructor(_upnpClient)
    {
        super(_upnpClient);
    }
    
    /**
     * returns the current mute for the room
     * @return {Promise} a promise with the mute state as result (0 or 1)
     */
    getRoomMute(_roomUDN)
    { 
        return this.callAction("RenderingControl", "GetRoomMute", {"Channel": "Master", "Room": _roomUDN}, function (_result){
                return _result.CurrentMute;
            });
    }
    
     /**
     * returns the current volume for the room
     * @return {Promise} a promise with the volume as result
     */
    getRoomVolume(_roomUDN)
    { 
        return this.callAction("RenderingControl", "GetRoomVolume", {"Channel": "Master", "Room": _roomUDN}, function (_result){
                return _result.CurrentVolume;
            });
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