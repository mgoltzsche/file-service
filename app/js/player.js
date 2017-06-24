var log = require('./logger.js')('Player');
var React = require('react');
var ReactDOM = require('react-dom');

var Player = React.createClass({
	getDefaultProps: function() {
		return {
			className: '',
			width: '260px',
			height: '320px',
			rewriteStreamHref: function(href) {return href;}
		};
	},
	getInitialState: function() {
		return {
			currentSrc: '',
			playing: false,
			loaded: false
		};
	},
	show: function(src) {
		if (this.state.currentSrc !== src) {
			this.hide();
			this.refs.player.src = this.state.currentSrc = src;
			this.state.loaded = false;
		}
	},
	play: function() {
		if (!this.state.loaded) {
			this.state.loaded = true;

			try {
				this.refs.player.load();

				if (this.refs.player.error)
					log.debug('Video element error load() ' + src, this.refs.player.error);
			} catch(e) {
				log.debug('Cannot load() video element', e);
			}
		}

		if (!this.state.playing) {
			this.state.playing = true;

			try {
				this.refs.player.play();
			} catch(e) {
				log.debug('Video element error on play() ' + src, this.refs.player.error);
			}

			this.refs.container.className = this.getClassName();
		}
	},
	hide: function() {
		try {
			this.refs.player.pause();
		} catch(e) {
			log.error('Cannot pause() video element', e);
		}

		if (this.state.playing) {
			this.state.playing = false;
			this.refs.container.className = this.getClassName();
		}
	},
	getClassName: function() {
		return 'player ' + this.props.className + (this.state.playing ? ' playing' : ' paused');
	},
	render: function() {
		return <div className={this.getClassName()} style={{width: this.props.width, height: this.props.height}} onClick={this.play} ref="container">
			<video width={this.props.width} height={this.props.height} controls ref="player">
				<span>Your browser does not support the video element. Go get a new Browser!</span>
			</video>
		</div>;
	}
});

module.exports = Player;