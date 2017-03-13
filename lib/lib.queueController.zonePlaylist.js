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

}