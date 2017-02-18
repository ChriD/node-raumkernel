/*
* Author: Hari Manikkothu
*
*/

var PORT = 1900;
var HOST = '10.0.0.4'; //This is your local IP
var dgram = require('dgram');
var client = dgram.createSocket('udp4');
var client2 = dgram.createSocket('udp4');

client.on('listening', function () {
    var address = client.address();
    console.log('UDP Client listening on ' + address.address + ":" + address.port);
    client.setMulticastTTL(128); 
    //client.setBroadcast(true);
    client.addMembership('239.255.255.250', HOST);
});

client.on('message', function (msg, remote) {   
    console.log('UPnP Broadcast recieved.');
    console.log('From: ' + remote.address + ':' + remote.port);
});



client2.on('listening', function () {
    var address = client2.address();
    console.log('2: UDP Client listening on ' + address.address + ":" + address.port);
    client2.setMulticastTTL(128); 
    //client2.setBroadcast(true);
    client2.addMembership('239.255.255.250', HOST);
});

client2.on('message', function (msg, remote) {   
    console.log('2: UPnP Broadcast recieved.');
    console.log('2: From: ' + remote.address + ':' + remote.port);
});

//client2.bind({port:1900, address :"10.0.0.4", exclusive : false})
search();

//client.bind(PORT);


function search() {
	
	var message = new Buffer(
		"M-SEARCH * HTTP/1.1\r\n" +
		"HOST:239.255.255.250:"+PORT+"\r\n" +      
		"MAN:\"ssdp:discover\"\r\n" +
		"ST:ssdp:all\r\n" + // Essential, used by the client to specify what they want to discover, eg 'ST:ge:fridge'
		"MX:1\r\n" + // 1 second to respond (but they all respond immediately?)
		"\r\n"
	);

    //var clientX = dgram.createSocket("udp4");
	client.bind({port:PORT, /*address :"10.0.0.4",*/ exclusive : false}); // So that we get a port so we can listen before sending	
	client.send(message, 0, message.length, PORT, "239.255.255.250");
	//client.close();
}