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
    
    
    isRaumfeldServer()
    {
        return true;
    }
    
    /**
     * create a queue in a container id
     * @param {String} the desired name of the queue
     * @param {String} the container id where the queue has to be created
     * @return {Promise} a promise with som result
     */
    createQueue(_desiredName, _containerId)
    { 
        return this.callAction("ContentDirectory", "CreateQueue", { "DesiredName" : (_desiredName), "ContainerID" : (_containerId) });
    }
    
     /**
     * add a container or parts of containers into a queue
     * @param {String} the queue id
     * @param {String} the container id
     * @param {String} the source id
     * @return {Promise} a promise with some result
     */
    addContainerToQueue(_queueId, _containerId, _sourceId, _searchCriteria = "*", _sortCriteria = "", _startIndex = 0, _endIndex = 294967295, _position = 0)
    { 
        return this.callAction("ContentDirectory", "AddContainerToQueue", { "QueueID" : (_queueId), "ContainerID" : (_containerId), "SourceID" : (_sourceId), "SearchCriteria" : _searchCriteria, "SortCriteria" : _sortCriteria, "StartIndex" : _startIndex, "EndIndex" : _endIndex, "Position" : _position });
    }
    
    /**
     * add one item into a queue
     * @param {String} the queue id
     * @param {String} the objectId which has to be inserted
     * @param {Integer} the position where the item has to be inserted
     * @return {Promise} a promise with some result
     */
    addItemToQueue(_queueId, _objectId, _position = 0)
    { 
        return this.callAction("ContentDirectory", "AddItemToQueue", { "QueueID" : (_queueId), "ObjectID" : (_objectId), "Position" : _position });
    }
    
    /**
     * remove items from queue
     * @param {String} the queue id
     * @param {Integer} from position 
     * @param {Integer} to position
     * @return {Promise} a promise with some result
     */
    removeFromQueue(_queueId, _fromPosition, _toPosition)
    { 
        return this.callAction("ContentDirectory", "RemoveFromQueue", { "QueueID" : (_queueId), "FromPosition" : _fromPosition, "ToPosition" : _toPosition });
    }
    
    /**
     * rename queue
     * @param {String} the queue id
     * @param {String} the desired name
     * @return {Promise} a promise with some result
     */
    renameQueue(_queueId, _desiredName)
    { 
        return this.callAction("ContentDirectory", "RenameQueue", { "QueueID" : (_queueId), "DesiredName" : _desiredName });
    }
    
    
     /**
     * move an object in a queue
     * @param {String} the object id (which includes the queue id)
     * @param {Integer} the new position  of the object in the queue
     * @return {Promise} a promise with some result
     */
    moveInQueue(_objectID, _newPosition)
    { 
        return this.callAction("ContentDirectory", "MoveInQueue", { "ObjectID" : (_objectID), "NewPosition" : _newPosition });
    }
    
     /**
     * destroys an object
     * @param {String} the object id to destroy
     * @return {Promise} a promise with some result
     */
    destroyObject(_objectID)
    { 
        return this.callAction("ContentDirectory", "DestroyObject", { "ObjectID" : (_objectID)});
    }
    
    
    // TODO: @@@
    // Shuffle
    // AssignStationutton
    // GetStationButtonAssignment
    // RescanSource
    // QueryDatabaseState
    // GetSourceInfo
    
}