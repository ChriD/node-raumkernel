'use strict'; 
var UPNPMediaServer = require('./lib.device.upnp.mediaServer');

/**
 * this is the class which should be used for the raumfeld media server
 */
module.exports = class UPNPMediaServerRaumfeld extends UPNPMediaServer
{
    constructor(_upnpClient)
    {
        super(_upnpClient);
    }
    
    // Shuffle
    // AddCOntainerToqueue
    // createQueue
    // AddItemtoQuwuw
    // MoveInQueue
    // RemoveFromQueue
    // renameQueue
    
    /**
     * enter the standby mode of a room
     * @return {Promise} a promise with a result data set
     */
     /*
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
    }*/
}