var connected = false;
var props_on = false;
var tof = 0;

function setTof(tof) {
	console.log(tof);
}

//COMMS Websocket////////////////////////
var comms_ws;
var socketURL = 'wss://' + window.location.hostname + ':5533';

comms_ws = new WebSocket(socketURL);
comms_ws.onopen = function(event){
	console.log('connected to Comms WS');
};

comms_ws.onmessage = function(event){
	//console.log(event.data);
	var message = JSON.parse(event.data);
	if(message.tele) {
		handleTelemetry(message.tele);
	}

	if(message.pong) {
		addLog(message.pong);
	}
};

//VIDEO Websocket////////////////////////
var h264chunks = [];
var numChunks = 3;
var numChunkz = 0;

var jmuxer = new JMuxer({
	node: 'player',
	mode: 'video',
	flushingTime: 1
});

var video_ws;
var socketURL = 'wss://' + window.location.hostname + ':5544';

video_ws = new WebSocket(socketURL);
video_ws.onopen = function(event){
	console.log('connected to Video WS');
	video_ws.binaryType = 'arraybuffer';
};

video_ws.onmessage = function(event){
	console.log(event.data);
	//newVideoChunk();
	jmuxer.feed({
		video: new Uint8Array(event.data)
	});
};

var keyboard_on = true;
var gamepad_on = false;
var sentinal_on = false;
var vr_on = false;
var distance_in_cm = 30;
setInterval(function(){ 
	if(typeof pressed_keys !== 'undefined' && keyboard_on) {
		if (pressed_keys.includes(16) && pressed_keys.includes(37)) {
			comms_ws.send(`{"type":"command", "name":"rotateleft", "val": "${distance_in_cm}"}`);
		} else if (pressed_keys.includes(16) && pressed_keys.includes(39)) {
			comms_ws.send(`{"type":"command", "name":"rotateright", "val": "${distance_in_cm}"}`);
		} else if(pressed_keys.includes(37)) {
			comms_ws.send(`{"type":"command", "name":"left", "val": "${distance_in_cm}"}`);
		} else if (pressed_keys.includes(38)) {
			comms_ws.send(`{"type":"command", "name":"front", "val": "${distance_in_cm}"}`);
		} else if (pressed_keys.includes(39)) {
			comms_ws.send(`{"type":"command", "name":"right", "val": "${distance_in_cm}"}`);
		} else if (pressed_keys.includes(40)) {
			comms_ws.send(`{"type":"command", "name":"back", "val": "${distance_in_cm}"}`);
		} else if (pressed_keys.includes(33)) {
			comms_ws.send(`{"type":"command", "name":"up", "val": "${distance_in_cm}"}`);
		} else if (pressed_keys.includes(34)) {
			comms_ws.send(`{"type":"command", "name":"down", "val": "${distance_in_cm}"}`);
		}
	}

	if(gamepad_on) {

	}

	if(vr_on) {

	}
}, 500);

function setSpeed(speed) {
	comms_ws.send(`{"type":"command", "name":"speed", "val": "${speed}"}`);
}

function connect() { //Connect w/ video
	fetch('https://localhost:8000/connect/video');
}

function takeoffCommand() {
		comms_ws.send('{"type":"command", "name":"takeoff"}');
		props_on = true;
}

function landCommand() {
		comms_ws.send('{"type":"command", "name":"land"}');
		//TODO: Maybe wait until distance sensor is really low before showing props off?
		props_on = false;
}

function stopCommand() {
		comms_ws.send('{"type":"command", "name":"stop"}');
}

function emergencyCommand() {
		comms_ws.send('{"type":"command", "name":"emergency"}');
		props_on = false;
}

function setActive(flag, elem) {
	if(flag) {
		elem.classList.add("active");
	} else {
		elem.classList.remove("active");
	}
}

function pickHex(color1, color2, weight) {
	var p = weight;
	var w = p * 2 - 1;
	var w1 = (w/1+1) / 2;
	var w2 = 1 - w1;
	var rgb = [Math.round(color1[0] * w1 + color2[0] * w2),
		Math.round(color1[1] * w1 + color2[1] * w2),
		Math.round(color1[2] * w1 + color2[2] * w2)];
	return rgb;
}