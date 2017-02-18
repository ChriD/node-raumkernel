'use strict'; 
var Logger = require('./lib.logger');
var EventEmitter = require("events").EventEmitter;


/**
 * This is the base class all classes will be derived from.
 * It contains some basic functionality like log methods
 */
module.exports = class Base extends EventEmitter
{

    /**
     * Constructor of the base class          
     * @return {Object} The base object
     */
    constructor()
    {
        super();
        //EventEmitter.call(this);
        this.logger = null;        
    }
    
    /**
     * used to set or to get the logger object
     * @param {Object} the instanced of the logger
     * @return {Object} the instanced of the logger
     */
    parmLogger(_logger = this.logger)
    {
        this.logger = _logger;
        return this.logger;
    }
    
    /**
     * used to return an additional log identifier for specifying the log origin       
     * @return {String} additional log identidier
     */
    additionalLogIdentifier()
    {
        return "";
    }
    
    /**
     * log to the logger object 
     * @param {Number} the log type
     * @param {String} the log text
     * @param {Object} some additional meta data object
     */
    log(_logType, _log, _metadata  = null)
    {
        if(this.logger && _log)
        {
            if(this.additionalLogIdentifier())
                this.logger.log(_logType, "\x1b[90m[" + this.additionalLogIdentifier() + "]\x1b[0m" + " " +  _log, _metadata);
            else
                this.logger.log(_logType, _log, _metadata);
        }
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

