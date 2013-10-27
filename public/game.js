
/* Global utility functions */
var app = app || {};

app.getViewportDim = function() {
	var width, height;
	
	// the more standards compliant browsers (mozilla/netscape/opera/IE7) use window.innerWidth and window.innerHeight
	if (typeof window.innerWidth != 'undefined') {
		width = window.innerWidth;
		height = window.innerHeight;
	}
	
	// IE6 in standards compliant mode (i.e. with a valid doctype as the first line in the document)
	else if (typeof document.documentElement != 'undefined'
	  && typeof document.documentElement.clientWidth !=
	  'undefined' && document.documentElement.clientWidth != 0) {
		width = document.documentElement.clientWidth;
		height = document.documentElement.clientHeight;
	}
	
	// older versions of IE
	else {
		width = document.getElementsByTagName('body')[0].clientWidth;
		height = document.getElementsByTagName('body')[0].clientHeight;
	}
	
	return {
		'width': width,
		'height': height
	};
};

app.TOUCH_RADIUS = 15;
app.BG = '#2c3e50';
app.TOUCH_COLOR = 'rgba(211,84,0,';
app.POINTS_SIZE = 70;
app.POINTS_COLOR = 'rgba(255,200,173,';
app.POINTS_FONT = 'Toxia';
app.SCORE_FONT = '25px NightOfTheDamned';
app.SCORE_COLOR = '#ecf0f1';

app.newGame = function() {
	app.game = null;
	app.game = new Game(document.getElementById('gameCanvas'));
};

app.getAudioExtension = function() {
	// detect browser
	var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
    // Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
	//var isFirefox = typeof InstallTrigger !== 'undefined';   // Firefox 1.0+
	var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
	
	//var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
	    // At least Safari 3+: "[object HTMLElementConstructor]"
	//var isChrome = !!window.chrome && !isOpera;              // Chrome 1+
	//var isIE = /*@cc_on!@*/false || document.documentMode;   // At least IE6
	
	if (isOpera || isFirefox) {
		app.audioExtn = '.ogg';
	}else {
		app.audioExtn = '.mp3';
	}
};


/* Graphics functions */
function Graphics(context, width, height) {
	// init graphics context
	this.ctx = context;
	this.width = width;
	this.height = height;
};

Graphics.prototype.clear = function() {
	this.ctx.clearRect(0, 0, this.width, this.height);
};

Graphics.prototype.rect = function(x, y, w, h, color) {
	this.ctx.fillStyle = color;
	this.ctx.fillRect(x, y, w, h);
};

Graphics.prototype.circle = function(x, y, r, color) {
	this.ctx.fillStyle = color;
	this.ctx.beginPath();
	this.ctx.arc(x + 5, y + 5, r, 0, Math.PI * 2, true);
	this.ctx.closePath();
	this.ctx.fill();
};

Graphics.prototype.text = function(string, x, y, font, color) {
	this.ctx.font = font;
	this.ctx.fillStyle = color;
	this.ctx.fillText(string, x, y);
};

Graphics.prototype.drawImage = function(img, x, y) {
	this.ctx.drawImage(img, x, y);
};

Graphics.prototype.centerText = function(string, y, font, color) {
	this.ctx.textAlign = 'center';
	this.ctx.font = font;
	this.ctx.fillStyle = color;
	this.ctx.fillText(string, this.width / 2, y);
};


/* 
 * Shim for requestAnimationFrame with setTimeout fallback
 * http://paulirish.com/2011/requestanimationframe-for-smart-animating
 */
window.requestAnimFrame = (function() {
	return window.requestAnimationFrame       || 
	       window.webkitRequestAnimationFrame || 
	       window.mozRequestAnimationFrame    || 
	       window.oRequestAnimationFrame      || 
	       window.msRequestAnimationFrame     || 
	       function(callback){
	         window.setTimeout(callback, game.fps);
		   };
})();


/* Game */
var Game = function(canvas) {
	this.canvas = canvas;
	
	var vpDim = app.getViewportDim();
	this.width = vpDim.width;
	this.height = vpDim.height;
	
	this.gfx = new Graphics(this.canvas.getContext('2d'), this.width, this.height);
	this.objects = [];	// the array of game objects
	
	this.init();
};

Game.prototype.init = function() {
	this.canvas.width = this.width;
	this.canvas.height = this.height;
	
	this.canvas.style.width = this.width;
	this.canvas.style.height = this.height;
	
	this.gfx.clear();
	this.gfx.rect(0, 0, this.width, this.height, '#036');
	
	// game config
	this.level = 1;
	this.fps = 1000 / 60;
	this.GHOST_SPEED = 4;
	this.GHOST_RADIUS = 100;
	this.NEXT_GHOST_INTERVAL = 100;
	this.PARTICLE_RADIUS = 3;
	this.SIMULTANEOUS_GHOST_SPAWN = 1; 
	this.GAME_OVER_MISSES = 10;
	this.NEXT_LEVEL_HITS = 25;
	
	this.nextGhost = 0;
	
	this.resetScore();
	this.start();
};

Game.prototype.start = function() {
	this.playSound(Sounds.tap);
	this.endGame = false;
	this.loop();
}

Game.prototype.loop = function() {
	var _this = this;
	function loopIn() {
		if (_this.endGame) {
			_this.showGameOver();
			return;
		}
		requestAnimFrame(loopIn);
		
		_this.update();
		_this.render();
	};
	loopIn();
};

Game.prototype.update = function() {
	var i;
	var isTapped = false;
	
	this.nextGhost--;
	if (this.nextGhost < 0) {
		for (var j = 0; j < this.SIMULTANEOUS_GHOST_SPAWN; j++) {
			this.objects.push(new Ghost(this));
			//Score.spawns++;
		}
		this.nextGhost = (Math.random() * this.NEXT_GHOST_INTERVAL / 2) + this.NEXT_GHOST_INTERVAL;
	}

    // spawn a new instance of Touch
    // if the user has tapped the screen
    if (Input.tapped) {
    	Score.taps++;
    	
    	this.playSound(Sounds.tap);
    	
        this.objects.push(new Touch(Input.x, Input.y));
        // set tapped back to false
        // to avoid spawning a new touch
        // in the next cycle
        Input.tapped = false;
        isTapped = true;
    }

    // cycle through all entities and update as necessary
    for (i = 0; i < this.objects.length; i += 1) {
        this.objects[i].update();
        
        var isHit = false;
        if (this.objects[i].type === 'ghost' && isTapped) {
        	isHit = this.hit(this.objects[i], 
        			{x: Input.x, y: Input.y, r: app.TOUCH_RADIUS});
        	this.objects[i].remove = isHit;
        	if (isHit) {
        		Score.hits++;
        		Score.levelHits++;
        		
        		this.playSound(Sounds.hit);
        		
        		GameScore.score += this.objects[i].points;
    		    // show points gained
    		    this.objects.push(new Points(
    		    		this.objects[i].x, 
    		            this.objects[i].y, 
    		            this.objects[i].points
		        ));
		        
		        // spawn an explosion
    		    for (var n = 0; n < 7; n +=1 ) {
    		    	
    		        this.objects.push(new Particle(
    		            this.objects[i].x, 
    		            this.objects[i].y, 
    		            this.PARTICLE_RADIUS, 
    		            // random opacity to spice it up a bit
    		            'rgba(255,255,255,' + Math.random() * 1 + ')'
    		        )); 
    		    }
        	}
        }

        // delete from array if remove property
        // flag is set to true
        if (this.objects[i].remove) {
            this.objects.splice(i, 1);
        }
    }
    
    // calculate score
    Score.accuracy = (Score.hits / Score.taps) * 100;
    Score.accuracy = isNaN(Score.accuracy) ?
        0 :
        ~~(Score.accuracy); // round
};

Game.prototype.render = function() {
	this.gfx.rect(0, 0, this.width, this.height, app.BG);

	// cycle through all entities and render to canvas
	for (i = 0; i < this.objects.length; i += 1) {
		this.objects[i].render(this.gfx);
	}
	
	// display score
	this.gfx.text('Ghostbuster', 22, 72, '31px MoonlightShadow', '#000');
	this.gfx.text('Ghostbuster', 20, 70, '30px MoonlightShadow', 'rgb(189, 195, 199)');
	
	this.gfx.text('Hits: ' + Score.hits + 
				  '    Misses: ' + Score.misses + 
				  '    Accuracy: ' + Score.accuracy + 
				  '    Score: ' + GameScore.score,  
				  20, 50, app.SCORE_FONT, app.SCORE_COLOR);
	this.gfx.text('LEVEL: ' + this.level + ' %', this.width - 170, 50, app.SCORE_FONT, app.SCORE_COLOR);
	
	if (Score.levelHits > this.NEXT_LEVEL_HITS) {
		Score.levelHits = 0;
		this.nextLevel();
		this.objects.add(new Level());
	}
};

Game.prototype.playSound = function(soundFX) {
	try {
		soundFX.currentTime = 0;
		soundFX.play();
	}catch (err) {
		console && console.log('Problem playing audio');
	}
};

Game.prototype.gameOver = function() {
	this.endGame = true;
	
	// write high score to local storage
	if (typeof(Storage) !== 'undefined') {
		GameScore.hiScore = +localStorage.hiScore;
		if (isNaN(GameScore.hiScore)) {
			GameScore.hiScore = GameScore.score;
		}
		if (GameScore.score > GameScore.hiScore) {
			GameScore.hiScore = GameScore.score;
		}
		localStorage.hiScore = GameScore.hiScore;
	}
};

Game.prototype.showGameOver = function() {
	this.playSound(Sounds.gameOver);
	
	this.gfx.rect(0, 0, this.width, this.height, app.BG);
	this.gfx.drawImage(document.getElementById('ghostLarge'), -150, 0);
	
	this.gfx.centerText('!GAME OVER!', this.height / 2,'100px NightOfTheDamned', '#fff');
	this.gfx.centerText('Total Score: ' + GameScore.score + ' % High Score: ' + GameScore.hiScore + '', this.height / 2 + 70, '30px NightOfTheDamned', '#fff');
	this.gfx.centerText('Press any key to start new game...', this.height / 2 + 120, '20px NightOfTheDamned', '#fff');
}

Game.prototype.resetScore = function() {
	Score.levelHits = 0;
	Score.hits = 0;
	Score.misses = 0;
	Score.taps = 0;
	Score.accuracy = 0;
	GameScore.score = 0;
};

Game.prototype.nextLevel = function() {
	this.GHOST_SPAWN_INTERVAL -= 20;	// ticks
	this.SIMULTANEOUS_GHOST_SPAWN++;	// number of bubbles spawned simultaneously
	this.GHOST_SPEED++;
	
	this.level++;
};

Game.prototype.hit = function(a, b) {
	var d2 = ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
	var r2 = (a.r + b.r) * (a.r + b.r);
	
	if (d2 < r2) {
		return true;
	}
	return false;
};


/* Ghost */
var Ghost = function(game) {
	
    this.type = 'ghost';
    this.x = -game.GHOST_RADIUS;							// make sure it starts of screen
    this.r = game.GHOST_RADIUS / 2; 		// the radius of the bubble
    this.y = Math.random() * game.height; 	// make sure it starts off screen
    if (game.height - this.y < game.GHOST_RADIUS) {
    	this.y -= game.GHOST_RADIUS;
    }else if (this.y < game.GHOST_RADIUS) {
    	this.y += game.GHOST_RADIUS;
    }
    this.speed = (Math.random() * game.GHOST_SPEED) + 1;
    this.waveSize = 5 + this.r / 2;
    this.points = 10;
    this.img = document.getElementById('ghostImg');
    // we need to remember the original
    // x position for our sine wave calculation
    this.yConstant = this.y;
    this.remove = false;

    this.update = function() {
    	var time = new Date().getTime() * 0.002;
    	//this.points++;	// higher points for late hits
    	
        // move up the screen by 1 pixel
        this.x += this.speed;
        
        // the x coordinate to follow a sine wave
        this.y = this.waveSize * Math.sin(time) + this.yConstant;

        // if off screen, flag for removal
        if (this.x > game.width) {
            this.remove = true;
            Score.misses++;
            game.playSound(Sounds.miss);
            GameScore.score -= 5;
            if (Score.misses == game.GAME_OVER_MISSES) {
            	game.gameOver();
            }
        }

    };

    this.render = function(gfx) {
        //gfx.circle(this.x, this.y, this.r, 'rgba(255,255,255,1)');
        gfx.drawImage(this.img, this.x, this.y - this.r);
    };

};


/* Particle */
var Particle = function(x, y, r, color) {
	
	this.type = 'particle', 
    this.x = x;
    this.y = y;
    this.r = r;
    this.color = color;

    // determines whether particle will
    // travel to the right of left
    // 50% chance of either happening
    this.dir = (Math.random() * 2 > 1) ? 1 : -1;

    // random values so particles do not
    // travel at the same speeds
    this.vx = ~~(Math.random() * 4) * this.dir;
    this.vy = ~~(Math.random() * 7);

    this.remove = false;

    this.update = function() {

        // update coordinates
        this.x += this.vx;
        this.y += this.vy;

        // increase velocity so particle
        // accelerates off screen
        this.vx *= 0.99;
        this.vy *= 0.99;

        // adding this negative amount to the
        // y velocity exerts an upward pull on
        // the particle, as if drawn to the
        // surface
        this.vy -= 0.25;

        // off screen
        if (this.y < 0) {
            this.remove = true;
        }

    };

    this.render = function(gfx) {
        gfx.circle(this.x, this.y, this.r, this.color);
    };

};


/* Touch */
var Touch = function(x, y) {
	
	this.type = 'touch';    	// we'll need this later
    this.x = x;             	// the x coordinate
    this.y = y;             	// the y coordinate
    this.r = app.TOUCH_RADIUS;	// the radius
    this.opacity = 1;       	// initial opacity; the dot will fade out
    this.fade = 0.05;       	// amount by which to fade on each game tick
    this.remove = false;    	// flag for removing this entity. POP.update
                            	// will take care of this

    this.update = function() {
        // reduce the opacity accordingly
        this.opacity -= this.fade; 
        // if opacity if 0 or less, flag for removal
        this.remove = (this.opacity < 0) ? true : false;
    };

    this.render = function(gfx) {
        gfx.circle(this.x, this.y, this.r, app.TOUCH_COLOR + this.opacity + ')');
    };
};

/* Points gained */
var Points = function(x, y, val) {
	
	this.type = 'points';    	// we'll need this later
    this.x = x;             	// the x coordinate
    this.y = y;             	// the y coordinate
    this.val = val;				// points gained
    this.r = app.POINTS_SIZE;	// the radius
    this.opacity = 1;       	// initial opacity; the dot will fade out
    this.fade = 0.02;       	// amount by which to fade on each game tick
    this.remove = false;    	// flag for removing this entity. POP.update
                            	// will take care of this

    this.update = function() {
        // reduce the opacity accordingly
        this.opacity -= this.fade; 
        // if opacity if 0 or less, flag for removal
        this.remove = (this.opacity < 0) ? true : false;
        this.y -= 5;
    };

    this.render = function(gfx) {
    	if (this.x < 0) {
    		this.x = 50;
    	}
        gfx.text('+', this.x, this.y, this.r + 'px ' + app.POINTS_FONT, app.POINTS_COLOR + this.opacity + ')');
    };
};


/* Input */
var Input = {
	x: 0,
    y: 0,
    tapped: false,

    set: function(data, gfx) {
        this.x = data.pageX;
        this.y = data.pageY;
        this.tapped = true;
    }
};

/* Overall game score */
var GameScore = {
	score: 0, 
	hiScore: 0
};

/* Level score */
var Score = {
	taps: 0, 
	hits: 0, 
	misses: 0, 
	accuracy: 0,
	score: 0, 
	levelHits: 0
};

/* Sound effects */
var Sounds = {};

/* Events */

//listen for clicks
window.addEventListener('click', function(e) {
    e.preventDefault();
    Input.set(e, app.game.gfx);
}, false);

// listen for touches
window.addEventListener('touchstart', function(e) {
    e.preventDefault();
    // the event object has an array
    // named touches; we just want
    // the first touch
    Input.set(e.touches[0], app.game.gfx);
}, false);

window.addEventListener('touchmove', function(e) {
    // ignore and prevent default behaviour
    e.preventDefault();
}, false);

window.addEventListener('touchend', function(e) {
    // ignore and prevent default behaviour
    e.preventDefault();
}, false);

window.addEventListener('keypress', function(e) {
	e.preventDefault();
	if (app.game.endGame) {	// Escape
		app.newGame();
	}
}, false);


/* Load and start */
window.onload = function() {
	app.getAudioExtension();
	
	try {
		// Load sound effects
		Sounds.hit = new Audio('audio/hit' + app.audioExtn);	//document.getElementById('hit');
		Sounds.tap = new Audio('audio/touch' + app.audioExtn);	// document.getElementById('touch');
		Sounds.miss = new Audio('audio/miss' + app.audioExtn);	//document.getElementById('miss');
		Sounds.gameOver = new Audio('audio/gameover' + app.audioExtn);	//document.getElementById('gameOver');
	}catch (err) {
		console && console.log('Audio not supported.');
	}

	app.newGame();
};
