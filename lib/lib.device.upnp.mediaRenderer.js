'use strict'; 
var ParseString = require('xml2js').parseString;
var UPNPDevice = require('./lib.device.base.upnp');

/**
 * this is the base class to use for child's which are media Renderer devices
 */
module.exports = class UPNPMediaRenderer extends UPNPDevice
{
    constructor(_upnpClient)
    {
        super(_upnpClient);
        // this object holds the current state/values of the renderer and is crated/updated from the 'avTransportData' and the 'renderingControlData' objects
        this.rendererState = {};
        // this object holds the last data which was sent from the AVTransport service subscription
        this.lastChangedAvTransportData = [];
        // this object holds the last data which was sent from the Rendering service subscription
        this.lastChangedRenderingControlData = [];
    }
    
    
    additionalLogIdentifier()
    {
        return "MediaRenderer";
    }
    
    
    roomName()
    {
        return this.name();
    }
    
    roomUdn()
    {
        return this.udn();
    }
    
    subscribe()
    {
        var self = this;
        if(!this.upnpClient)
        {
            this.logError("Trying to subscribe to services on device '" + this.name() + "' without client object");
            return;
        }
        
        this.upnpClient.on("error", function(_err) { 
            self.logError(_err);
        }); 
        
        this.logVerbose("Set up AVTransport subscription on device '" + this.name() + "'")
        this.upnpClient.subscribe('AVTransport', this.avTransportSubscriptionCallback(this));
        
        this.logVerbose("Set up RenderingControl subscription on device '" + this.name() + "'")
        this.upnpClient.subscribe('RenderingControl', this.renderingControlSubscriptionCallback(this));
    }
    
    unsubscribe()
    {
        if(!this.upnpClient)
        {
            this.logError("Trying to un-subscribe services on device '" + this.name() + "' without client object");
            return;
        }
    
        this.logVerbose("Remove service subscriptions for device '" + this.name() + "'");
        this.upnpClient.unsubscribe("AVTransport", this.avTransportSubscriptionCallback(this));
        this.upnpClient.unsubscribe("RenderingControl", this.renderingControlSubscriptionCallback(this));        
    }
    
    
    avTransportSubscriptionCallback(_self)
    {
        return function(_data)
        {
            _self.onAvTransportSubscription(_data);
        }
    }
    
    
    renderingControlSubscriptionCallback(_self)
    {
        return function(_data)
        {
            _self.onRenderingControlSubscription(_data);
        }
    }
    
    
    /**
     * should be called whenever any state of renderer (subscription) is changed
     * so it will be called on onAvTransportSubscription and on onRenderingControlSubscription     
     */
    updateRendererState()
    {
        // copy keys and values of both subscription returned data into the renderer state so the renderer 
        // state will fill up with the gathered and always upToDate values
        for(var key in this.lastChangedAvTransportData) this.rendererState[key]=this.lastChangedAvTransportData[key];
        for(var key in this.lastChangedRenderingControlData) this.rendererState[key]=this.lastChangedRenderingControlData[key];
        
        this.emit("rendererStateChanged", this.rendererState);
    }
    
    
    /**
     * will be called when data of the AvTransport service was changed
     * @param {Object} a object with the changed data
     */
    onAvTransportSubscription(_keyDataArray)
    {        
        this.logDebug("AVTransport subscription callback triggered on device '" + this.name() + "'");
        this.lastChangedAvTransportData = _keyDataArray;
        this.updateRendererState();
    }
    
    /**
     * will be called when data of the RenderingControl service was changed
     * @param {Object} a object with the changed data
     */
    onRenderingControlSubscription(_keyDataArray)
    {        
        this.logDebug("RenderingControl subscription callback triggered on device '" + this.name() + "'");        
        this.lastChangedRenderingControlData = _keyDataArray;
        this.updateRendererState();
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
    
    /**
     * set play mode
     * @param {String} the play mode as a string (NORMAL, SHUFFLE, REPEAT_ALL, RANDOM, REPEAT_ONE, DIRECT_1)
     * @return {Promise} a promise with no result
     */
    setPlayMode(_playMode)
    {
        return this.callAction("AVTransport", "SetPlayMode", {"NewPlayMode": _playMode});
    }
    
    /**
     * set play mode
     * @param {String} the transport uri
     * @param {String} the transport uri metadata
     * @return {Promise} a promise with no result
     */
    setAvTransportUri(_transportUri, _transporUriMetadata)
    {
        return this.callAction("AVTransport", "SetAvTransportUri", {"CurrentURI": _transportUri, "CurrentURIMetaData": _transporUriMetadata});
    }
    
    /**
     * seek
     * @param {String} the seek unit (ABS_TIME, REL_TIME, TRACK_NR)
     * @param {String} the seek target
     * @return {Promise} a promise with no result
     */
    seek(_unit, _target)
    {
        return this.callAction("AVTransport", "Seek", {"Unit": _unit, "Target": _target});
    }
    
    /**
     * getPositionInfo
     * @return {Promise} a promise with the position info
     */
    getPositionInfo()
    {
        return this.callAction("AVTransport", "GetPositionInfo", {});
    }
    
    /**
     * getTransportInfo
     * @return {Promise} a promise with the transport info
     */
    getTransportInfo()
    {
        return this.callAction("AVTransport", "GetTransportInfo", {});
    }
    
    /**
     * getTransportSettings
     * @return {Promise} a promise with the transport settings
     */
    getTransportSettings()
    {
        return this.callAction("AVTransport", "GetTransportSettings", {});
    }
    
}
