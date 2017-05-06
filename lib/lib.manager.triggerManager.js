'use strict'; 
var Url = require('url');
var ManagerBase = require('./lib.manager.base');


module.exports = class TriggerManager extends ManagerBase
{
    constructor()
    {
        super()
        this.triggers = {}
    }

    additionalLogIdentifier()
    {
        return "TriggerManager";
    }

    /**
     * trigger a change in a state of the system (renderer, zones, ...)
     * @param {String} context of the trigger
     * @param {String} type of the trigger
     * @param {Object} dta for the trigger
     * @return {Promise} ???
     */
    trigger(_context, _type, _data)
    {    
        // search triggers for valid trigger and do a shot if found. If its a one shot trigger, then remove it from the array
        // i have to keep an eye on the performance here...
        var mapKey = this.createTriggerKey(_context, _type, _data)
        if(this.triggers[mapKey] && this.triggers[mapKey].length)
        {
            var triggerArray = this.triggers[mapKey]
            var i = triggerArray.length        
            while (i--) 
            {  

                if(_context == "renderer" && _type == "rendererStateKeyValueChanged")
                {
                    if(triggerArray[i].data.value.toString().toLowerCase() == _data.value.toString().toLowerCase())
                    {
                        triggerArray[i].callback(triggerArray[i], _data);
                        if (triggerArray[i].oneShot)
                        {
                            triggerArray.splice(i,1);
                        }
                    }    
                }

                if(_context == "zone")
                {
                    if(_type == "zoneCreated")
                    {     
                        if(triggerArray[i].data.roomUDN.toString().toLowerCase() == _data.roomUDN.toString().toLowerCase())
                        {
                            triggerArray[i].callback(triggerArray[i], _data);
                            if (triggerArray[i].oneShot)
                            {
                                triggerArray.splice(i,1);
                            }
                        }
                    }

                    if(_type == "zoneRemoved")
                    {     
                        if(triggerArray[i].data.zoneUDN.toString().toLowerCase() == _data.zoneUDN.toString().toLowerCase())
                        {
                            triggerArray[i].callback(triggerArray[i], _data);
                            if (triggerArray[i].oneShot)
                            {
                                triggerArray.splice(i,1);
                            }
                        }
                    }
                }
                
                // TODO: Other contexts           
            }
        }        
    }


    setupTrigger(_context, _type, _triggerData, _oneShot, _callback)
    {
        var self = this;
        this.logDebug("Trigger for " + _context  + "// " + _type + " was set up", _triggerData);               
        
        var mapKey = this.createTriggerKey(_context, _type, _triggerData)
   
        if(!this.triggers[mapKey])
            this.triggers[mapKey] = new Array()

        // Add trigger data to triggers    
        this.triggers[mapKey].push({
            "context"   : _context,
            "type"      : _type, 
            "data"      : _triggerData,
            "oneShot"   : _oneShot,
            "callback"  : _callback
        });
    }


    createTriggerKey(_context, _type, _data)
    {
        var key = _context + '|' + _type + '|' 
        if(_context == "renderer" && _type == "rendererStateKeyValueChanged")
            key += _data.key;
        return key;
    }

    /* e.g.:

        trigger("renderer", "rendererStateChanged", {   "renderer" : "uuid:000:xxx:fff"
                                                        "key": "volume"  
                                                        "value": 25
            })

        trigger("renderer", "rendererStateChanged", {   "renderer" : "uuid:000:xxx:fff"
                                                        "key": "TransportState"  
                                                        "value": "PLAYING"
            })

        trigger("renderer", "rendererStateChanged", {   "renderer" : "uuid:000:xxx:fff"
                                                        "key": "Online"  
                                                        "value": true
            })

        trigger("system", "systemStateChanged", {   "key": "Online"  
                                                    "value": true
            })

        trigger("zone", "roomAdded", {  "zone": "uuid:000:xxx:fff"  
                                        "value": "Bad"
            })

        trigger("zone", "roomRemoved", {  "zone": uuid:000:xxx:fff"  
                                          "value": "Bad"
            })

        trigger("zone", "zoneCreated", {  "renderer": "uuid:000:xxx:fff"                                                                                      
            })

        ----------------------------------

        e.g.: Wait for transport state to be playing
        setupTrigger("renderer", "rendererStateChanged", { "renderer" : "uuid:000:xxx:fff", "key": "TransportState" , "value": "PLAYING" }, true, function(){
            _resolve();
        })

    */    

}