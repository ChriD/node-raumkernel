'use strict'; 
var UPNPDevice = require('./lib.device.base.upnp');

/**
 * this is the base class to use for child's which are media Renderer devices
 */
module.exports = class UPNPMediaRenderer extends UPNPDevice
{
    constructor(_upnpClient)
    {
        super(_upnpClient);
    }
}



/*

var log = require('loglevel');
var utils = require("./utils");

function RaumfeldRenderer(client) {
    this.client = client;
    this.name = client.deviceDescription.friendlyName;
    this.uuid = client.deviceDescription.UDN;
    this.manufacturer = client.deviceDescription.manufacturer;
    this.modelNumber = client.deviceDescription.modelNumber;
}

RaumfeldRenderer.prototype.getVolume = function () {
    var self = this;
    log.debug("Getting volume of " + this.name);
    return utils.deferredAction(
        this.client,
        "RenderingControl",
        "GetVolume",
        {"Channel": "Master"},
        function (result) {
            log.debug("Volume of " + self.name + " is " + result.CurrentVolume);
            return result.CurrentVolume;
        }
    );
}

RaumfeldRenderer.prototype.setVolume = function (volume) {
    var self = this;
    log.debug("Setting volume of " + this.name + " to " + volume);
    return utils.deferredAction(
        this.client,
        "RenderingControl",
        "SetVolume",
        {"Channel": "Master", "DesiredVolume": volume},
        function (result) {
            log.debug("Volume of " + self.name + " has been set to " + volume);
        }
    );
}

RaumfeldRenderer.prototype.getMute = function () {
    var self = this;
    log.debug("Getting mute state of " + this.name);
    return utils.deferredAction(
        this.client,
        "RenderingControl",
        "GetMute",
        {"Channel": "Master"},
        function (result) {
            log.debug(self.name + " mute state: " + result.CurrentMute);
            return result.CurrentMute;
        }
    );
}

RaumfeldRenderer.prototype.mute = function () {
    var self = this;
    log.debug("Muting " + this.name);
    return utils.deferredAction(
        this.client,
        "RenderingControl",
        "SetMute",
        {"Channel": "Master", "DesiredMute": true},
        function () {
            log.debug(self.name + " has been muted");
            return true;
        }
    );
}

RaumfeldRenderer.prototype.unmute = function () {
    var self = this;
    log.debug("Unmuting " + this.name);
    return utils.deferredAction(
        this.client,
        "RenderingControl",
        "SetMute",
        {"Channel": "Master", "DesiredMute": false},
        function () {
            log.debug(self.name + " has been unmuted");
            return true;
        }
    );
}

RaumfeldRenderer.prototype.pause = function () {
    var self = this;
    log.debug("Pausing playback on " + this.name);
    return utils.deferredAction(
        this.client,
        "AVTransport",
        "Pause",
        {},
        function (result) {
            log.debug("Playback on " + self.name + " has been paused");
            return true;
        }
    );
}

RaumfeldRenderer.prototype.play = function () {
    var self = this;
    log.debug("Starting playback on " + this.name);
    return utils.deferredAction(
        this.client,
        "AVTransport",
        "Play",
        {},
        function () {
            log.debug("Playback on " + self.name + " has been started");
            return true;
        }
    );
}

RaumfeldRenderer.prototype.stop = function () {
    var self = this;
    log.debug("Stopping playback on " + this.name);
    return utils.deferredAction(
        this.client,
        "AVTransport",
        "Stop",
        {},
        function () {
            log.debug("Playback on " + self.name + " has been stopped");
            return true;
        }
    );
}
*/