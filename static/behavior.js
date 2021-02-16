var connected = false;
var props_on = false;
var tof = 0;

var battery = document.getElementById('battery_level');
function setBattery(perc) {
	battery.style.width = perc + '%';
	battery.style.backgroundColor = 'rgb(' + pickHex([194,238,0], [255,127,154], perc/100).join(',') + ')';
}

function setTof(tof) {
	console.log(tof);
}

var log = document.getElementById('log');
function addLog(message) {
	log.innerHTML += message + '\n';
	log.scrollTop = log.scrollHeight;
}

//VIDEO ML
var deadzone = 180;

var c = document.getElementById("canvas");
var ctx = c.getContext("2d");
var grd = ctx.createLinearGradient(0, 0, canvas.width, 0);
grd.addColorStop(0, "#111");
grd.addColorStop(1, "#333");
ctx.fillStyle = grd;
ctx.fillRect(0, 0, canvas.width, canvas.height);
var img = new Image();
img.onload = function() { ctx.drawImage(img, canvas.width/2-100, canvas.height/2-100, 200, 200); }
img.src = "/lens.svg";
var video = document.getElementById("player");

cocoSsd.load().then(model => {
	setInterval(async function(){
		result = await model.detect(video);

		ctx.drawImage(video,0,0,960,720);

		if(sentinal_on) {
			// Left rail
			ctx.beginPath();
			ctx.setLineDash([5, 15]);
			ctx.moveTo(canvas.width/2-deadzone, 0);
			ctx.lineTo(canvas.width/2-deadzone, canvas.height);
			ctx.stroke();

			// Right rail
			ctx.beginPath();
			ctx.setLineDash([5, 15]);
			ctx.moveTo(canvas.width/2+deadzone, 0);
			ctx.lineTo(canvas.width/2+deadzone, canvas.height);
			ctx.stroke();

			ctx.setLineDash([]);
		}

		//ctx.clearRect(0, 0, c.width, c.height);
		result.forEach(element => {
			if(element.score > 0.5) {
				ctx.beginPath();
				switch(element.class) {
					case "person":
						ctx.strokeStyle = "#00FF00";

						// Trigger rail
						ctx.beginPath();
						ctx.setLineDash([5, 15]);
						ctx.moveTo(element.bbox[0] + element.bbox[2]/2, 0);
						ctx.lineTo(element.bbox[0] + element.bbox[2]/2, canvas.height);
						ctx.stroke();
					break;
					case "dog":
						ctx.strokeStyle = "#FF0000";
					break;
					default:
					ctx.strokeStyle = "#000000";
				}
				ctx.lineWidth = 2;
				ctx.rect(element.bbox[0], element.bbox[1], element.bbox[2], element.bbox[3]);
				ctx.rect(element.bbox[0] + element.bbox[2]/2, element.bbox[1] + element.bbox[3]/2, 4, 4);
				ctx.arc(element.bbox[0] + element.bbox[2]/2, element.bbox[1] + element.bbox[3]/2, 10, 0, 2 * Math.PI, false);
				ctx.stroke();
				ctx.font = "30px Arial";
				ctx.fillText(element.class, element.bbox[0] + 5, element.bbox[1] + 20);
				ctx.fillText(element.score.toFixed(2), element.bbox[0] + 5, element.bbox[1] + 46);
			}
		});
	}, 100);
});

//COMMS Websocket////////////////////////
var comms_ws;
var socketURL = 'ws://localhost:5533';

comms_ws = new WebSocket(socketURL);
comms_ws.onopen = function(event){
	console.log('connected to Comms WS');
};

comms_ws.onmessage = function(event){ 
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
var socketURL = 'ws://localhost:5544';

video_ws = new WebSocket(socketURL);
video_ws.onopen = function(event){
	console.log('connected to Video WS');
	video_ws.binaryType = 'arraybuffer';
};

video_ws.onmessage = function(event){
	jmuxer.feed({
		video: new Uint8Array(event.data)
	});
};

function handleTelemetry(tel) {
	pitch = tel.pitch;
	roll = tel.roll;
	yaw = tel.yaw;
	tof = tel.tof;
	setBattery(tel.battery);
}

var keyboard_on = true;
var gamepad_on = false;
var sentinal_on = false;
var current_speed = 2;
setInterval(function(){ 
	if(keyboard_on) {
		if (pressed_keys.includes(16) && pressed_keys.includes(37)) {
			comms_ws.send(`{"type":"command", "name":"rotateleft", "val": "${current_speed}"}`);
		} else if (pressed_keys.includes(16) && pressed_keys.includes(39)) {
			comms_ws.send(`{"type":"command", "name":"rotateright", "val": "${current_speed}"}`);
		} else if(pressed_keys.includes(37)) {
			comms_ws.send(`{"type":"command", "name":"left", "val": "${current_speed}"}`);
		} else if (pressed_keys.includes(38)) {
			comms_ws.send(`{"type":"command", "name":"front", "val": "${current_speed}"}`);
		} else if (pressed_keys.includes(39)) {
			comms_ws.send(`{"type":"command", "name":"right", "val": "${current_speed}"}`);
		} else if (pressed_keys.includes(40)) {
			comms_ws.send(`{"type":"command", "name":"back", "val": "${current_speed}"}`);
		} else if (pressed_keys.includes(33)) {
			comms_ws.send(`{"type":"command", "name":"up", "val": "${current_speed}"}`);
		} else if (pressed_keys.includes(34)) {
			comms_ws.send(`{"type":"command", "name":"down", "val": "${current_speed}"}`);
		}
	}

	if(gamepad_on) {

	}
}, 500);

function takeoffCommand() {
	if(keyboard_on) {
		comms_ws.send('{"type":"command", "name":"takeoff"}');
		props_on = true;
	}
}

function landCommand() {
	if(keyboard_on) {
		comms_ws.send('{"type":"command", "name":"land"}');
		//TODO: Maybe wait until distance sensor is really low before showing props off?
		props_on = false;
	}
}

function stopCommand() {
	if(keyboard_on) {
		comms_ws.send('{"type":"command", "name":"stop"}');
	}
}

function emergencyCommand() {
	if(keyboard_on) {
		comms_ws.send('{"type":"command", "name":"emergency"}');
		props_on = false;
	}
}

//Handle Buttons////////////////////
document.querySelectorAll('.button').forEach(item => {
	item.addEventListener('click', event => {
		console.log(event.target.id);
		switch(event.target.id) {
			case "connect_button":
				fetch('http://localhost:8000/connect/video');
				break;
			case "keyboard_button":
				keyboard_on = !keyboard_on;
				setActive(keyboard_on, event.target);
				break;
			case "gamepad_button":
				gamepad_on = !gamepad_on;
				setActive(gamepad_on, event.target);
				break;
			case "sentinal_button":
				sentinal_on = !sentinal_on;
				setActive(sentinal_on, event.target);
				break;
			case "sentinal_button":
				comms_ws.send('{"type":"command", "name":"sentinal"}');
				break;
			case "takeoff_button":
				comms_ws.send('{"type":"command", "name":"takeoff"}');
				props_on = true;
				break;
			case "land_button":
				comms_ws.send('{"type":"command", "name":"land"}');
				//TODO: Maybe wait until distance sensor is really low before showing props off?
				props_on = false;
				break;
			case "emergency_button":
				comms_ws.send('{"type":"command", "name":"emergency"}');
				props_on = false;
				break;
			case "stop_button":
				comms_ws.send('{"type":"command", "name":"stop"}');
				break;
		}
	})
})

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
	console.log(rgb);
	return rgb;
}