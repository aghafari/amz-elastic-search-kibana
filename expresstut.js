var express = require('express');
var elasticsearch = require('elasticsearch');
var request = require('request');
var parseString = require('xml2js').parseString;
var universalURL = 'http://www.universalstudioshollywood.com/waittimes/?type=all&site=USH';
var uuid = require('uuid/v4');

const interval = 600000;
const myIndex = 'wait-times';

var client = elasticsearch.Client( {
   host: 'search-cs499assignment4-jkihq7yctlv2desx75kwx6o5pm.us-east-1.es.amazonaws.com',
   log: 'info'
});


client.ping({
    
    requestTimeout: 5000
}, function(error) {
    if (error) {
        console.trace('elasticsearch is not working!');
    } else {
        fetchWaitingtimes();
        console.log('Working!');
    }
});


function fetchWaitingtimes() {
    request(universalURL, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var waitTimes = [];

            parseString(body, function (err, result) {
                var items = result.rss.channel[0].item;
                for(var i = 0; i < items.length; i++) {
                    var str = JSON.stringify((items[i].description[0]));

                    if(str.indexOf("min") > -1) {
                        waitTimes.push({
                            'ride': items[i].title[0],
                            'wait_time': items[i].description[0],
                            'time': Date.now()
                        });
                    }
                }
            });
            console.log(waitTimes);

            sendToElasticSearch(waitTimes);

        } else {
            console.log(err);
        }
    });
}

function sendToElasticSearch(waitTimes) {
    for(var i = 0; i < waitTimes.length; i++) {
        client.create({
            index: myIndex,
            type: 'Times',
            id: uuid(),
            body: waitTimes[i]
        }, function(err, response) {
            if(err) {
                console.log(err);
            } else {
                console.log(response);
            }
        });
    }
};


function setTimeInterval() {
    setInterval(function() {
        fetchWaitingtimes();
    }, interval)
};

setTimeInterval();