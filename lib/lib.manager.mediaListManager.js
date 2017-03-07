'use strict'; 
var ManagerBase = require('./lib.manager.base');
var ParseString = require('xml2js').parseString;


module.exports = class MediaListManager extends ManagerBase
{
    constructor()
    {
        super();
        this.mediaServer = null
    }

    additionalLogIdentifier()
    {
        return "MediaListManager";
    }
    
    parmMediaServer(_mediaServer = this.mediaServer)
    {
        this.mediaServer = _mediaServer
        return this.mediaServer;
    }
    
    
    checkForMediaServer()
    {
        if(!this.mediaServer)
        {
            this.logError("Calling Action on MediaListManager without having a valid media server!");
            return false;
        }
        return true;
    }
    
    
    getMediaList(_objectId, _useListCache = false)
    {
        var self = this;
        this.logVerbose("Get media list for objectId: " + _objectId);
        
        return new Promise(function(_resolve, _reject){
            try
            {
                if(!self.checkForMediaServer())
                {
                    _reject(new Error("Calling Action on MediaListManager without having a valid media server!"));
                    return;
                }
                
                self.mediaServer.browse(_objectId).then(function(_data){
                        // convert given xml data to nice JSON array
                        var jsonList = self.convertXMLToMediaList(_data);
                        _resolve(jsonList);
                    
                    }).catch(function(_data){
                        _reject(_data)
                    });
            }
            catch(exception)
            {
                self.logError(exception.toString());
                _reject(exception);
            }
        });
    }
    
    
    convertXMLToMediaList(_xmlString)
    {
        var self = this;
        
        return new Promise(function(_resolve, _reject){
        
            // direct conversion to json
            ParseString(_xmlString, function (_err, _result) {
                if(!_err && _result)
                {
                    var jsonMediaList = _result;
                    // TODO: convert to nice one?!?!
                    
                    
                    
                    _resolve(jsonMediaList);
                }
                else
                {
                    self.logError("Error parsing media item list", { "xml": _xmlString } );
                    _reject("Error parsing media item list");
                }
            });
        });
    }
    
    
    convertXMLMediaItemContainer(_mediaItemContainer)
    {
        var newObject = {};
        return _mediaItemContainer;
        
        /*
        for(var key in this.lastChangedAvTransportData)
        {
            // check if value has changed or if new key is not existent, if so then we do emit an event with the key and value
            if(this.rendererState[key] != this.lastChangedAvTransportData[key])
            {
                this.logVerbose(key + " has changed from '" + this.rendererState[key] + "' to '" + this.lastChangedAvTransportData[key] + "'");
                this.emit("rendererStateKeyValueChanged", this, key, this.rendererState[key], this.lastChangedAvTransportData[key]);
            }
            this.rendererState[key]=this.lastChangedAvTransportData[key];
        }
        */
    }
    
    
    // TODO: @@@
    
    
    
}