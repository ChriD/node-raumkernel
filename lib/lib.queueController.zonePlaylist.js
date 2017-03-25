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
    }


    additionalLogIdentifier()
    {
        return "QueueControllerZonePlaylist";
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
                                 // TODO: @@@ bend new uri?
                                _resolve(createdQueueData.QueueID);
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
                self.addItemToQueue(self.getQueueNameFromRendererUdn(_rendererUdn), _mediaItemId, _position, _isItemsContainer, _startIndex, _endIndex).then(function(_data){
                    _resolve(_data);
                }).catch(function(_data){
                    _reject(_data);
                });
            }).catch(function(_data){
                _reject(_data);
            });
        });        
    }
    
    
    removeItemsFromPlaylist(_rendererUdn, _fromPosition, _toPosition)
    {
        var self = this;
        self.logVerbose("Remove items '" + _fromPosition.toString() + "' to '" + _toPosition.toString()  + "' on renderer '" + _rendererUdn + "'");        
        return new Promise(function(_resolve, _reject){
            self.createQueuePlaylist(_rendererUdn).then(function(_data){
                self.removeItemsFromQueue(self.getQueueNameFromRendererUdn(_rendererUdn), _fromPosition, _toPosition).then(function(_data){
                    _resolve(_data);
                }).catch(function(_data){
                    _reject(_data);
                });
            }).catch(function(_data){
                _reject(_data);
            });
        });  
    }
    
    
    moveItemInPlaylist(_rendererUdn, _mediaItemId, _newPosition)
    {
        var self = this;
        self.logVerbose("Move item '" + _mediaItemId + "' in _renderer '" + _rendererUdn  + "' to position " + _newPosition.toString());
        // the "_mediaItemId" has to consist of the id of the _rendererUdn item of course, so on fact "_rendererUdn" is not really needed here        
        return new Promise(function(_resolve, _reject){
            self.createQueuePlaylist(_rendererUdn).then(function(_data){
                self.moveItemInQueue(_mediaItemId, _newPosition).then(function(_data){
                    _resolve(_data);
                }).catch(function(_data){
                    _reject(_data);
                });
            }).catch(function(_data){
                _reject(_data);
            });
        });  
    }

}


/*
 public virtual Boolean isQueue()
        {
            if (!String.IsNullOrEmpty(containerId))
                return containerId.IndexOf("0/Zones/") != -1;
            return false;
        }
        */


/*
protected virtual Boolean createQueue()
        {
            System.String givenName, queueIdCreated;
            uint cuid;            

            if (this.isQueue())
                return false;

            contentDirectory.CreateQueueSync(listId, "0/Zones", out givenName, out queueIdCreated, out containerInfoMetaData);

            if(!String.IsNullOrWhiteSpace(queueIdCreated))
                this.writeLog(LogType.Error, String.Format("Fehler beim erstellen einer queue aus containerID '{0}'", containerId));

            contentDirectory.RemoveFromQueueSync(queueIdCreated, 0, 4294967295, out cuid);

            if (this.list.Count > 0)
            {
                // move container or item to queue (Sync)
                if (!String.IsNullOrEmpty(containerId))
                    contentDirectory.AddContainerToQueueSync(queueIdCreated, containerId, containerId, "", "", 0, 4294967295, 0);
                else
                    // there hast to be only one object in list! otherwise it would be a container ora a queue!
                    contentDirectory.AddItemToQueueSync(queueIdCreated, this.list[0].objectId, 0);
            }

            containerId = queueIdCreated;

            // reread list from new queue! (Sync!) we have to get the new list with the new ids!!!
            this.retrieveListByContainerId(containerId, "*", true);

            return true;
        }
        */
