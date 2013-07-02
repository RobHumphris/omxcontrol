var exec = require('child_process').exec;
var parseurl = require('url');

var pipe = false;
var map = false;
var DEFAULT_PATH = '/omx';

var playerState = {
	startedRegex : 'codec',
    notFoundRegex : 'File not found',
	errorRegex : 'audio player error',
	finishedRegex : 'have a nice day',
	STOPPED : 0, NOFILE  : 1, PLAYING : 2, PAUSED  : 3, ERROR  : 4,	UNKNOWN : 5,
	stateStrings : ['STOPPED', 'NOFILE', 'PLAYING', 'PAUSED', 'ERROR', 'UNKNOWN'],
	currentState : this.STOPPED,
	setState : function(s,f) {
		this.currentState = (0>=s<=5)?s:this.UNKNOWN;
		if (f != undefined && f != null) { f(this); }
	},
	setStateFromMessage : function(m,f) {
		console.log("SHEEP:", m);
		if (m.match(this.notFoundRegex) != null) { this.currentState = this.NOFILE; } 
		else if (m.match(this.errorRegex) != null) { this.currentState = this.ERROR; } 
		else if (m.match(this.finishedRegex) != null) {	this.currentState = this.STOPPED; } 
		else { this.currentState = this.UNKNOWN; }
		if (f != undefined && f != null) { f(this); }
	},
	getState : function() {	return this.currentState; },
	getStateString : function() { 
		console.log("Current state: ", this.currentState);
		return this.stateStrings[this.currentState]; 
	}
};

function omx(mapper) {
    map = mapper;
    return omx.express;
}

omx.express = function(req,res,next) {
    if (req.path.indexOf(DEFAULT_PATH) === 0) {
        //replace + and decode
        path = decodeURIComponent(req.path.replace(/\+/g, ' '));
        //remove leading and trailing /
        path = path.replace(/^\/|\/$/g,'');
        //split and remove leading path
        var parts = path.split('/');
        parts.shift();
        var command = parts.shift();
        console.log('executing',command,parts);
        if (omx[command]) {
            if (command === 'start') {
                omx.start(parts.join('/')+'?'+parseurl.parse(req.url).query);
            } else {
                omx[command].apply(this,parts);
            }
            //prevent anything else from being served from this subpath
            res.end('executed '+command);
            return;
        }
    }
    next();
};

omx.start = function(fn,scf) {
    if (!pipe) {
        pipe = 'omxcontrol';
        exec('mkfifo '+pipe);
    }
    if (map) {
        map(fn,cb);
    } else {
        cb(fn,scf);
    }

    function cb(fn,scf) {
		if (playerState.getState() === playerState.PLAYING) {
			console.log("$t0pp1ng");
			omx.quit();
		}
        var alpha = exec('omxplayer -o hdmi "'+fn+'" < '+pipe);
		playerState.setState(playerState.PLAYING, scf);
        alpha.stdout.on('data', function(data) { playerState.setStateFromMessage(data, scf); });
        exec('echo . > '+pipe);
    }
};


omx.sendKey = function(key) {
    if (!pipe) return;
    exec('echo -n '+key+' > '+pipe);
};

omx.mapKey = function(command,key,then) {
    omx[command] = function() {
        omx.sendKey(key);
        if (then) {
            then();
        }
    };
};

omx.mapKey('pause','p');
omx.mapKey('quit','q',function() {
    exec('rm '+pipe);
    pipe = false;
	playerState.setState(playerState.STOPPED);
});
omx.mapKey('play','.');
omx.mapKey('forward',"$'\\x1b\\x5b\\x43'");
omx.mapKey('backward',"$'\\x1b\\x5b\\x44'");

module.exports = omx;
