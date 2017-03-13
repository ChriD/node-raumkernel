'use strict'; 
var Logger = require('./lib.logger');
var BaseManager = require('./lib.base.manager');
var ManagerDisposer = require('./lib.managerDisposer');

module.exports = class QueueController extends BaseManager
{
    constructor()
    {
        super();
        this.mediaServer = null;
        this.queueBaseContainerId = "";
    }

    additionalLogIdentifier()
    {
        return "QueueController";
    }
    
    parmQueueBaseContainerId(_queueBaseContainerId = this.queueBaseContainerId)
    {
        this.queueBaseContainerId = _queueBaseContainerId;
        return this.queueBaseContainerId;
    }

    parmMediaServer(_mediaServer = this.mediaServer)
    {
        this.mediaServer = _mediaServer;
        return this.mediaServer;
    }
    
    getQueueIdFromNameAndBase(_queueName, _baseContainerId = this.queueBaseContainerId)
    {
        return _baseContainerId + "/" + this.encodeString(_queueName);
    }
    
    createQueue(_queueName)
    {
        if(!this.mediaServer)
            return Promise.reject(new Error("MediaServer not ready!"));
        return this.mediaServer.createQueue(_queueName, this.queueBaseContainerId);
    }
    
    deleteQueue(_queueName)
    {
        if(!this.mediaServer)
            return Promise.reject(new Error("MediaServer not ready!"));
        return this.mediaServer.destroyObject(this.getQueueIdFromNameAndBase(_queueName));
    }
    
    renameQueue(_oldQueueName, _newQueueName)
    {
        if(!this.mediaServer)
            return Promise.reject(new Error("MediaServer not ready!"));
        return this.mediaServer.renameQueue(this.getQueueIdFromNameAndBase(_oldQueueName), _newQueueName);
    }
    
}