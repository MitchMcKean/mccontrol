// this is our global websocket, used to communicate from/to Stream Deck software
// and some info about our plugin, as sent by Stream Deck software
var websocket = null,
  uuid = null,
  actionInfo = {},
  inInfo = {},
  runningApps = [],
  settings = {},
  isQT = navigator.appVersion.includes("QtWebEngine"),
  onchangeevt = "onchange"; // 'oninput'; // change this, if you want interactive elements act on any change, or while they're modified

function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
  uuid = inUUID;
  // please note: the incoming arguments are of type STRING, so
  // in case of the inActionInfo, we must parse it into JSON first
  actionInfo = JSON.parse(inActionInfo); // cache the info
  inInfo = JSON.parse(inInfo);
  websocket = new WebSocket("ws://127.0.0.1:" + inPort);

  /** Since the PI doesn't have access to your OS native settings
   * Stream Deck sends some color settings to PI
   * We use these to adjust some styles (e.g. highlight-colors for checkboxes)
   */
  //addDynamicStyles(inInfo.colors, "connectElgatoStreamDeckSocket");

  /** let's see, if we have some settings */
  settings = getPropFromString(actionInfo, "payload.settings", false);
  console.log(settings, actionInfo);
  initPropertyInspector(5);

  // if connection was established, the websocket sends
  // an 'onopen' event, where we need to register our PI
  websocket.onopen = function () {
    var json = {
      event: inRegisterEvent,
      uuid: inUUID,
    };
    // register property inspector to Stream Deck
    websocket.send(JSON.stringify(json));
    // demoCanvas();
  };

  websocket.onmessage = function (evt) {
    // Received message from Stream Deck
    var jsonObj = JSON.parse(evt.data);
    var event = jsonObj["event"];
    if (getPropFromString(jsonObj, "payload.runningApps") && event === "sendToPropertyInspector") {
      sdpiCreateList(document.querySelector("#runningAppsContainer"), {
        id: "runningAppsID",
        label: "Running Apps",
        value: jsonObj.payload.runningApps,
        type: "list",
        selectionType: "no-select",
      });
    }
  };
}

window.addEventListener(
  "message",
  function (ev) {
    console.log("External window received message:  ", ev.data, typeof ev.data);
    if (ev.data === "initPropertyInspector") {
      initPropertyInspector(5);
    }
  },
  false
);

function initPropertyInspector(initDelay) {
  prepareDOMElements(document);
}

function revealSdpiWrapper() {
  const el = document.querySelector(".sdpi-wrapper");
  el && el.classList.remove("hidden");
}

// our method to pass values to the plugin
function sendValueToPlugin(value, param) {
  if (websocket && websocket.readyState === 1) {
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

if (!isQT) {
  document.addEventListener("DOMContentLoaded", function () {
    initPropertyInspector(100);
  });
}

window.addEventListener("beforeunload", function (e) {
  e.preventDefault();
  // since 4.1 this is no longer needed, as the plugin will receive a notification
  // right before the Property Inspector goes away
  sendValueToPlugin("propertyInspectorWillDisappear", "property_inspector");
  // Don't set a returnValue to the event, otherwise Chromium with throw an error.  // e.returnValue = '';
});

function prepareDOMElements(baseElement) {
  baseElement = baseElement || document;
  Array.from(baseElement.querySelectorAll(".sdpi-item-value")).forEach((el, i) => {
    const elementsToClick = ["BUTTON", "OL", "UL", "TABLE", "METER", "PROGRESS", "CANVAS"].includes(el.tagName);
    const evt = elementsToClick ? "onclick" : onchangeevt || "onchange";

    /** Look for <input><span> combinations, where we consider the span as label for the input
     * we don't use `labels` for that, because a range could have 2 labels.
     */
    const inputGroup = el.querySelectorAll("input + span");
    if (inputGroup.length === 2) {
      const offs = inputGroup[0].tagName === "INPUT" ? 1 : 0;
      inputGroup[offs].textContent = inputGroup[1 - offs].value;
      inputGroup[1 - offs]["oninput"] = function () {
        inputGroup[offs].textContent = inputGroup[1 - offs].value;
      };
    }
    /** We look for elements which have an 'clickable' attribute
     * we use these e.g. on an 'inputGroup' (<span><input type="range"><span>) to adjust the value of
     * the corresponding range-control
     */
    Array.from(el.querySelectorAll(".clickable")).forEach((subel, subi) => {
      subel["onclick"] = function (e) {
        handleSdpiItemChange(e.target, subi);
      };
    });
    /** Just in case the found HTML element already has an input or change - event attached,
     * we clone it, and call it in the callback, right before the freshly attached event
     */
    const cloneEvt = el[evt];
    el[evt] = function (e) {
      if (cloneEvt) cloneEvt();
      handleSdpiItemChange(e.target, i);
    };
  });

  /**
   * You could add a 'label' to a textares, e.g. to show the number of charactes already typed
   * or contained in the textarea. This helper updates this label for you.
   */
  baseElement.querySelectorAll("textarea").forEach((e) => {
    const maxl = e.getAttribute("maxlength");
    e.targets = baseElement.querySelectorAll(`[for='${e.id}']`);
    if (e.targets.length) {
      let fn = () => {
        for (let x of e.targets) {
          x.textContent = maxl ? `${e.value.length}/${maxl}` : `${e.value.length}`;
        }
      };
      fn();
      e.onkeyup = fn;
    }
  });

  baseElement.querySelectorAll("[data-open-url]").forEach((e) => {
    const value = e.getAttribute("data-open-url");
    if (value) {
      e.onclick = () => {
        let path;
        if (value.indexOf("http") !== 0) {
          path = document.location.href.split("/");
          path.pop();
          path.push(value.split("/").pop());
          path = path.join("/");
        } else {
          path = value;
        }
        $SD.api.openUrl($SD.uuid, path);
      };
    } else {
      console.log(`${value} is not a supported url`);
    }
  });
}

function handleSdpiItemChange(e, idx) {
  /** Following items are containers, so we won't handle clicks on them */

  if (["OL", "UL", "TABLE"].includes(e.tagName)) {
    return;
  }

  /** SPANS are used inside a control as 'labels'
   * If a SPAN element calls this function, it has a class of 'clickable' set and is thereby handled as
   * clickable label.
   */

  if (e.tagName === "SPAN") {
    const inp = e.parentNode.querySelector("input");
    var tmpValue;

    // if there's no attribute set for the span, try to see, if there's a value in the textContent
    // and use it as value
    if (!e.hasAttribute("value")) {
      tmpValue = Number(e.textContent);
      if (typeof tmpValue === "number" && tmpValue !== null) {
        e.setAttribute("value", 0 + tmpValue); // this is ugly, but setting a value of 0 on a span doesn't do anything
        e.value = tmpValue;
      }
    } else {
      tmpValue = Number(e.getAttribute("value"));
    }

    if (inp && tmpValue !== undefined) {
      inp.value = tmpValue;
    } else return;
  }

  const selectedElements = [];
  const isList = ["LI", "OL", "UL", "DL", "TD"].includes(e.tagName);
  const sdpiItem = e.closest(".sdpi-item");
  const sdpiItemGroup = e.closest(".sdpi-item-group");
  let sdpiItemChildren = isList
    ? sdpiItem.querySelectorAll(e.tagName === "LI" ? "li" : "td")
    : sdpiItem.querySelectorAll(".sdpi-item-child > input");

  if (isList) {
    const siv = e.closest(".sdpi-item-value");
    if (!siv.classList.contains("multi-select")) {
      for (let x of sdpiItemChildren) x.classList.remove("selected");
    }
    if (!siv.classList.contains("no-select")) {
      e.classList.toggle("selected");
    }
  }

  if (sdpiItemChildren.length && ["radio", "checkbox"].includes(sdpiItemChildren[0].type)) {
    e.setAttribute("_value", e.checked); //'_value' has priority over .value
  }
  if (sdpiItemGroup && !sdpiItemChildren.length) {
    for (let x of ["input", "meter", "progress"]) {
      sdpiItemChildren = sdpiItemGroup.querySelectorAll(x);
      if (sdpiItemChildren.length) break;
    }
  }

  if (e.selectedIndex) {
    idx = e.selectedIndex;
  } else {
    sdpiItemChildren.forEach((ec, i) => {
      if (ec.classList.contains("selected")) {
        selectedElements.push(ec.textContent);
      }
      if (ec === e) {
        idx = i;
        selectedElements.push(ec.value);
      }
    });
  }

  const returnValue = {
    key: e.id && e.id.charAt(0) !== "_" ? e.id : sdpiItem.id,
    value: isList
      ? e.textContent
      : e.hasAttribute("_value")
      ? e.getAttribute("_value")
      : e.value
      ? e.type === "file"
        ? decodeURIComponent(e.value.replace(/^C:\\fakepath\\/, ""))
        : e.value
      : e.getAttribute("value"),
    group: sdpiItemGroup ? sdpiItemGroup.id : false,
    index: idx,
    selection: selectedElements,
    checked: e.checked,
  };

  /** Just simulate the original file-selector:
   * If there's an element of class '.sdpi-file-info'
   * show the filename there
   */
  if (e.type === "file") {
    const info = sdpiItem.querySelector(".sdpi-file-info");
    if (info) {
      const s = returnValue.value.split("/").pop();
      info.textContent = s.length > 28 ? s.substr(0, 10) + "..." + s.substr(s.length - 10, s.length) : s;
    }
  }

  sendValueToPlugin(returnValue, "sdpi_collection");
}

function sdpiCreateList(el, obj, cb) {
  if (el) {
    el.style.display = obj.value.length ? "block" : "none";
    Array.from(document.querySelectorAll(`.${el.id}`)).forEach((subel, i) => {
      subel.style.display = obj.value.length ? "flex" : "none";
    });
    if (obj.value.length) {
      el.innerHTML = `<div class="sdpi-item" ${obj.type ? `class="${obj.type}"` : ""} id="${
        obj.id || window.btoa(new Date().getTime().toString()).substr(0, 8)
      }">
            <div class="sdpi-item-label">${obj.label || ""}</div>
            <ul class="sdpi-item-value ${obj.selectionType ? obj.selectionType : ""}">
                    ${obj.value.map((e) => `<li>${e}</li>`).join("")}
                </ul>
            </div>`;
      setTimeout(function () {
        prepareDOMElements(el);
        if (cb) cb();
      }, 10);
      return;
    }
  }
  if (cb) cb();
}

const getPropFromString = (jsn, str, sep = ".") => {
  const arr = str.split(sep);
  return arr.reduce((obj, key) => (obj && obj.hasOwnProperty(key) ? obj[key] : undefined), jsn);
};

function injectStyle(clrs) {
  const node = document.createElement("style");
  const tempID = window.btoa(new Date().getTime().toString()).slice(10, 18);
  node.setAttribute("id", tempID);
  node.innerHTML = clrs;
  document.body.appendChild(node);
  return tempID;
}
