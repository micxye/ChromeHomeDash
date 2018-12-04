const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const Twit = require('twit');

const db = require('../database/index.js');

require('dotenv').load();

app.use(cors());
app.use(bodyParser.json());

const path = require('path');
const port = 8888;

app.use(express.static(path.join(__dirname, '/../client/dist')));

let tasks = [];
let following = [];

(() => { // get user settings from db
    db.getSettings((err, data) => {
        tasks = data[0].tasks;
        following = data[0].following;
        getTweets();
        setInterval(getTweets, 60000);
    });
})();

app.get('/todolist', (req, res) => {
    res.send(settings.tasks);
});

app.post('/todolist', (req, res) => {
    settings.tasks = req.body;
    db.saveTasks(req.body, () => {
        res.send('list updated in server');
        console.log(settings.tasks);
    });
});

const T = new Twit({
    consumer_key: `${process.env.T_CONSUMER_KEY}`,
    consumer_secret: `${process.env.T_CONSUMER_SECRET}`,
    access_token: `${process.env.T_ACCESS_TOKEN}`,
    access_token_secret: `${process.env.T_ACCESS_TOKEN_SECRET}`,
    timeout_ms: 60 * 1000,  // optional HTTP request timeout to apply to all requests.
    strictSSL: true,     // optional - requires SSL certificates to be valid.
});

// let following = ['realdonaldtrump', 'kingjames', 'rotoworld_bk', 'rotoworld_fb', 'shamscharania', 'kanyewest', 'dropsbyjay', 'solelinks'];
// let following = ['michaelyeaah']

let twitterUserTimelines = {};

function getTweets() {
    for (let i = 0; i < following.length; i++) {
        if (!twitterUserTimelines[following[i]]) {
            twitterUserTimelines[following[i]] = [];
        }
        T.get('statuses/user_timeline', { screen_name: following[i], tweet_mode: 'extended', count: 20 },
            function (err, data, response) {
                if (err) console.log(err);
                if (Array.isArray(data)) {
                    let tweets = data.map(tweet => {
                        tweet.created_at = Date.parse(tweet.created_at);
                        return tweet;
                    });
                    twitterUserTimelines[following[i]] = tweets;
                }
            });
    }
}

app.get('/tweets', (req, res) => {
    res.send(twitterUserTimelines);
});

app.post('/localweather', (req, res) => {
    const clientIp = req.body.ip;
    // get lat/long from client IP
    axios.get(`http://api.ipstack.com/${clientIp}?access_key=${process.env.IPSTACK_API}`)
        .then(response => {
            const { latitude, longitude, city } = response.data;
            // send lat/long to darksky API, to retrieve local weather data
            axios.get(`https://api.darksky.net/forecast/${process.env.DARKSKY_API}/${latitude},${longitude}`)
                .then(response => {
                    res.send(Object.assign(response.data, {city}));
                })
                .catch(error => {
                    console.log(error);
                    res.send(error);
                });
        })
        .catch(error => {
            console.log(error);
            res.send(error);
        });
});

app.post('/weather', (req, res) => {
    let { coordinates, city } = req.body.place;
    city = city.split(', ')[0].replace(/\b\w/g, l => l.toUpperCase());
    axios.get(`https://api.darksky.net/forecast/${process.env.DARKSKY_API}/${coordinates}`)
        .then(response => {
            res.send(Object.assign(response.data, { city }));
        })
        .catch(error => {
            console.log(error);
            res.send(error);
        });
});

app.listen(port, () => console.log(`Server is listening on port ${port}`));
