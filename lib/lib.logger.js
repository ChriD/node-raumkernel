'use strict'; 
var Winston = require('winston');

// TODO: https://www.npmjs.com/package/winston-daily-rotate-file


/**
 * In fact we will use an external library for logging but we do encapsulate it in an own lib logger class 
 * so we can switch the external logger very easy to another one
 */
module.exports = class Logger
{
    /**
     * Constructor of the logger class     
     * @param {Number} the maximum log level which should be logged
     * @return {Object} The logger object
     */
    constructor(_logLevel)
    {
        // we do use an external logger library for do the logging, so this is the var for that
        this.externalLoggerObject = null;    
        // this is the maximum log level that will be logged 
        this.logLevel = _logLevel;     
        // we do initialize the external logger directly when creating the lib logger object
        this.initExternalLogger();
    }
    
    /**
     * do the initialization of the external logger library
     */
    initExternalLogger()
    {
        var logLevelSettings = {
            levels: {
                error: 0,
                warn: 1,
                info: 2,
                verbose: 3,
                debug: 4,
                silly: 5
            },
            colors: {
                error: 'red',
                warn: 'yellow',
                info: 'green',
                verbose: 'gray',
                debug: 'grey',
                silly: 'grey'
            }
        };
        
        this.externalLoggerObject = new (Winston.Logger)(
            {                
                level: this.logLevelToExternalLogLevel(this.logLevel),
                levels: logLevelSettings.levels,
                colors: logLevelSettings.colors, 
                transports: 
                [
                    new (Winston.transports.Console)({ colorize: true, handleExceptions: true, humanReadableUnhandledException: true, json: false }),
                    new (Winston.transports.File)({ filename: 'app.log', handleExceptions: true, humanReadableUnhandledException: true, json: false }) 
                ],
                exceptionHandlers: [
                    new (Winston.transports.File)({ filename: 'exceptions.log' })
                ]
            }
        );
        
        this.externalLoggerObject.exitOnError = false;
    }
    
    /**
     * converts the given log level to a log level the external logger recognizes  
     * @param {Number} the log level
     * @return {Anytype} the log level formatted for the external logger library
     */
    logLevelToExternalLogLevel(_logLevel)
    {
        var logLevelStr = "";        
        switch (_logLevel)
        {
            case 0: 
                logLevelStr = "error"; 
                break;
            case 1: 
                logLevelStr = "warn"; 
                break;
            case 2: 
                logLevelStr = "info"; 
                break;
            case 3: 
                logLevelStr = "verbose"; 
                break;
            case 4: 
                logLevelStr = "debug"; 
                break;
            case 5: 
                logLevelStr = "silly"; 
                break;
            default : 
                logLevelStr = "info"
        }        
        return logLevelStr;
    }
    
    /**
     * converts the given log level to a log level the external logger recognizes  
     * @param {Number} the log level
     * @return {Anytype} the log level formatted for the external logger library
     */
    logTypeToExternalLogType(_logLevel)
    {
        return this.logLevelToExternalLogLevel(_logLevel);
    }
    
    /**
     * log a text to the activated outputs  
     * @param {Number} the log type
     * @param {String} the log text
     * @param {Object} some additional meta data object
     */
    log(_logType, _log, _metadata = null)
    { 
        if (!this.externalLoggerObject || !_log || _log === "")
            return;
        this.externalLoggerObject.log(this.logTypeToExternalLogType(_logType), _log, _metadata);
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



