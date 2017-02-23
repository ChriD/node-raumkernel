'use strict'; 

var path = './lib/';

module.exports = {   
    Raumkernel : require(path + "lib.raumkernel"),
    Logger : require(path + "lib.logger"),
    Base : require(path + "lib.base"),
    BaseManager : require(path + "lib.base.manager"),
    MediaRenderer : require(path + "lib.device.upnp.mediaRenderer"),
    MediaRendererRaumfeld : require(path + "lib.device.upnp.mediaRenderer.raumfeld"),
    MediaRendererRaumfeldVirtual : require(path + "lib.device.upnp.mediaRenderer.raumfeldVirtual"),
    MediaServer : require(path + "lib.device.upnp.mediaServer"),
    MediaServerRaumfeld : require(path + "lib.device.upnp.mediaServer.raumfeld"),
    ManagerBase : require(path + "lib.manager.base"),    
    DeviceManager : require(path + "lib.manager.deviceManager"),
    ZoneManager : require(path + "lib.manager.zoneManager"),
    ManagerDisposer : require(path + "lib.managerDisposer"),
}
