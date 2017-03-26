'use strict'; 
var Logger = require('./lib.logger');
var QueueController = require('./lib.queueController');
var ManagerDisposer = require('./lib.managerDisposer');

module.exports = class QueueControllerZonePlaylist extends QueueController
{
    constructor()
    {
        super();
        this.parmQueueBaseContainerId("0/Zones");
        this.currentSelectedItems = null;
    }


    additionalLogIdentifier()
    {
        return "QueueControllerZonePlaylist";
    }


    init()
    {
        super.init();                
    }


    setCurrentSelectedItem(_rendererUdn)
    {
        if(!this.currentSelectedItems)
            this.currentSelectedItems = new Array();
        var mediaRenderer =  this.managerDisposer.deviceManager.getVirtualMediaRenderer(_rendererUdn);
        if(mediaRenderer)
        {
            this.currentSelectedItems[_rendererUdn] = mediaRenderer.currentMediaItemData;
        }
        else
        {
            this.currentSelectedItems[_rendererUdn] = null;
        }        
    }


    getCurrentSelectedItem(_rendererUdn)
    {
        if(!this.currentSelectedItems)
            this.currentSelectedItems = new Array();
        var mediaItem = this.currentSelectedItems[_rendererUdn];
        return mediaItem;
    }

    
    
    hasRendererQueuePlaylist(_rendererUdn)
    {
        var mediaRenderer = this.managerDisposer.deviceManager.getVirtualMediaRenderer(_rendererUdn);
        if (mediaRenderer)
        {
            if (mediaRenderer.mediaOriginData.containerId &&  mediaRenderer.mediaOriginData.containerId.startsWith("0/Zones/"))
                return true;
            return false;
        }        
        else
        {
            this.logError("No media renderer with udn '" + _rendererUdn  + "' found!");
        }
        return false;
    }


    getQueueNameFromRendererUdn(_rendererUdn)
    {
        return _rendererUdn;
    }
    
    
    createQueuePlaylist(_rendererUdn)
    {        
        var self = this;
        var createdQueueData = {};
        // check if current playlist of the renderer is already a queue. 
        // if this is the case we do not need to create a queue and we do not have to copy the container or item into that queue
        return new Promise(function(_resolve, _reject){
            if (!self.hasRendererQueuePlaylist(_rendererUdn))
            {
                self.logDebug("Renderer '" + _rendererUdn + "' has no queue, so try to create a queue");    
                self.createQueue(self.getQueueNameFromRendererUdn(_rendererUdn)).then(function(_data){
                    self.logDebug("Playlist queue for renderer '" + _rendererUdn  + "' has been created", _data);  
                    createdQueueData = _data;
                    self.removeItemsFromQueue(createdQueueData.GivenName, 0, 4294967295).then(function(_data){
                        // move container or item to queue, get info if queue or item from mediOriginData from media Renderer
                        var mediaRenderer = self.managerDisposer.deviceManager.getVirtualMediaRenderer(_rendererUdn);
                        if (mediaRenderer)
                        {
                            var isContainer = mediaRenderer.mediaOriginData.containerId ? true : false;
                            self.addItemToQueue(createdQueueData.GivenName,  isContainer ? mediaRenderer.mediaOriginData.containerId : mediaRenderer.mediaOriginData.singleId, 0, isContainer ? true : false).then(function(_data){
                                // after we have created a new queue for the renderer and we did copy the current tracks onto that
                                // queue we do set the new container to the renderer and keep the playing position                                
                                self.logDebug("Bend queue '" + createdQueueData.QueueID + "' to renderer on track number " + mediaRenderer.rendererState.CurrentTrack);
                                mediaRenderer.loadContainer(createdQueueData.QueueID, createdQueueData.MetaData, mediaRenderer.rendererState.CurrentTrack, true).then(function(_data){
                                    _resolve(createdQueueData.QueueID);
                                }).catch(function(_data){
                                     _reject(_data);
                                });                           
                                
                            }).catch(function(_data){
                                _reject(_data);
                            })                                                      
                        }
                        else
                        {
                            _reject(new Error("No media renderer with udn '" + _rendererUdn  + "' found!"));
                        }
                        
                    }).catch(function(_data){
                        _reject(_data);
                    })
                                      
                }).catch(function(_data){
                    _reject(_data);
                });
            }
            else
            {
                // the uri on the renderer is already a renderer playlist queue, so we do return the id for that queue
                _resolve(self.getQueueIdFromNameAndBase(self.getQueueNameFromRendererUdn(_rendererUdn)));
            }
        });
    }
        
    
    addItemToPlaylist(_rendererUdn, _mediaItemId, _position = 294967295, _isItemsContainer = false,  _startIndex = 0, _endIndex = 294967295)
    {
        var self = this;
        self.logVerbose("Add item '" + _mediaItemId + "' to '" + _rendererUdn  + "'");
        return new Promise(function(_resolve, _reject){
            self.createQueuePlaylist(_rendererUdn).then(function(_data){
                self.setCurrentSelectedItem(_rendererUdn);
                self.addItemToQueue(self.getQueueNameFromRendererUdn(_rendererUdn), _mediaItemId, _position, _isItemsContainer, _startIndex, _endIndex).then(function(_data){
                    // if we do add a track before the current playing one we have to bend the uri again with the correct track number                    
                    self.updatePlaylistCurrentSelectedTrackNumber(_rendererUdn).then(function(_data){
                        _resolve(_data);
                    }).catch(function(_data){
                        _reject(_data);
                    });

                }).catch(function(_data){
                    _reject(_data);
                });
            }).catch(function(_data){
                _reject(_data);
            });
        });        
    }
    
    
    removeItemsFromPlaylist(_rendererUdn, _fromIndex, _toIndex)
    {
        var self = this;
        var queueId = "";
        self.logVerbose("Remove items '" + _fromIndex.toString() + "' to '" + _toIndex.toString()  + "' on renderer '" + _rendererUdn + "'");        
        return new Promise(function(_resolve, _reject){
            self.createQueuePlaylist(_rendererUdn).then(function(_data){
                queueId = _data;
                self.setCurrentSelectedItem(_rendererUdn);
                self.removeItemsFromQueue(self.getQueueNameFromRendererUdn(_rendererUdn), _fromIndex, _toIndex).then(function(_data){
                    // if we do delete a track before the current playing one we have to bend the uri again with the correct track number
                    self.updatePlaylistCurrentSelectedTrackNumber(_rendererUdn).then(function(_data){
                        _resolve(_data);
                    }).catch(function(_data){
                        _reject(_data);
                    });
                }).catch(function(_data){
                    _reject(_data);
                });
            }).catch(function(_data){
                _reject(_data);
            });
        });  
    }
    
    
    moveItemInPlaylist(_rendererUdn, _mediaItemId, _newIndex)
    {
        var self = this;
        self.logVerbose("Move item '" + _mediaItemId + "' in _renderer '" + _rendererUdn  + "' to index " + _newIndex.toString());
        // the "_mediaItemId" has to consist of the id of the _rendererUdn item of course, so on fact "_rendererUdn" is not really needed here        
        return new Promise(function(_resolve, _reject){
            self.createQueuePlaylist(_rendererUdn).then(function(_data){
                self.setCurrentSelectedItem(_rendererUdn);
                self.moveItemInQueue(_mediaItemId, _newIndex).then(function(_data){
                    // if we do move a track before the current playing one or if we move the current playing one we have to bend the uri again with the correct track number                    
                    self.updatePlaylistCurrentSelectedTrackNumber(_rendererUdn).then(function(_data){
                        _resolve(_data);
                    }).catch(function(_data){
                        _reject(_data);
                    });
                    _resolve(_data);
                }).catch(function(_data){
                    _reject(_data);
                });
            }).catch(function(_data){
                _reject(_data);
            });
        });  
    }


    updatePlaylistCurrentSelectedTrackNumber(_rendererUdn)
    {   
        var self = this;         
        // if a playlist was updated after we have done some action on it we have to reassign the track number with the 'fii' option
        // in fact we have to search the track number/index for the current playing object id and set it again (due it may have been
        // changed from one of the playlist action), so we do reread the list for the renderer and search for the object
        return new Promise(function(_resolve, _reject){
            self.managerDisposer.mediaListManager.getMediaList("SEL|" + _rendererUdn, self.getQueueIdFromNameAndBase(self.getQueueNameFromRendererUdn(_rendererUdn)), false, false).then(function(_data){
                var selectedItem = self.getCurrentSelectedItem(_rendererUdn);
                var foundTrackNumber = 0;
                self.logSilly("Try to find track for renumbering: ", selectedItem);
                if(_data && _data.length)
                {
                    for(var i=0; i<_data.length; i++)
                    {
                        if(_data[i].id == selectedItem.id)
                        {
                            self.logSilly("Found track for renumbering on index " + i.toString());
                            foundTrackNumber= (i + 1);
                            break;
                        }
                    }
                }

                // set the new track number by bending it to the renderer
                if(foundTrackNumber > 0)
                {
                    var mediaRenderer = self.managerDisposer.deviceManager.getVirtualMediaRenderer(_rendererUdn);
                    if (mediaRenderer)
                    {
                        // in this case we came here the rendere should have a queue (container) refereced so we can use this queue
                        //mediaRenderer.loadContainer(mediaRenderer.mediaOriginData.containerId, "", foundTrackNumber, true);
                        mediaRenderer.loadContainer(self.getQueueIdFromNameAndBase(self.getQueueNameFromRendererUdn(_rendererUdn)), "", foundTrackNumber, true).then(function(_data){
                            _resolve(foundTrackNumber);
                        }).catch(function(_error){
                            _reject(_error);
                        });
                    }
                    else
                    {
                        _reject(new Error("No media renderer with udn '" + _rendererUdn  + "' found!"));
                    }   
                    return; 
                }  

                // we came here if the track number was not found, that means we may have deleted it?
                // TODO: not really sure what we should do here, we may set the query again with the current track number (no binding)
                _resolve(foundTrackNumber); 

            }).catch(function(_data){        
                _reject(_data);
            });
        });
    }

}