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
  // websocket.onmessage = function (evt) {
  //   var jsonObj = JSON.parse(evt.data);
  //   var value = jsonObj.payload.settings;
  //   setDomElements(value);
  // };
}

// function setDomElements(value) {
//   document.getElementById("apiLink").innerHTML = value.apiLink;
//   document.getElementById("itemName").innerHTML = value.itemName;
// }

function sendValueToPlugin(value, param) {
  if (websocket) {
    const json = {
      action: actionInfo["action"],
      event: "sendToPlugin",
      context: uuid,
      payload: { [param]: value },
    };
    websocket.send(JSON.stringify(json));
  }
}
