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

}