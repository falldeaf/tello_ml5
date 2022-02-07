'use strict';

require('dotenv').config();
const fs = require('fs');
const delay = require('await-delay');
const wifi = require('node-wifi');
const ping = require('ping');
const sdk = require('tellojs');

var private_key  = fs.readFileSync('server.key', 'utf8');
var certificate = fs.readFileSync('server.cert', 'utf8');
var credentials = {key: private_key, cert: certificate};

const https = require("https");
const websocket = require('ws');
const express = require('express');
const app = express();
const port = 8000;

app.get('/video', (req, res) => {
	res.send('Trying to connect and command');
	sdk.control.connect()
	.then(() => turnOnVideo());
	//.then((result) => console.log(result))
	//.catch((error) => console.error(error))
});

app.get('/connect/:post', async (req, res) => {
	res.send('connecting...');

	
	while(!await scan('TELLO')){ await delay(3000); }
	await delay(2000);
	await connectCommand();
	while(!await pingtest('192.168.10.1')){ await delay(1000); }
	console.log(await sdk.control.connect());
	console.log('drone fully connected');

	/*console.log(await sdk.control.takeOff());
	console.log(await sdk.set.speed(50));
	console.log(await sdk.control.move.up(4));
	console.log(await sdk.control.move.down(4));
	console.log(await sdk.control.move.left(4));
	console.log(await sdk.control.rotate.clockwise(180));
	console.log(await sdk.control.land());*/

	//set default speed
	//await sdk.set.speed(30);

	const stateEmitter = await sdk.receiver.state.bind();
	stateEmitter.on('message', res => comms_wss.broadcast('{"tele":' + JSON.stringify(res) + '}'));

	if(req.params.post === 'video') turnOnVideo();
});

app.get('/disconnect', (req, res) => {
	res.send('disconnecting...');
	wifi.disconnect(error => {
		if (error) {
			console.log(error);
		} else {
			console.log('Disconnected');
		}
	});
})

app.use(express.static('static'))
app.use('/scripts', express.static(__dirname + '/node_modules/jmuxer/dist/'));

/*app.listen(port, () => {
	console.log(`App ready at http://localhost:${port}/index.html`)
});*/

var server = https.createServer(credentials, app)
server.listen(port, () => {
	console.log(`App ready at https://localhost:${port}/index.html`)
});


var connected_to_drone = false;

//Video Websocket
const vserver = https.createServer(credentials);
const video_wss = new websocket.Server({server: vserver}); //, perMessageDeflate: false});
let latest_client = {};
video_wss.on('connection', function(client) {
	console.log("new video websocket conn.");
	latest_client = client;
});
video_wss.broadcast = (data)=> {
	if(latest_client.readyState === websocket.OPEN) latest_client.send(data);
	/*video_wss.clients.forEach(function each(client) {
		if (client.readyState === websocket.OPEN) {
			client.send(data);
		}
	});*/
}
vserver.listen(5544);

/*//var video_clients = [];
video_ws.binaryType = 'arraybuffer';
//video_ws.on('upgrade', ws.handleUpgrade);
video_ws.on('request', function(request) {
	const connection = request.accept(null, request.origin);
	video_clients.push(connection) - 1;

	connection.on('connection', function(video_ws) {
		console.log("new conn.");
		console.log(video_ws.clients);
	});
});
video_ws.broadcast = function(data) {
	video_clients.forEach(client => client.send(data));
};*/


//Bidirectional Comms Websocket
const cserver = https.createServer(credentials);
const comms_wss = new websocket.Server({server: cserver, perMessageDeflate: false});
comms_wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(data) {
		//console.log(data);
		try {
			var client_message_obj = JSON.parse(data);
			switch(client_message_obj.type) {
				case "command":
					runCommand(client_message_obj);
					break;
			}
		} catch (e) {
			return console.error(e);
		}
	});
});
comms_wss.broadcast = function(data) {
	comms_wss.clients.forEach(function each(client) {
		if (client.readyState === websocket.OPEN) {
			client.send(data);
		}
	});
}
cserver.listen(5533);

wifi.init({
	iface: null // network interface, choose a random wifi interface if set to null
});

async function runCommand(comm) {
	console.log(comm);
	sendLog(`Saw ${comm.name} command with value ${comm.val}`);
	var int_val = parseInt(comm.val);
	switch(comm.name) {
		case "takeoff":
			await sdk.control.takeOff();
			break;
		case "land":
			await sdk.control.land();
		case "speed":
			await sdk.set.speed(int_val);
			sendLog(await sdk.read.speed());
			break;
		case "emergency":
			await sdk.control.emergency();
			break;
		case "stop":
			await sdk.control.stop();
			break;
		case "up":
			await sdk.control.move.up(int_val)
			break;
		case "down":
			await sdk.control.move.down(int_val);
			break;
		case "left":
			await sdk.control.move.left(int_val);
			break;
		case "right":
			await sdk.control.move.right(int_val);
			break;
		case "front":
			await sdk.control.move.front(int_val);
			break;
		case "back":
			await sdk.control.move.back(int_val);
			break;
		case "rotateleft":
			await sdk.control.rotate.clockwise(int_val);
			break;
		case "rotateright":
			await sdk.control.rotate.counterClockwise(int_val);
			break;
		case "flipleft":
			await sdk.control.flip.left();
			break;
		case "flipright":
			await sdk.control.flip.right();
			break;
		case "flipfront":
			await sdk.control.flip.front();
			break;
		case "flipback":
			await sdk.control.flip.back();
			break;
	}
}

var h264chunks = []
var numChunks = 3
var numChunkz = 0
async function turnOnVideo() {
	const video_emitter = await sdk.receiver.video.bind() 
	video_emitter.on('message', data => {
		var idx = data.indexOf(Buffer.from([0, 0, 0, 1]))
		if (idx > -1 && h264chunks.length > 0) {
			h264chunks.push(data.slice(0, idx))
			numChunkz = numChunkz + 1
			if (numChunkz === numChunks) {
				video_wss.broadcast(Buffer.concat(h264chunks));
				h264chunks = []
				numChunkz = 0
			}
			h264chunks.push(data.slice(idx)) 
		} else {
			h264chunks.push(data)
		}
	});
}

async function connectCommand() {
	console.log('connecting to Tello WIFI AP...');
	return new Promise((resolve, reject) => {
		wifi.connect({ ssid: process.env.ssid, password: process.env.pass }, async error => {
			if (error) { console.log(error); }
			console.log('Connected');
			sendLog("connected");
			await delay(1000);
			return resolve(error);
		});
	});
}

function pingtest(host) {
	return new Promise((resolve, reject) => {
		ping.sys.probe(host, function (isAlive) {
			var msg = isAlive ? 'host ' + host + ' is alive' : 'host ' + host + ' is dead';

			sendLog(msg);
			console.log(msg);
			return resolve(isAlive);
		});
	});
}

function scan(search) {
	return new Promise((resolve, reject) => {
		wifi.scan((err, networks) => {
				if (err) {
					return reject(err);
				}
				var string_contains = false;
				networks.some(network => {
					if(network.ssid.includes(search)) {
						console.log(search + " found!");
						sendLog(search + " found!");
						return resolve(true);
					}
				});
				sendLog("Searching for " + search);
				console.log(search + " not found");
				return resolve(false);
			}
		);
	});
}

function sendLog(message) {
	console.log(message.trim());
	comms_wss.broadcast('{"pong":"' + message + '"}');
}

process.on('unhandledRejection', function(reason, promise) {
	console.log(promise);
});