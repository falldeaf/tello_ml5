'use strict';

require('dotenv').config();
const delay = require('await-delay');
const wifi = require('node-wifi');
const ping = require('ping');
const express = require('express');
const app = express();
const port = 8000;
const sdk = require('tellojs');

var connected_to_drone = false;

//Video Websocket
const http = require('http');
const WebSocketServer = require('websocket').server;
const server = http.createServer();
server.listen(5544);
const video_ws = new WebSocketServer({
	httpServer: server
});
var video_clients = [];
video_ws.binaryType = 'arraybuffer';
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
};

//Bidirectional Comms Websocket
const http2 = require('http');
const WebSocketServer2 = require('websocket').server;
const server2 = http2.createServer();
server2.listen(5533);
const comms_ws = new WebSocketServer2({
	httpServer: server2
});
var comms_clients = [];
comms_ws.on('request', function(request) {
	const connection = request.accept(null, request.origin);
	comms_clients.push(connection) - 1;
	connection.on('message', function(message) {
		var client_message_obj = JSON.parse(message.utf8Data);
		switch(client_message_obj.type) {
			case "command":
				runCommand(client_message_obj);
				break;
		}
	});

	connection.on('connection', function(comms_ws) {
		console.log("new conn.");
		console.log(comms_ws.clients);
	});

	connection.on('close', function(reasonCode, description) {
		console.log('Client has disconnected.');
	});
});
comms_ws.broadcast = function(data) {
	comms_clients.forEach(client => client.send(data));
};


wifi.init({
	iface: null // network interface, choose a random wifi interface if set to null
});

async function runCommand(comm) {
	console.log(comm);
	sendLog(`Saw ${comm.name} command with value ${comm.val}`);
	switch(comm.name) {
		case "takeoff":
			await sdk.control.takeOff();
			break;
		case "land":
			await sdk.control.land();
			break;
		case "emergency":
			await sdk.control.emergency();
			break;
		case "stop":
			await sdk.control.stop();
			break;
		case "up":
			await sdk.control.move.up(comm.val)
			break;
		case "down":
			await sdk.control.move.down(comm.val);
			break;
		case "left":
			await sdk.control.move.left(comm.val);
			break;
		case "right":
			await sdk.control.move.right(comm.val);
			break;
		case "front":
			await sdk.control.move.front(comm.val);
			break;
		case "back":
			await sdk.control.move.back(comm.val);
			break;
		case "rotateleft":
			await sdk.control.rotate.clockwise(comm.val);
			break;
		case "rotateright":
			await sdk.control.rotate.counterClockwise(comm.val);
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
	const videoEmitter = await sdk.receiver.video.bind() 
	videoEmitter.on('message', data => {
		var idx = data.indexOf(Buffer.from([0, 0, 0, 1]))
		if (idx > -1 && h264chunks.length > 0) {
			h264chunks.push(data.slice(0, idx))
			numChunkz = numChunkz + 1
			if (numChunkz === numChunks) {
				video_ws.broadcast(Buffer.concat(h264chunks));
				h264chunks = []
				numChunkz = 0
			}
			h264chunks.push(data.slice(idx)) 
		} else {
			h264chunks.push(data)
		}
	});
}

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
	await sdk.control.connect();
	console.log('drone fully connected');

	const stateEmitter = await sdk.receiver.state.bind();
	stateEmitter.on('message', res => comms_ws.broadcast('{"tele":' + JSON.stringify(res) + '}'));

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

app.listen(port, () => {
	console.log(`App ready at http://localhost:${port}/index.html`)
});

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
				sendLog(search + " not found");
				console.log(search + " not found");
				return resolve(false);
			}
		);
	});
}

function sendLog(message) {
	console.log(message);
	comms_ws.broadcast('{"pong":"' + message + '"}');
}