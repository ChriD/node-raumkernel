'use strict'; 
var Logger = require('./lib.logger');
var QueueController = require('./lib.queueController');
var ManagerDisposer = require('./lib.managerDisposer');

module.exports = class QueueControllerZonePlaylist extends QueueController
{
    constructor()
    {
        super();
    }

    additionalLogIdentifier()
    {
        return "QueueControllerZonePlaylist";
    }
    
    
    isQueryPlaylist(_rendererUdn)
    {
    }
    
    
    createQueryPlaylist(_rendererUdn)
    {
        // create query and copy current item to thr new query
        // Then bend or set new avtransport uri
    }
    
    
    getQueryForRendererUdn(_rendererUdn)
    {
        return "0/Zones/" + this.encodeString(_rendererUdn);
    }
    
    
    addItemToPlaylist(_rendererUdn, _mediaItemId, _position = 294967295, _isItemsContainer = false,  _startIndex = 0, _endIndex = 294967295)
    {
        var self = this;
        self.logVerbose("Add item '" + _mediaItemId + "' to '" + _rendererUdn  + "'");
        return this.addItemToQueue(this.getQueryForRendererUdn(_rendererUdn), _mediaItemId, _position, _isItemsContainer, _startIndex, _endIndex);
    }
    
    
    removeItemsFromPlaylist(_rendererUdn, _fromPosition, _toPosition)
    {
        var self = this;
        self.logVerbose("Remove items '" + _fromPosition.toString() + "' to '" + _toPosition.toString()  + "' on renderer '" + _rendererUdn + "'");
        return this.removeItemsFromQueue(this.getQueryForRendererUdn(_rendererUdn), _fromPosition, _toPosition);
    }
    
    
    moveItemInPlaylist(_rendererUdn, _mediaItemId, _newPosition)
    {
        var self = this;
        self.logVerbose("Move item '" + _mediaItemId + "' in _renderer '" + _rendererUdn  + "' to position " + _newPosition.toString());
        // the "_mediaItemId" has to consist of the id of the _rendererUdn item of course, so on fact "_rendererUdn" is not really needed here
        this.moveItemInQueue(_mediaItemId, _newPosition);
    }

}