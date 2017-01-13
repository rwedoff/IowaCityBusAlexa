'use strict';

function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: `SessionSpeechlet - ${output}`,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Iowa City Bus';
    const speechOutput = 'Welcome to Iowa City Bus. ' +
        'Please tell me which bus stop number you would like to hear predictions from';
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = 'Please tell me which bus stop number you want to hear predictions from by saying, ' +
        'bus times for 0001';
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = 'Thank you for using Iowa City Bus.  Hope you make your bus!';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;

    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
}

function getBusTimes(intent, session, callback){
    const cardTitle = 'Bus Times';
    // Setting this to true ends the session and exits the skill.
    const shouldEndSession = true;
    const stopNumObj = intent.slots.StopNums;
    const stopNum = stopNumObj.value;
    var speechOutput = 'No bus information is found for ' + stopNum;

    getPredictions(stopNum, function(data) {
        console.log('Download finished', data);
        var resstr = "The following buses are coming. ";
        if(data.length === 0){
            resstr = "No buses are running at this time for stop " + stopNum;
        }
        
        for(var i = 0; i < data.length; i++){
          resstr += data[i].title + " is coming in " + data[i].minutes + " minutes";
          var j = i;
          if(j + 1 < data.length){
            resstr += " and ";
          } else{
            resstr += " .";
          }
        }
        speechOutput = resstr;
        console.log(speechOutput);
        callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession));
    });
}

var http = require('http');

function getPredictions(stopNum, callback){
  var url = "api.ebongo.org";
  var options = {
    host: url,
    port: 80,
    path: '/stoplist?api_key=XXXX&format=json',
    method: 'GET'
  };
  console.log("huh? " + stopNum);
  options['path'] = "/prediction?stopid=" + stopNum +"&api_key=XXXX&format=json";
  http.request(options, function(res) {
    res.setEncoding('utf8');
    var data = '';
    res.on('data', function(chunk){
      data += chunk;
    });
    res.on('end', function(){
      var busData = parseBusText(data);
      callback(busData);
    });
  }).end();
}


function parseBusText(response){
  var  predictionObj = [];
  //console.log(response);
  var parsed = JSON.parse(response);
  var predictions = parsed.predictions;
  
  for(var i = 0; i < predictions.length; i++){
    if(predictions[i].minutes < 20){
      var t = {};
      t["title"] = predictions[i].title;
      t["minutes"] = predictions[i].minutes;
      predictionObj.push(t);
    }
    else{
      i = predictions.length;
      break;
    }
  }
  return predictionObj;
}

/**
 * Sets the bus stop in the session and prepares the speech to reply to the user.
 */
function setStopInSession(intent, session, callback) {
    const cardTitle = intent.name;
    const stopNameSlot = intent.slots.StopName;
    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';

    if (stopNameSlot) {
        const busStop = stopNameSlot.value;
        
        //getBusTimes(favoriteColor);

        getPredictions(stopnums[0], function(data) {
        console.log('Download finished', data);
        var resstr = "The following buses are coming. ";
        if(data.length === 0){
            resstr = "No buses are running at this time for stop " + stopNum.value;
        }
        
        for(var i = 0; i < data.length; i++){
          resstr += data[i].title + " is coming in " + data[i].minutes + " minutes";
          var j = i;
          if(j + 1 < data.length){
            resstr += " and ";
          } else{
            resstr += " .";
          }
        }
        speechOutput = resstr;
    });
        repromptText = "";
    } else {
        speechOutput = "I can't find that stop. Please try again.";
        repromptText = "I can't find that stop.  You can tell me the stop " +
            ' by saying, bus times for stop 0001';
    }

    callback(sessionAttributes,
         buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}



// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;
    console.log("HERE");
    // Dispatch to your skill's intent handlers
    // if (intentName === 'GetBusTimes') {
    //     console.log("open request");
    //     setStopInSession(intent, session, callback);
    /* } else */  if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else if(intentName === 'GetBusTimes'){
        console.log("made it here");
        getBusTimes(intent, session, callback);
    }
    else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
