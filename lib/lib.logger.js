'use strict'; 
var EventEmitter = require("events").EventEmitter;


/**
 * A simple logger class that will be used throughout the raumkernel lib
 * It emits an log event so any kind of logger can be attached
 */
module.exports = class Logger extends EventEmitter
{
    /**
     * Constructor of the logger class     
     * @param {Number} the maximum log level which should be logged
     * @return {Object} The logger object
     */
    constructor(_logLevel)
    {
        super()
        // this is the maximum log level that will be logged 
        this.logLevel = _logLevel;    
    }    
    
    /**
     * log a text to the activated outputs  
     * @param {Number} the log type
     * @param {String} the log text
     * @param {Object} some additional meta data object
     */
    log(_logType, _log, _metadata = null)
    { 
        if(_logType <= this.logLevel)
            this.emit("log", { "logType" : _logType, "log" : _log, "metadata" : _metadata });    
    }
    
    /**
     * log a error 
     * @param {String} the log text
     * @param {Object} some additional meta data object
     */
    logError(_log, _metadata = null)
    {
        this.log(0, _log, _metadata);
    }
    
    /**
     * log a warning 
     * @param {String} the log text
     * @param {Object} some additional meta data object
     */
    logWarning(_log, _metadata = null)
    {
        this.log(1, _log, _metadata);
    }
    
    /**
     * log a info 
     * @param {String} the log text
     * @param {Object} some additional meta data object
     */
    logInfo(_log, _metadata = null)
    {
        this.log(2, _log, _metadata);
    }
    
    /**
     * log a verbose 
     * @param {String} the log text
     * @param {Object} some additional meta data object
     */
    logVerbose(_log, _metadata = null)
    {
        this.log(3, _log, _metadata);
    }
    
    /**
     * log a debug 
     * @param {String} the log text
     * @param {Object} some additional meta data object
     */
    logDebug(_log, _metadata = null)
    {
        this.log(4, _log, _metadata);
    }
    
    /**
     * log a silly 
     * @param {String} the log text
     * @param {Object} some additional meta data object
     */
    logSilly(_log, _metadata = null)
    {
        this.log(5, _log, _metadata);
    }
    
      
    
}



