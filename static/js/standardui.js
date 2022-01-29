var battery = document.getElementById('battery_level');
function setBattery(perc) {
	if(battery != null) {
		battery.style.width = perc + '%';
		battery.style.backgroundColor = 'rgb(' + pickHex([194,238,0], [255,127,154], perc/100).join(',') + ')';
	}
}

var log = document.getElementById('log');
function addLog(message) {
	log.innerHTML += message + '\n';
	log.scrollTop = log.scrollHeight;
}

function handleTelemetry(tel) {
	pitch = tel.pitch;
	roll = tel.roll;
	yaw = tel.yaw;
	tof = tel.tof;
	setBattery(tel.battery);
}

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

//Handle Buttons////////////////////
document.querySelectorAll('.button').forEach(item => {
	item.addEventListener('click', event => {
		console.log(event.target.id);
		switch(event.target.id) {
			case "connect_button":
				connect()
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