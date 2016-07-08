/*
 Copyright (c) 2012 Muhammed Ikbal Akpaca

 This software is provided 'as-is', without any express or implied
 warranty. In no event will the authors be held liable for any damages
 arising from the use of this software.

 Permission is granted to anyone to use this software for any purpose,
 including commercial applications, and to alter it and redistribute it
 freely, subject to the following restrictions:

 1. The origin of this software must not be misrepresented; you must not
 claim that you wrote the original software. If you use this software
 in a product, an acknowledgment in the product documentation would be
 appreciated but is not required.

 2. Altered source versions must be plainly marked as such, and must not be
 misrepresented as being the original software.

 3. This notice may not be removed or altered from any source
 distribution.
 */


var conStatus = false;
function CreateWebsocket()
{
  output = document.getElementById("output");

  websocket = new WebSocket("ws://" + settings.ip + ":" + settings.port);
  
  websocket.onopen = function (evt) {
    onOpen(evt);
  };
  websocket.onclose = function (evt) {
    onClose(evt);
  };
  websocket.onmessage = function (evt) {
    onMessage(evt);
  };
  websocket.onerror = function (evt) {
    onError(evt);
  };
  
}

function onOpen(evt)
{
  RemoveAllModules();
  ClearLocalTree();
  ClearThisTree();

  var $connectionStatus = $("#connectionStatus");
  $connectionStatus.text("Connection Established");
  $connectionStatus.css("background", '-webkit-linear-gradient(top, #ffffff 3%,#8ab66b 98%)');
  $connectionStatus.css("background", '-moz-linear-gradient(top, #ffffff 3%,#8ab66b 98%)');
  conStatus = true;
  AddLogMessage("Connection Established", 'green');
}

function onClose(evt)
{
  if(conStatus)
  {
    EndDebug();

    AddLogMessage("Connection Lost", 'red');

    var $connectionStatus = $("#connectionStatus");
    $connectionStatus.text("Trying to Reconnect...");
    $connectionStatus.css("background", '-webkit-linear-gradient(top, #ffffff 3%,#f9f993 100%)');
    
    conStatus = false;
  }

  setTimeout(function()
  {
    CreateWebsocket();
  }, settings.reconnectdelay);
}

function onMessage(evt)
{

  var cmd = evt.data.substr(0,4);
  var obj = [];
  if (cmd == "ERRO")
  {
  // TODO, log
  }
  else if(cmd === "REQV")
  {
    obj = evt.data.split(" ");
    if(obj[1] === lastQuery.word)
    {
      ProcessREQV(evt.data);
    }
  }
  else if (cmd === "MODL")
  {
    obj = $.parseJSON(evt.data.substr(5, evt.data.length));

    ModList = [];
    ModList = obj;

    RefreshModules();

  }
  else if (cmd === "VARV")
  {
    HandleVariableValue(evt.data);
  }
  else if (cmd === "SCLS")
  {
    HandleSCLS(evt.data);
  }
  else if (cmd === "CTXL")
  {
    obj = evt.data.split(" ");
    HandleCTXL(obj);
  }
  else if (cmd === "FILE")
  {
    obj = evt.data.split(" ");
    HandleFILE(obj[1], evt.data);
  }
  else if (cmd === "BSET")
  {
    obj = evt.data.split(" ");
    HandleBSET(obj);
  }
  else if (cmd === "BREM")
  {
    obj = evt.data.split(" ");
    HandleBREM(obj);
  }
  else if (cmd === "HITL")
  {
    obj = evt.data.split(" ");
    HandleHITL(obj);
  }
  else if (cmd === "LOCV")
  {
    FillLocal(evt.data);
  }
  else if (cmd === "THIS")
  {
    obj = evt.data.split(" ");
    FillThis(obj);
  }
  else if (cmd === "CONT")
  {
    if (debugSession.currentLine != null)
    {
      if(editors.hasOwnProperty(debugSession.currentSectionId))
      {
        editors[debugSession.currentSectionId].editor.session.removeGutterDecoration(debugSession.currentLine - 1, 'editorCurrentLine');
      }
    }

    $("#stackWindow").children().remove();

    localTree.removeChildren();
    thisTree.removeChildren();
    
    debugSession.currentSectionId = null;
    debugSession.currentLine = null;
    
  }
  else if(cmd === "SECM")
  {
    obj = evt.data.split(" ");
    // TODO, allow option to ignore file update
    var id = parseInt(obj[1], 10);
    RequestSection(id);
  }
  else if(cmd === "STCK")
  {
    obj = evt.data.split(" ");
    HandleStack(evt.data);
  }
  else if(cmd === "EXCT")
  {
    AddConsoleMessage(evt.data.substr(5, evt.data.length));
  }
  else if(cmd === "LOGE")
  {
    AddLogMessage(evt.data.substr(5, evt.data.length), "red");
  }
  else if(cmd === "LOGW")
  {
    AddLogMessage(evt.data.substr(5, evt.data.length), "brown");
  }
  else if(cmd === "LOGI")
  {
    AddLogMessage(evt.data.substr(5, evt.data.length), "black");
  }

  // DEBUG
  if(cmd !== "FILE")
  {
    if(settings.debug)
      AddLogMessage("RECV: " + evt.data + "</span>", "blue");
  }
}

function onError(evt)
{
  // firefox create false error on connection failure
  if(evt.data !== undefined)
   AddLogMessage("ERROR: "+ evt.data, 'red');
}

function doSend(message)
{
  websocket.send(message);
}

function Assign()
{
  doSend("ASGN " + $("#VarName").val() + " " + $("#VarValue").val());
}