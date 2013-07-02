var dirName = '/home/pi/media';
var  regex = '(\w*).(js|mp(3|4)|flv)$',
	walker = require('walk').walk(dirName, { followLinks: false }),
	path = require('path'),
	express = require('express'),
	app = express();

var omx = require('omxcontrol');
	
var Entry = {
	entries : [],
	fullPath : '',
	displayTitle : '',
	type : '',
	entry : function(fullPath, displayTitle, type) {
		this.entries.push(new this._makeEntry(fullPath, displayTitle, type));
	},
	_makeEntry : function(fullPath, displayTitle, type) {
		this.fullPath = fullPath;
		this.displayTitle = displayTitle.substring(0, displayTitle.length - type.length);
		this.type = type;
		return this;
	},
	render : function(i) {
		return '<li id="mediaID_'+ i +'" data-media-type="' + this.entries[i].type +'" >' +this.entries[i].displayTitle+'</li>';
	},
	formatResponse : function(pageCount, pageSize) {
		var startIndex = 0;
		var stopIndex = 0;
		if (this.entries.length > 1) {
			var output = '';
			if (startIndex != null && pageSize != null) {
				startIndex = pageCount * pageSize;
				stopIndex = startIndex + pageSize;
				if (startIndex > this.entries.length) {	startIndex = this.entries.length; }
				if ((startIndex + pageSize) > this.entries.length) { stopIndex = this.entries.length; }
			}
			else { stopIndex = this.entries.length;	}
			for(var i = startIndex; i < stopIndex; i++) { output += this.render(i);	}
			return '<ul>' + output + '</ul>'; 
		}
		return '<h2>No Media Files Found</h2>';
	},
	getFullPathFromID : function(idString) {
		return this.entries[parseInt(idString.substring(8))].fullPath;
	}
};

walker.on("file", function (root, fileStats, next) {
	if (fileStats.type === 'file') {
		var m = fileStats.name.match(regex);
		if (m != null) {
			Entry.entry(root+'/'+fileStats.name, fileStats.name, m[0]);
		}
	}
	next();
});

walker.on("errors", function (root, nodeStatsArray, next) {
	console.log("Errors Root: ", root);
	console.log("*Node Stats: ", nodeStatsArray);
	next();
});

walker.on("end", function () {
});

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.static(path.join(__dirname, 'html')));
app.use(omx());

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/html/index.html');
});

app.get('/media', function(req, res) {
	var pageCount = (req.query.pageCount == null) ? null : parseInt(req.query.pageCount),
	pageSize = (req.query.pageSize == null)? null : parseInt(req.query.pageSize);
	res.send(Entry.formatResponse(pageCount, pageSize));
});

app.get('/play', function(req, res) {
	if (req.query.mediaID != null) {
		var fileName = Entry.getFullPathFromID(req.query.mediaID);
		omx.start(fileName, function(playerState) {
			console.log("~~~", playerState.getStateString());
		});
	}
	res.send("OK");
});

app.listen(3000);
console.log('Listening on port 3000');
