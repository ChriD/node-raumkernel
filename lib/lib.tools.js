

/**
 * use this to encode a string for the content directory
 * @param {String} the string which should be encoded
 * @param {String} encoded string
 */
var encodeString = exports.encodeString=function(_string)
{
    return encodeURIComponent(_string)/*.replace(/\-/g, "%2D").replace(/\_/g, "%5F")*/.replace(/\./g, "%2E").replace(/\!/g, "%21").replace(/\~/g, "%7E").replace(/\*/g, "%2A").replace(/\'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29");
}
    
    
/**
 * use this to decode a string for the content directory
 * @param {String} the string which should be decoded
 * @param {String} decoded string
 */
var decodeString = exports.decodeString=function(_string)
{
    return decodeURIComponent(_string/*.replace(/\%2D/g, "-").replace(/\%5F/g, "_")*/.replace(/\%2E/g, ".").replace(/\%21/g, "!").replace(/\%7E/g, "~").replace(/\%2A/g, "*").replace(/\%27/g, "'").replace(/\%28/g, "(").replace(/\%29/g, ")"));
}


var isUrl = exports.isUrl=function(_string) 
{
    var regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
    return regexp.test(_string);
}  


exports.createAVTransportUriForContainer=function(_mediaServerUdn, _containerId, _trackIndex = -1)
{
    // a valid transport uri looks like this!
    //dlna-playcontainer://uuid%3Aed3bd3db-17b1-4dbe-82df-5201c78e632c?sid=urn%3Aupnp-org%3AserviceId%3AContentDirectory&cid=0%2FPlaylists%2FMyPlaylists%2FTest&md=0
    var uri = "";
    uri = encodeString(_mediaServerUdn) + "?sid=" + encodeString("urn:upnp-org:serviceId:ContentDirectory") + "&cid=" + encodeString(_containerId) + "&md=0";
    if(_trackIndex >= 0)
        uri += "&fii=" + encodeString(_trackIndex.toString());
    uri = "dlna-playcontainer://" + uri;   
    return uri;
}

exports.createAVTransportUriForSingle=function(_mediaServerUdn, _singleId)
{
    // a valid transport uri looks like this!
    //dlna-playsingle://uuid%3Aed3bd3db-17b1-4dbe-82df-5201c78e632c?sid=urn%3Aupnp-org%3AserviceId%3AContentDirectory&iid=0%2FRadioTime%2FLocalRadio%2Fs-s68932
    var uri = "";
    uri = encodeString(_mediaServerUdn) + "?sid=" + encodeString("urn:upnp-org:serviceId:ContentDirectory") + "&iid=" + encodeString(_singleId);
    uri = "dlna-playsingle://" + uri; 
    return uri;
}