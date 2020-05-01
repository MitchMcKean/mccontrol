// this is our global websocket, used to communicate from/to Stream Deck software
// and some info about our plugin, as sent by Stream Deck software
var websocket = null,
  uuid = null,
  actionInfo = {};

function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
  uuid = inUUID;
  actionInfo = JSON.parse(inActionInfo); // cache the info
  websocket = new WebSocket("ws://localhost:" + inPort);

  websocket.onopen = function () {
    var json = {
      event: inRegisterEvent,
      uuid: inUUID,
    };
    // register property inspector to Stream Deck
    websocket.send(JSON.stringify(json));
  };
  websocket.onmessage = function (evt) {
    // Received message from Stream Deck
    var jsonObj = JSON.parse(evt.data);
    // var event = jsonObj["event"];
    // var action = jsonObj["action"];
    // var context = jsonObj["context"];
    console.log(jsonObj);
    // if (event == "keyDown") {
    //   var jsonPayload = jsonObj["payload"];
    //   var settings = jsonPayload["settings"];
    //   var coordinates = jsonPayload["coordinates"];
    //   var userDesiredState = jsonPayload["userDesiredState"];
    //   mcControlActions.onKeyDown(context, settings, coordinates, userDesiredState);
    // }
  };
}

function sendValueToPlugin(value, param) {
  if (websocket) {
    const json = {
      action: actionInfo["action"],
      event: "sendToPlugin",
      context: uuid,
      payload: {
        [param]: value,
      },
    };
    websocket.send(JSON.stringify(json));
  }
}
