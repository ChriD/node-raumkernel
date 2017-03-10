'use strict'; 
var UPNPDevice = require('./lib.device.base.upnp');

/**
 * this is the base class to use for child's which are media server devices
 */
module.exports = class UPNPMediaServer extends UPNPDevice
{
    constructor(_upnpClient)
    {
        super(_upnpClient);
    }
    
    
    isRaumfeldServer()
    {
        return false;
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
        
        this.logVerbose("Set up ContentDirectory subscription on device '" + this.name() + "'")
        this.upnpClient.subscribe('ContentDirectory', this.contentDirectorySubscriptionCallback(this));
    }
    
    
    unsubscribe()
    {
        if(!this.upnpClient)
        {
            this.logError("Trying to un-subscribe services on device '" + this.name() + "' without client object");
            return;
        }
    
        this.logVerbose("Remove service subscriptions for device '" + this.name() + "'");
        this.upnpClient.unsubscribe("ContentDirectory", this.contentDirectorySubscriptionCallback(this));
    }
    
    
    contentDirectorySubscriptionCallback(_self)
    {
        return function(_data)
        {
            _self.onContentDirectorySubscription(_data);
        }
    }
    
    
    /**
     * will be called when data of the ContentDirectory service was changed
     * @param {Object} a object with the changed data
     */
    onContentDirectorySubscription(_keyDataArray)
    {
        this.logDebug("ContentDirectory subscription callback triggered on device '" + this.name() + "'");
        this.managerDisposer.mediaListManager.loadMediaItemListsByContainerUpdateIds(this, _keyDataArray["ContainerUpdateIDs"]);
    }
    
    
    /**
     * enter the standby mode of a room
     * @return {Promise} a promise with a result data set
     */
    browse(_objectId, _browseFlag = "BrowseDirectChildren", _filter = "*", _startingIndex = 0, _requestedCount = 0, _sortCriteria = "")
    { 
        return this.callAction("ContentDirectory", "Browse", {  "ObjectID" : _objectId,
                                                                "BrowseFlag" : _browseFlag,
                                                                "Filter" : _browseFlag,
                                                                "StartingIndex" : _startingIndex,
                                                                "RequestedCount" : _requestedCount,
                                                                "SortCriteria" : _sortCriteria
                                                            }, 
                                                            function (_result){
                                                                return _result.Result;
                                                            }
            );
    }
    
    
    /**
     * enter the standby mode of a room     
     * @return {Promise} a promise with a result data set
     */
    search(_objectId, _searchCriteria = "", _filter = "*", _startingIndex = 0, _requestedCount = 0, _sortCriteria = "")
    { 
        return this.callAction("ContentDirectory", "Search", {  "ObjectID" : _objectId,
                                                                "SearchCriteria" : _searchCriteria,
                                                                "Filter" : _browseFlag,
                                                                "StartingIndex" : _startingIndex,
                                                                "RequestedCount" : _requestedCount,
                                                                "SortCriteria" : _sortCriteria
                                                            },
                                                            function (_result){
                                                                return _result.Result;
                                                            }
            );
    }    
}