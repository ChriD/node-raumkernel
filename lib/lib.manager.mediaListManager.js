'use strict'; 
var Url = require('url');
var ManagerBase = require('./lib.manager.base');
var MediaDataConverter = require('./lib.mediaDataConverter');


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
                                var mediaDataConverter = new MediaDataConverter();
                                mediaDataConverter.parmLogger(self.parmLogger());
                                mediaDataConverter.parmManagerDisposer(self.parmManagerDisposer());
                                mediaDataConverter.convertXMLToMediaList(_data).then(function(_data){
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
    
    
    loadMediaListForUri(_listId, _uri, _uriMetadata, _useCache = false, _emitReady = true)
    {
        var self = this;
        
        return new Promise(function(_resolve, _reject){
            self.logVerbose("Get media list for uri " + _uri);
            
            try
            {
                // we have to decide if its a playcontainer or not. This is the case when the uri begins with "dlna-playcontainer://"
                // if there is no playcontainer we have to use the medadata to create the list (in fact then its only one item)
                var parsedUrl = Url.parse(_uri, true);
                if(parsedUrl.protocol != "dlna-playcontainer:")
                {
                    var mediaDataConverter = new MediaDataConverter();
                    mediaDataConverter.parmLogger(self.parmLogger());
                    mediaDataConverter.parmManagerDisposer(self.parmManagerDisposer());
                    mediaDataConverter.convertXMLToMediaList(_uriMetadata).then(function(_data){
                            self.listCache[_listId] = _data;
                            if(_emitReady)
                                self.emit("mediaListReady", _listId, _data);
                        }).catch(function(_data){
                            self.listCache[_listId] = null;
                            if(_emitReady)
                                self.emit("mediaListReady", _listId, null);
                        });
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
                // the zone container ids are identified with '0/Zones/' as prefix with the zone renderer following in an escaped string
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
                // otherwise it's a list which we do load/update the cache with. This may be favourites or anything else like that
                else
                {
                    this.getMediaList(containerId, containerId, false).catch(function(_data){});
                }
            }
        }
    }
    
    
    // TODO: @@@
    
    
    
    
}