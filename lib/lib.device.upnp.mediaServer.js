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