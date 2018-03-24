"use strict";
/**
 * Ronaldo Barbachano
 * 2018
 *
 * Node backend passes off various files and 
 * queries feed to store in memory
 *
 *    NO DATABASE IS USED
 */

var http = require('http');


var fs = require('fs');
var request = require('request');
var rootUrl = process.env.URL || "http://localhost:3000";
var PORT = process.env.PORT || 3000;





var eggJSON = undefined;
// variable to get another egg reading ... in the past
var eggJSONPrev = {};

setInterval(queryEgg,1000)

function queryEgg(seconds){
        if(typeof seconds == 'undefined'){
            seconds = 1
        }
        var today = new Date();
        var thePast = new Date();
        thePast.setSeconds(today.getSeconds() - seconds);
        var endpoint = "http://www.global-mind.org/cgi-bin/eggdatareq.pl?z=1&year=" + 
        (thePast.getYear() + 1900) + 
        "&month=" + thePast.getMonth() + 
        "&day=" + thePast.getDate() + 
        "&stime=" + thePast.getHours() + 
        ":" + thePast.getMinutes() + 
        ":" + thePast.getSeconds() + 
        "&etime=" + today.getHours() + 
        ":" + today.getMinutes() + 
        ":" + today.getSeconds() + 
        "&gzip=no";
        var response = {};
        response.data = [];
        request(endpoint, function(error, response, body) {
            if (!error && response.statusCode == 200) {
                body = body.split('\n');
                var row = {};
                row.data = {};
                var keys = [];
                body.filter(function(o, rowIndex) {
                    o = o.split(',');
                    if (o[0] == "12") {
                        // gm time these are tthe indexes
                        // remove first three
                        o.shift();
                        o.shift();
                        o.shift();
                        keys = o;
                    } else if (o[0] == "13") {
                        o.shift();
                        var time = o[0];
                        o.shift();
                        o.shift();
                        o.filter(function(innerO, innerIndex) {
                            if (innerO != '') {
                                row.data[keys[innerIndex]] = parseInt(innerO);
                            } else {
                                row.data[keys[innerIndex]] = '';
                            }
                        })
                        // match o to keys
                    } else if (o[0] == "11") {
                        // eggs reporting
                        if (o[1] == '1') {
                            row.eggs_reporting = o[2];
                        } else if (o[1] == '2') {
                            row.start_time = parseInt(o[2]);
                        } else if (o[1] == '3') {
                            row.end_time = parseInt(o[2]);
                        } else if (o[1] == '4') {
                            row.seconds_of_data = parseInt(o[2]);
                        }
                    } else if (o[0] == "10") {
                        if (o[1] == "1") {
                            row.samples_per_record = parseInt(o[2]);
                        } else if (o[1] == "2") {
                            row.seconds_per_record = parseInt(o[2]);
                        } else if (o[1] == "3") {
                            row.records_per_packet = parseInt(o[2]);
                        } else if (o[1] == "4") {
                            row.trial_size = parseInt(o[2]);
                        }
                    }
                }.bind(this));
                if(seconds === 1){
                    eggJSON = JSON.stringify(row.data)
                }else{
                    // convert seconds to string
                    var secCheck = seconds.toString()
                    if(typeof eggJSONPrev[secCheck] == 'undefined'){
                        eggJSONPrev[secCheck] = ''
                    }
                    eggJSONPrev[secCheck] = JSON.stringify(row.data)
                }
            }
        });
}



/**
 * handles inbound requests
 * if 'code' is provided, redeem code for accessToken and log it to the console
 * otherwise, redirect to the Moves auth URL
 **/
function handleRequest(req, res) {
    var authCodeRegex = /code=(.*)&.*/gi;
    var accessTokenRegex = /token=(.*)&.*/gi;
    var urlMatch = authCodeRegex.exec(req.url)
    if (req.url == '/favicon.ico') {
        res.end();
    } else if (req.url == "/eegData") {

        res.setHeader('Content-Type', 'application/json');
        res.write((typeof eggJSON != 'undefined' ? eggJSON : 'false'))
        res.end()

    } else if (req.url == "/eegDataPrev24") {
        // 24 hour data ... can support more 'past live values'
        // 1 month ago? 1 year ago? 
        res.setHeader('Content-Type', 'application/json');
        res.write((typeof eggJSONPrev != 'undefined' ? eggJSONPrev['86400'] : 'false'))
        res.end()

    }else if(req.url == '/main.css'){
        var filename = "main.css";
        fs.readFile(filename, "binary", function(err, file) {
            if (err) {
                res.writeHead(500, {
                    "Content-Type": "application/json"
                });
                res.write(err + "\n");
                res.end();
                return;
            }

            res.writeHead(200,{ "Content-Type": "text/css" });
            res.write(file, "binary");
            res.end();
        });
    }else if(req.url == '/siriwave.js'){
        var filename = "siriwave.js";
        fs.readFile(filename, "binary", function(err, file) {
            if (err) {
                res.writeHead(500, {
                    "Content-Type": "application/json"
                });
                res.write(err + "\n");
                res.end();
                return;
            }

            res.writeHead(200,{ "Content-Type": 'application/json' });
            res.write(file, "binary");
            res.end();
        });
    }else if(req.url == '/index.html' || req.url == '/' || req.url == ''){
        var filename = "index.html";
        fs.readFile(filename, "utf8", function(err, file) {
            if (err) {
                res.writeHead(500, {
                    "Content-Type": "text/plain"
                });
                res.write(err + "\n");
                res.end();
                return;
            }

            res.writeHead(200);
            res.write(file, "binary");
            res.end();
        });
    }
    
}

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(PORT, function() {
    console.log("Visit " + rootUrl + (PORT != 80 ? '' : PORT) + " to connect to gcp-siri");
});