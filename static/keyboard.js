var pressed_keys = [];
// left, up, right, down, shift, pg-up, pg-dn, enter, space, esc
var allowed_keys = [37, 38, 39, 40, 16, 33, 34];

document.addEventListener('keydown', e => {
	if (event.repeat != undefined) {
	allowed = !event.repeat;
	}
	if (!allowed) return;
	allowed = false;
	if(allowed_keys.includes(e.keyCode)) {
		pressed_keys.push(e.keyCode);    
	}

});

document.addEventListener('keyup', e => {
	const index = pressed_keys.indexOf(e.keyCode);
		if (index > -1) { pressed_keys.splice(index, 1); }
	switch(e.keyCode) {
		case 13:
		takeoffCommand();
		break;
		case 32:
		landCommand();
		break;
		case 27:
		stopCommand();
		break;
	case 88:
		emergencyCommand();
	}
});