////////////////////////////////
// ML5 Machine learning interface for video from Drone
// Currently it only overlays object recognition over detected objects
////////////////////////////////

var video = document.getElementById("player");
var c = document.getElementById("canvas");

if(typeof cocoSsd === 'undefined') {
	video.removeAttribute("hidden");
	c.style.display = "none";
} else {
	//VIDEO ML
	var deadzone = 180;
	
	var ctx = c.getContext("2d");
	var grd = ctx.createLinearGradient(0, 0, canvas.width, 0);
	grd.addColorStop(0, "#111");
	grd.addColorStop(1, "#333");
	ctx.fillStyle = grd;
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	//Put video icon on top of unloaded screen temporarily
	var img = new Image();
	img.onload = function() { ctx.drawImage(img, canvas.width/2-100, canvas.height/2-100, 200, 200); }
	img.src = "img/lens.svg";

	cocoSsd.load().then(model => {
		setInterval(async function(){
			result = await model.detect(video);
	
			ctx.drawImage(video,0,0,960,720);
	
			//Show a rail on the left and right side of the screen where action/movment should take place
			//if the drone were to track an object.
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
	
			//Draw colored squares over people and dogs recognized in the video feed
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

}