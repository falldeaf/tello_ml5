# Tello Drone Controller
This is a Node.js Web and WebXR interface for controlling the Tello Drone with either VR, keyboard, or Machine Learning controller.

## Installation

Use the package manager [npm](https://www.npmjs.com/) to install the required library packages.

```bash
npm install
```

## Usage
Run the index.js file to open the back-end for communication between the drone and the web-based interfaces. A second WiFi interface needs to be available if you're using the primary for your connection to the internet. 

```bash
node index.js
firefox https://localhost:8000/
firefox https://localhost:8000/vr.html
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[MIT](https://choosealicense.com/licenses/mit/)
