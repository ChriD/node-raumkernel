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
    
    /*
    DEL_getMediaList(_listId, _objectId, _useListCache = true, _emitReady = true)
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
                        self.emit("mediaListDataReady", _listId, self.listCache[_listId]);
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
                                        self.emit("mediaListDataReady", _listId, _data);
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
    */
    
    
    loadMediaListForUri(_listId, _uri, _uriMetadata, _useCache = false, _emitReady = true, _dataPackageCount = 25, _dataPackageCallback = null)
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
                    if(_uriMetadata)
                    {
                        var mediaDataConverter = new MediaDataConverter();
                        mediaDataConverter.parmLogger(self.parmLogger());
                        mediaDataConverter.parmManagerDisposer(self.parmManagerDisposer());
                        mediaDataConverter.convertXMLToMediaList(_uriMetadata).then(function(_data){
                                self.listCache.set(_listId, _data);
                                if(_emitReady)
                                    self.emit("mediaListDataReady", _listId, _data);
                                _resolve(_data);
                            }).catch(function(_data){
                                self.listCache.delete(_listId) = null;
                                if(_emitReady)
                                    self.emit("mediaListDataReady", _listId, null);
                                _reject(_data);
                            });
                    }
                    else
                    {
                        self.listCache.delete(_listId);
                        if(_emitReady)
                            self.emit("mediaListDataReady", _listId, null);
                        _resolve(null);
                    }
                }
                // we do have a playcontainer, so we try to get the cid from the query. This is the id where we can search the content directory with
                else
                {
                    self.getMediaList(_listId, parsedUrl.query.cid, _useCache, _emitReady, _dataPackageCount, _dataPackageCallback).then(function(_data){
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
    
    
    loadMediaListForRendererUri(_rendererUdn, _uri, _uriMetadata, _useCache = false, _dataPackageCount = 25, _dataPackageCallback = null)
    {
        var self = this;
        
        return new Promise(function(_resolve, _reject){
            self.logDebug("Update media list for " + _rendererUdn, _uri);
            self.loadMediaListForUri(_rendererUdn, _uri, _uriMetadata, _useCache, false, _dataPackageCount, _dataPackageCallback).then(function(_data){
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



    getMediaList(_listId, _objectId, _useListCache = true, _emitReady = true, _dataPackageCount = 25, _dataPackageCallback = null)
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
                    // when we do read the list from cache and we do have a callback we split the
                    // callback into the package count. In fact we may send the whole list at once but
                    // we stick to this for now
                    if(_dataPackageCallback)
                    {
                        var packageData = [];
                        var curPackageDataCount = 0;
                        for(var pkgIdx=0; pkgIdx<=self.listCache.get(_listId).length; pgkIdx=(pgkIdx + _dataPackageCount))
                        {                                                        
                            packageData = self.listCache.get(_listId).slice(pgkIdx,(pgkIdx + _dataPackageCount - 1));
                            curPackageDataCount = packageData.length;
                            if(curPackageDataCount > 0)
                            {
                                _dataPackageCallback(_listId, packageData, pkgIdx, (pkgIdx + curPackageDataCount - 1) , curPackageDataCount);
                                if(_emitReady)
                                    self.emit("mediaListDataPackageReady", _listId, packageData, pkgIdx, (pkgIdx + curPackageDataCount - 1), curPackageDataCount);
                            }
                        }
                    }
                    // emit or resolve the list if we get it from the cache immediately, we do not read
                    // it from the media server of course.
                    if(_emitReady)
                        self.emit("mediaListDataReady", _listId, self.listCache.get(_listId));
                    _resolve(self.listCache.get(_listId));
                    return;
                }

                // we do have to browse recursivle to get data parts                
                self.listCache.delete(_listId);
                self.getMediaList_Rec(_listId, _objectId, _emitReady, _dataPackageCount, _dataPackageCallback, 0).then(function(_data){
                    if(_emitReady)
                        self.emit("mediaListDataReady", _listId, _data);
                    _resolve(self.listCache.get(_listId));
                }).catch(function(_data){
                    _reject(_data);
                });
                
                
            }
            catch(exception)
            {
                self.logError(exception.toString());
                _reject(exception);
            }
        });
    }


    getMediaList_Rec(_listId, _objectId, _emitReady, _dataPackageCount, _dataPackageCallback, _pkgIdx)
    {
        var self = this;        

        return new Promise(function(_resolve, _reject){
            try
            {
                self.mediaServer.browse(_objectId, "BrowseDirectChildren", "*", _pkgIdx, _dataPackageCount).then(function(_data){
                    // convert given xml data to nice JSON array
                    var mediaDataConverter = new MediaDataConverter();
                    mediaDataConverter.parmLogger(self.parmLogger());
                    mediaDataConverter.parmManagerDisposer(self.parmManagerDisposer());
                    mediaDataConverter.convertXMLToMediaList(_data).then(function(_data){
                        // get the current package data which should always be equal to "_dataPackageCount" except we have read all data
                        var curPackageDataCount = _data.length;                                                                       
                        if(curPackageDataCount > 0)
                        {
                            // update the main list data by adding the current part
                            // Im not sure if this is the fastest way, maybe heer we should do some performance tuning?                   
                            if(self.listCache.has(_listId))
                                self.listCache.set(_listId, self.listCache.get(_listId).concat(_data));
                            else
                                self.listCache.set(_listId, _data);

                            if(_dataPackageCallback)
                                _dataPackageCallback(_listId, _data, _pkgIdx, (_pkgIdx + curPackageDataCount - 1) , curPackageDataCount);
                            if(_emitReady)
                                self.emit("mediaListDataPackageReady", _listId, _data, _pkgIdx, (_pkgIdx + curPackageDataCount - 1), curPackageDataCount);
                        }
                        
                        // do not resolve until we do have read all data
                        if(curPackageDataCount < _dataPackageCount)                                    
                        {
                            _resolve(_data);                                                
                        }
                        // if we do not have all data start browsing again with the next package idx
                        else
                        {
                            self.getMediaList_Rec(_listId, _objectId, _emitReady, _dataPackageCount, _dataPackageCallback, (_pkgIdx + curPackageDataCount)).then(function(_data){
                                _resolve(_data);
                            }).catch(function(_data){
                                _reject(_data);
                            });
                        }

                    }).catch(function(_data){
                        _reject(_data);
                    });
                }).catch(function(_data){
                    _reject(_data);
                });
            }
            catch(_exception)
            {
                _reject(_data);
            }
        });
    }
    
    
    // TODO: @@@
    // http://stackoverflow.com/questions/24660096/correct-way-to-write-loops-for-promise
    // or with recursion?
    // recursion is better i think
    /*
    loadRec(_id, _from, _count, _callback)
    {
        new Promise ()
        {
            load(_id, _from, _count).then(function(_data){

                // convert part to list and (add to list manager list?!)
                // callback the partial list
                _callback(_convertedData)
                callbackGlobal(_convertedData)

                if(_data.lenght < _count)
                {
                    // reached end, resolve full data
                    _resolve(...);                
                }
                else
                {
                    return loadRec(_id, (_from + _count), _count, _callback))
                }
            }).catch(funtion(_data){
                _reject(_data);
            });
        }
        
    }

    */
    
    
    
    
}