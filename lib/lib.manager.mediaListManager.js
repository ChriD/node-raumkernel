'use strict'; 
var Url = require('url');
var ManagerBase = require('./lib.manager.base');
var ParseString = require('xml2js').parseString;


module.exports = class MediaListManager extends ManagerBase
{
    constructor()
    {
        super();
        this.mediaServer = null
        this.listCache = new Map();
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
    
    
    getMediaList(_listId, _objectId, _useListCache = true, _emitReady = true)
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
                
                // if list is in cache and we should us the cache then return list from the cache
                // lists like zone playlists or favourites are always up to date in cache
                if(_useListCache && self.listCache.has(_listId))
                {
                    if(_emitReady)
                        _self.emit("mediaListReady", _listId, self.listCache[_listId]);
                    _resolve(self.listCache[_listId]);
                    return;
                }
                
                self.mediaServer.browse(_objectId).then(function(_data){
                                // convert given xml data to nice JSON array
                                self.convertXMLToMediaList(_data).then(function(_data){
                                self.listCache[_listId] = _data;
                                if(_emitReady)
                                    self.emit("mediaListReady", _listId, _data);
                                _resolve(_data);
                            }).catch(function(_data){
                                _reject(_data)
                            });
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
    
    
    loadMediaListForUri(_listId, _uri, _uriMetadata, _useCache = false, _emitReady = true)
    {
        var self = this;
        
        return new Promise(function(_resolve, _reject){
            self.logVerbose("Get media list for uri " + _uri);
            
            try
            {
                // we have to decide if its a playcontainer or not. This is the case when the uri begibs with "dlna-playcontainer://"
                var parsedUrl = Url.parse(_uri, true);                
                if(parsedUrl.protocol != "dlna-playcontainer:")
                {
                
                }
                // we do have a playconteiner, so we try to get the cid from the query. This is the id where we can search the content directory with
                else
                {
                    self.getMediaList(_listId, parsedUrl.query.cid, _useCache, _emitReady).then(function(_data){
                        _resolve(_data);
                    }).catch(function(_data){
                        _reject(_data);
                    });
                }
            }
            catch(_exception)
            {
                self.logError("Error resolving url on loadMediaListForUri", _exception);
                _reject(new Error("Error resolving url on loadMediaListForUri: " + _exception.toString())); 
            }           
        });
    }
    
    
    loadMediaListForRendererUri(_rendererUdn, _uri, _uriMetadata, _useCache = false)
    {
        var self = this;
        
        return new Promise(function(_resolve, _reject){
            self.logDebug("Update media list for " + _rendererUdn, _uri);
            self.loadMediaListForUri(_rendererUdn, _uri, _uriMetadata, _useCache, false).then(function(_data){
                    self.logDebug("Media list for renderer " + _rendererUdn + " is ready");
                    self.emit("mediaRendererPlaylistReady", _rendererUdn, _data);
                    _resolve(_data);
                }).catch(function(_data){
                    self.logError("Error getting media list for renderer " + _rendererUdn, _data.toString());
                    //self.emit("mediaRendererPlaylistReady", _rendererUdn, null);
                    _reject(_data);
                });
        });
    }
    
    
    loadMediaItemListsByContainerUpdateIds(_mediaServer, _containerUpdateIds)
    {
        if(!_mediaServer.isRaumfeldServer() || !_containerUpdateIds)
            return;
        var updateIds = _containerUpdateIds.split(",");
        for(var i=0; i<updateIds.length; i++)
        {
            var containerId = updateIds[i];
            if(!parseInt(containerId) && containerId)
            {
                // check if the container id is matching a zone, then we have to update the list for the zone renderer
                containerId = unescape(containerId);
                if(containerId.startsWith("0/Zones/"))
                {
                    var zoneUdn = containerId.substr(8, containerId.length);
                    var mediaRenderer = this.managerDisposer.deviceManager.getVirtualMediaRenderer(zoneUdn);
                    if(mediaRenderer)
                    {
                        this.logVerbose("Load media list for mediaRenderer: " + mediaRenderer.name());
                        this.managerDisposer.mediaListManager.loadMediaListForRendererUri(mediaRenderer.udn(), mediaRenderer.rendererState.AVTransportURI, mediaRenderer.rendererState.AVTransportURIMetaData, false).catch(function(_data){});
                    }
                }
                // otherwise its a list which we do load/update the cache with
                else
                {
                    this.getMediaList(containerId, containerId, false).catch(function(_data){});
                }
            }
        }
    }
    
    
    // TODO: @@@
    
    
    
    
}