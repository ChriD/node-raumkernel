'use strict'; 
var Url = require('url');
var Device = require('./lib.device.base');

/**
 * this is the base class to use for child's which are UPNP devices
 */
module.exports = class UPNPDevice extends Device
{
    constructor(_upnpClient)
    {
        super();        
        this.upnpClient = _upnpClient;
        this.upnpClient.userAgent = "RaumfeldControl/3.10 RaumfeldProtocol/399";
    }
    
    name()
    {
        return this.upnpClient.deviceDescription.friendlyName;
    }

    id()
    {
        // in fact USN/UDN should not be used as an ID as mentioned here: https://www.w3.org/2009/dap/track/issues/151
        return this.upnpClient.deviceDescription.UDN;
    }
    
    /**
     * used to return the host (IP) of the device
     * @return {String} the host (IP) of the device
     */
    host()
    {
        return Url.parse(this.upnpClient.url).hostname;
    }
    
    /**
     * used to return a the UDN of the device
     * @return {String} the UDN of the UPNP device
     */    
    udn()
    {       
        return this.upnpClient.deviceDescription.UDN;
    }
    
    /**
     * used to return a the modelNumber of the device
     * @return {String} the modelNumber of the UPNP device
     */  
    modelNumber()
    {
        return this.upnpClient.deviceDescription.modelNumber;
    }
    
    /**
     * used to return a the manufacturer of the device
     * @return {String} the manufacturer of the UPNP device
     */  
    manufacturer()
    {
        return this.upnpClient.deviceDescription.manufacturer;
    }
    
    /**
     * used to return a the friendlyName of the device
     * @return {String} the friendlyName of the UPNP device
     */  
    friendlyName()
    {
        return this.upnpClient.deviceDescription.friendlyName;
    }
    
    /**
     * should be used to call an action on a service of the device
     * @return {Promise} a promise with the result as parameter
     */
    callAction(_service, _action, _params, _resultSetFunction = null)
    {
        var self = this;
        this.logDebug("Call " + _action + " from " + this.name());
               
        return new Promise(function(resolve, reject){
            self.upnpClient.callAction(_service, _action, _params, function (_err, _result) {
                if(!_err && _result)
                {
                    self.logDebug("Result of " + _action + " for " + self.name() + " is " + JSON.stringify(_result));
                    if(_resultSetFunction)
                        resolve(_resultSetFunction(_result));
                    else
                    {
                        resolve(_result);
                    }
                }
                else
                {
                   self.logError(_action + " on " + self.name() + " failed with params: " + JSON.stringify(_params), _err); 
                   reject(_err);
                }
            });
        })
    }
    
    /**
     * use this method to subscribe to services of the upnp device     
     */
    subscribe()
    {
    }
    
    /**
     * use this method to unsubscribe to services of the upnp device     
     */
    unsubscribe()
    {
    }
    
}