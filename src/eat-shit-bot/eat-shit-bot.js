'use strict';

let _ = require('lodash');
let merge = require('lodash/merge');
let Twit = require('twit');
let credentials = require('./../../credentials');

/**
 * EatShitBot constructor description
 *
 * @class EatShitBot
 * @classdesc EatShitBot class description
 *
 * @param {object} options - Instance instantiation object
 * @param {string} options.example - Example options property
 */
function EatShitBot(options) {
	this.twitBot;
	this.twitterBot;
	this.stream;
	this.options = merge({}, EatShitBot.DEFAULTS, options);
	this.createTwitterConnection();
}

EatShitBot.DEFAULTS = {};

module.exports = EatShitBot;

EatShitBot.prototype.createTwitterConnection = function() {
	this.twitBot = new Twit({
		consumer_key:         credentials.consumer_key,
		consumer_secret:      credentials.consumer_secret,
		access_token:         credentials.access_token,
		access_token_secret:  credentials.access_token_secret
	});
};

EatShitBot.prototype.getStream = function(string) {
	this.stream = this.twitBot.stream('statuses/filter', {
		track: string
	});
	this.stream.on('tweet', function(tweet) {
		this.logTweet(tweet["text"], tweet["user"]["screen_name"]);
	}.bind(this));
};

EatShitBot.prototype.getTweets = function(string, count) {
	let statuses, i;
	this.twitBot.get('search/tweets', {
		q: '' + string + '',
		count: count
	}, function(error, data, response) {
		if (data) {
			statuses = data.statuses;
			i = statuses.length;
			while (i--) {
				this.logTweet(statuses[i]["text"], statuses[i]["user"]["screen_name"]);
			}
		} else {
			console.log(error);
		}
	}.bind(this));
};

EatShitBot.prototype.streamAndRetweet = function(phraseToFilter) {
	this.stream = this.twitBot.stream('statuses/filter', {
		track: phraseToFilter
	});
	this.stream.on('tweet', function(tweet) {
		const tweetText = tweet['text'].toLowerCase();
		if (tweetText.includes(phraseToFilter.toLowerCase())) {
			const retweetIt = this.checkDisallowedWords(tweetText);
			if(retweetIt) {
				this.retweet(tweet.id_str);
			}
			else {
				const a = 1;
			}
		}
	}.bind(this));
	this.checkDisallowedWords = function checkDisallowedWords(tweetText) {
		let disallowedTweets = [];
		if(this.options.disallowedFollowWords.length > 0) {
			disallowedTweets = this.options.disallowedFollowWords.filter((word) => {
				const newPhrase = `${phraseToFilter} ${word}`;
				// console.log(`~~ looking for ${newPhrase}`);
				return tweetText.includes(newPhrase);
			});
		}
		if(this.options.disallowedLeadWords.length > 0) {
			disallowedTweets = this.options.disallowedLeadWords.filter((word) => {
				const newPhrase = `${word} ${phraseToFilter}`;
				// console.log(`~~ looking for ${newPhrase}`);
				return tweetText.includes(newPhrase);
			});
		}
		return disallowedTweets.length === 0;
	}.bind(this);
	this.stream.on('disconnect', function(disconnectMessage) {
		console.log('disconnected:', disconnectMessage);
		this.streamAndRetweet(phraseToFilter);
	}.bind(this));
	this.stream.on('warning', function(warning) {
		console.log('warning:', warning);
	}.bind(this));
	this.stream.on('reconnect', function(request, response, connectInterval) {
		console.log('attemping to reconnect, status message:', response.statusMessage);
		request.on('error', function(error) {
			console.log('error:', error);
		});
	}.bind(this));
};

EatShitBot.prototype.retweet = function(tweetId) {
	this.twitBot.post('statuses/retweet/' + tweetId, function(error, tweet, response) {
		if (!error) {
			this.logTweet(tweet["text"], tweet["user"]["screen_name"]);
		};
	}.bind(this));
};

EatShitBot.prototype.logTweet = function(tweet, screenName) {
	console.log(`${tweet}\n${screenName}\n\n`)
};
