omxcontrol
==========

Nodejs module to control omxplayer. Specifically written for the raspberry pi. Changed to contain the player state.

Requirements
------------

* omxplayer (installed by default on the raspberry pi raspian image)
* nodejs (`apt-get install nodejs`)
* express (optional)

Usage
-----

See the main omxplayer repo to see the proper Usage.

The difference is that you call start, and pass a function, this function will be called each time the player's state changes, here we just show the state in the console:

omx.start(fileName, function(playerState) {
    console.log("~~~", playerState.getStateString());
});
