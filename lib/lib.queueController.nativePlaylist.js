'use strict'; 
var Logger = require('./lib.logger');
var QueueController = require('./lib.queueController');
var ManagerDisposer = require('./lib.managerDisposer');

module.exports = class QueueControllerNativePlaylist extends QueueController
{
    constructor()
    {
        super();
        // the container id for the native playlists
        this.parmQueueBaseContainerId("0/Playlists/MyPlaylists");
    }


    additionalLogIdentifier()
    {
        return "QueueControllerNativePlaylist";
    }
    
    
    createPlaylist(_playlistName)
    {
        var self = this;
        self.logVerbose("Create native playlist with name '" + _playlistName + "'");
        return new Promise(function(_resolve, _reject){
            self.createQueue(_playlistName).then(function(_data){
                self.logVerbose("Native playlist with name '" + _playlistName + "' created");
                _resolve(_data);
            }).catch(function(_data){
                self.logError("Native playlist with name '" + _playlistName + "' could not be created");
                _reject(_data);
            });
        });
    }
    
    
    deletePlaylist(_playlistName)
    {
        var self = this;
        self.logVerbose("Delete native playlist with name '" + _playlistName + "'");
        return new Promise(function(_resolve, _reject){
            self.deleteQueue(_playlistName).then(function(_data){
                self.logVerbose("Native playlist with name '" + _playlistName + "' deleted");
                _resolve(_data);
            }).catch(function(_data){
                self.logError("Native playlist with name '" + _playlistName + "' could not be deleted");
                _reject(_data);
            });
        });
    }
    
    
    renamePlaylist(_oldPlaylistName, _newPlaylistName)
    {
        var self = this;
        self.logVerbose("Rename native playlist with name '" + _oldPlaylistName + "' to '" + _newPlaylistName  + "'");
        return new Promise(function(_resolve, _reject){
            self.renameQueue(_oldPlaylistName, _newPlaylistName).then(function(_data){
                self.logVerbose("Playlist with name '" + _oldPlaylistName + "' renamed to '" + _newPlaylistName  + "'");
                _resolve(_data);
            }).catch(function(_data){
                 self.logError("Rename native playlist with name '" + _oldPlaylistName + "' to '" + _newPlaylistName  + "' had errors");
                _reject(_data);
            });
        });
    }
    
    
    addItemToPlaylist(_playlistName, _mediaItemId, _position = 294967295, _isItemsContainer = false,  _startIndex = 0, _endIndex = 294967295)
    {
        var self = this;
        self.logVerbose("Add item '" + _mediaItemId + "' to '" + _playlistName  + "'");
        return this.addItemToQueue(_playlistName, _mediaItemId, _position, _isItemsContainer, _startIndex, _endIndex);
    }
    
    
    removeItemsFromPlaylist(_playlistName, _fromPosition, _toPosition)
    {
        var self = this;
        self.logVerbose("Remove items '" + _fromPosition.toString() + "' to '" + _toPosition.toString()  + "' on playlist '" + _playlistName + "'");
        return this.removeItemsFromQueue(_playlistName, _fromPosition, _toPosition);
    }
    
    
    moveItemInPlaylist(_playlistName, _mediaItemId, _newPosition)
    {
        var self = this;
        self.logVerbose("Move item '" + _mediaItemId + "' in playlist '" + _playlistName  + "' to position " + _newPosition.toString());
        // the "_mediaItemId" has to consist of the id of the playlist item of course, so on fact "_playlistName" is not really needed here
        this.moveItemInQueue(_mediaItemId, _newPosition);
    }

}