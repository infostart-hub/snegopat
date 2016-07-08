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

function Editor(id, elementid)
{
  /** Members */
  var self = this;

  this.editor = ace.edit(elementid);

  this.sectionId = id;

  this.element = $("#" + elementid);

  /** Holds locations of currently placed breakpoints*/
  this.breakpoints = {};

  //////////////// initialization //////////////////////
  //////////////////////////////////////////////////////

  this.editor.setTheme("ace/theme/"+ settings.theme);
  this.editor.getSession().setMode("ace/mode/c_cpp");
  this.element.css('font-size', settings.fontsize);
  this.editor.getSession().setUseSoftTabs(true);
  this.editor.getSession().setTabSize(settings.tabsize);
  this.editor.setShowPrintMargin(settings.printmargin);

  if(scriptSections[id].data === "")
  {
    self.editor.setValue("This section is yet to be received!");
    self.editor.selection.clearSelection();
    scriptSections[id].RequestData();
  }
  else
  {
    self.editor.setValue(scriptSections[id].data);
    self.editor.selection.clearSelection();
  }

  // when a gutter is clicked, place or remove a breakpoint
  this.editor.on("guttermousedown", function (e)
  {
    var target = e.domEvent.target;
    if (target.className.indexOf("ace_gutter-cell") == -1)
      return;

    var row = e.getDocumentPosition().row; // this function gets it one line shifted
    var sec = scriptSections[self.sectionId];

    if (sec.HasBreakpoint(row + 1))
      SendRemoveBreakpoint(sec.id, row + 1);
    else
      SendSetBreakpoint(sec.id, row + 1);

  });

  /** This maybe improved. Works fine for now */
  this.editor.on('mousemove', function(e)
  {
    // if distance is move than 100px then hide
    if(Math.abs(lastQuery.hover_x - e.clientX) + Math.abs(lastQuery.hover_y - e.clientY) > 100)
    {
      elements.hoverVariable.hide();
      lastQuery.word = ""; // also reset lastWord because user might move over same varible without moving too far
    }

    var position = e.getDocumentPosition();

    var hit_word = self.editor.session.getLine(position.row);

    if (hit_word !== "")
    {

      var word = GetWord(hit_word, position.column - 1);

      if(word === null)
        return;

      word = word[0];

      if( (new Date()).getTime() - timeSinceLastVariableQuery > 500)
      {
        timeSinceLastVariableQuery = (new Date()).getTime();

        /** if mouse is too far from word location dont */
        var wordEndpos = self.editor.renderer.textToScreenCoordinates(position.row, position.column);

        if(Math.abs(wordEndpos.pageX - e.clientX) > 10)
          return;


        if(word !== lastQuery.word)
        {  }
        if(websocket.readyState == 1) // if open
        {
          if(!IsReservedKeyword(word))
          {
            lastQuery.x = wordEndpos.pageX;//e.clientX;
            lastQuery.y = wordEndpos.pageY + parseInt(settings.fontsize + 1, 10);//e.clientY;
            lastQuery.word = word;
            doSend("REQV "+ self.sectionId + " " + word);
          }
        }

      }


    }
  });

  //////////////// END OF initialization //////////////////////
  /////////////////////////////////////////////////////////////

  /** METHODS */

  this.Hide = function()
  {
    $(self.element).hide();
    self.editor.resize(true);
  }

  this.Save = function()
  {
    doSend("SAVE " + self.sectionId + " " + self.editor.getValue());
  }

  this.Show = function()
  {
    $(self.element).show();
    self.editor.resize(true);
  }

  this.Resize = function (width, height)
  {
    var dhei = $("#openDocuments").height();
    $(self.element).width(width);
    $(self.element).height(height - dhei);
    $(self.element).css("margin-top", dhei);
    self.editor.resize();
  }

  this.RedrawBreakpoints = function()
  {
    var section = scriptSections[self.sectionId];

    if(section === null)
      return;

    for(var b in self.breakpoints)
    {
      self.editor.session.removeGutterDecoration(b - 1, 'editorBreakpoint');
    }

    self.breakpoints = {};

    // show breakpoints in editor
    for (var i in section.breakpoints)
    {
      self.editor.session.addGutterDecoration(i - 1, 'editorBreakpoint');
      self.breakpoints[i] = true;
    }
  };

}

// section and line debugger stopped
var debugSession =
{
  'currentSectionId' : null,
  'currentLine' : null 
};

function EndDebug()
{

  $("#openDocuments").children().remove();

  scriptSections = {};

  for(var i in editors)
  {
    if(editors.hasOwnProperty(i))
      editors[i].element.remove();
  }

  editors = {};

  elements.sectionList.children().remove();

  $("#stackWindow").children().remove();
  $("#breakpointsWindow").children().remove();

  elements.hoverVariable.hide();

  debugSession.currentLine = null;
  debugSession.currentSectionId = null;
}

function HandleFILE(sectionId, data)
{
  var space1 = data.indexOf(' ');
  var space2 = data.indexOf(' ', space1 + 1);
  
  var id = parseInt(sectionId, 10);
  
  var newSection = null;
  
  if (scriptSections.hasOwnProperty(id))
    newSection = scriptSections[id];
  
  if (newSection) // if already exists update contents
  {
    newSection.dataRequested = false;
    newSection.data = data.substring(space2 + 1);
    newSection.Reload();
  }
  else
  {
    // this should never happen.
    // server serves sectionid and section name in client connection
  }

}

function LoadSectionToEditor(name)
{
  var section = GetSection(name);
  
  editor.setValue(section.data);
  // ace select new content, unselect it
  editor.selection.clearSelection();
  editor.loadedFile = name;
  
  LoadBreakpoints(section);
}

var lastQuery = 
{
  'x': null,
  'y': null,
  'hover_x': null,
  'hover_y': null,
  'word': ""
};

var timeSinceLastVariableQuery = 0;

/**
This function gets a string and an index. Returns a valid asPEEK variable name
if it takes myFather.child.me.age with index at c it will return myFather.child
if it takes my_father.HasChild() with index at H it will return null. functions are ignored. if index is at r it will return my_father

this is a very primitive way to this. i should make a tokenizer later.
*/
function GetWord(s, pos)
{
  if(pos < 0)
    return null;


  if(s === "")
    return null;

  var rightPos = pos;
  var leftPos = pos;
  
  while (true)
  {
    
    if (rightPos >= s.length)
      break;

    if (s[rightPos] == "(")
      return null; // if found a opening bracket it is a function. we don't like functions

    if (s[rightPos] == " " || s[rightPos] == "\t")
    {
      // just look 1 more square a head. see if this is actually a function.
      // some people leave spaces when calling functions. (i do too sometimes)
      if (s[rightPos + 1] == "(")
        return null;

      rightPos--;
      break;
    }

    if (s[rightPos] === "." ||
        s[rightPos] === "[" ||
        s[rightPos] === "," ||
        s[rightPos] === ";" ||
        s[rightPos] === "+" ||
        s[rightPos] === "-" ||
        s[rightPos] === "/" ||
        s[rightPos] === "*" ||
        s[rightPos] === ")" ||
        s[rightPos] === "]"
      )
    {
      rightPos--;
      break;
    }

    rightPos++;
    
    
  }
  
  while (true)
  {
    if (s[leftPos] == " " ||
      s[leftPos] == "\t" ||
      s[leftPos] == "[" ||
      s[leftPos] == "(" ||
      s[leftPos] == "," ||
      s[leftPos] == "+" ||
      s[leftPos] == "-" ||
      s[leftPos] == "/" ||
      s[leftPos] == "*" ||
      s[leftPos] == ";" ||
      s[leftPos] == "=" ||
      s[leftPos] == "&" ||
      s[leftPos] == "@")
    {
      leftPos++;
      break;
    }

    if (leftPos <= 0)
      break;
    
    leftPos--;
    
  }

  return s.substr(leftPos, rightPos - leftPos + 1).match(/^((::)?[_a-zA-Z][_a-z0-9A-Z.]?)+$/);
}

function SendSetBreakpoint(secId, line)
{
  doSend("BRKS " + secId + " " + line);
}

function SendRemoveBreakpoint(secId, line)
{
  doSend("BRKR " + secId + " " + line);
}

function HandleBREM(obj)
{
  var secId = parseInt(obj[1], 10);
  var line = parseInt(obj[2], 10);
  
  if (scriptSections.hasOwnProperty(secId))
  {
    var sec = scriptSections[secId];
    sec.RemoveBreakpoint(line);
  }
  else // if this happened, then somehow this client missed on when server is serving section information. 
  {
    console.log("Received breakpoint deletion, but i don't have information about section. Breakpoint line: " + line + ", Section: " + secId);
  }
}

function HandleBSET(obj)
{
  var secId = parseInt(obj[1], 10);
  var line = parseInt(obj[2], 10);
  
  if (scriptSections.hasOwnProperty(secId))
  {
    var sec = scriptSections[secId];
    sec.AddBreakpoint(line);
  }
  else // if this happened, then somehow this client missed on when server is serving section information. 
  {
    console.log("Received breakpoint, but i don't have information about section. Breakpoint line: " + line + ", Section: " + secId);
  }
}

function HandleHITL(obj)
{ 
  var secId = parseInt(obj[1], 10);
  var line = parseInt(obj[2], 10);
  
  RedrawCurrentLine(secId, line);
}

function RedrawCurrentLine(sectionId, line)
{
  if (debugSession.currentLine != null)
  {
    if(editors.hasOwnProperty(debugSession.currentSectionId))
    {
      editors[debugSession.currentSectionId].editor.session.removeGutterDecoration(debugSession.currentLine - 1, 'editorCurrentLine');
    }
  }
  
  debugSession.currentSectionId = sectionId;
  debugSession.currentLine = line;
  
  if (debugSession.currentLine != null)
  {
    if(editors.hasOwnProperty(debugSession.currentSectionId))
    {
      editors[debugSession.currentSectionId].editor.session.addGutterDecoration(debugSession.currentLine - 1, 'editorCurrentLine');
      FocusDocument(scriptSections[debugSession.currentSectionId], line);
    }
    else
    {
      // Open document, this FocusDocument will call this function again to draw the current line
      FocusDocument(scriptSections[debugSession.currentSectionId], line);
    }
  }
}

function ProcessREQV(data)
{
  lastQuery.hover_x = lastQuery.x;
  lastQuery.hover_y = lastQuery.y;
  elements.hoverVariable.css('left', lastQuery.x + 20);
  elements.hoverVariable.css('top', lastQuery.y);


  var o = {};
  var name = "";
  try
  {
    var secondSpace = data.indexOf(" ", 5);
    name = data.substr(5, secondSpace - 5);
    o = $.parseJSON(data.substr(secondSpace+1, data.length));
  }
  catch(e)
  {
    elements.hoverVariable.hide();
    return;
  }

  elements.hoverVariableName.text(name);

  hoverTree.removeChildren();
  
  if(o instanceof Object) // object or array
  {  
    ConstructTree(o, hoverTree, name);
    hoverTree.expand(true);
  }
  else
  {
    hoverTree.addChild({
      title: o.toString(),
      icon: false
    });
  }


  elements.hoverVariable.show();
}

function SetupHoverWindow()
{
  elements.hoverVariable.hide();

  elements.hoverVariableTree.dynatree({});
  
  hoverTree = elements.hoverVariableTree.dynatree("getRoot");
}

function LoadEditor(section)
{
  if(editors.hasOwnProperty(section.id))
  {
  // become visible

  }
  else
  {
    var id = "editor_" + section.id;
    elements.editorArea.append("<pre style='position:absolute;left:0;right:0;margin:0;padding:0; background-color:gray;' id='"+ id +"'></pre>");
    editors[section.id] = new Editor(section.id, id);
    
    editors[section.id].Resize(elements.editorArea.width(), elements.editorArea.height());
    
    RedrawCurrentLine(debugSession.currentSectionId, debugSession.currentLine);

    AddNewToDocuments(section);
  }
}

function AddNewToDocuments(newSection)
{
  var s = "<span class='document' id='doc_"+ newSection.id +"'><span class='documentName' id='opendoc_";
  s += newSection.id;
  s += "'>";
  s += newSection.name;
  s += "</span><span class='documentCloseButton' onclick='CloseDocument("+ newSection.id +")'>x</span></span>";

  $("#openDocuments").append(s);
  //var newDoc = $(s).appendTo($("#openDocuments"));
  var newDoc = $("#opendoc_"+newSection.id);
  newDoc.data("sectionid", newSection.id);
  
  newDoc.click(OpenDocument);
}

function CloseDocument(id)
{
  if(!scriptSections.hasOwnProperty(id))
    return;

  if(!editors.hasOwnProperty(id))
    return;

  var section = scriptSections[id];

  editors[id].element.remove();
  delete editors[id];

  $("#doc_" + id).remove();

  // resize it
  WatcherResized();
  LowerAreaResized();
}

function OpenDocument()
{
  var id = $(this).data("sectionid");
  var section = scriptSections[id];
  
  FocusDocument(section);
}

function FocusDocument(section, linenumber)
{

  LoadEditor(section);


  editors[section.id].RedrawBreakpoints();
  
  // resize it
  WatcherResized();
  LowerAreaResized();

  $(".documentName").removeClass('documentSelected');
  $("#opendoc_" + section.id).addClass('documentSelected');

  for(var i in editors)
    editors[i].Hide();


  activeEditor = section.id;
  editors[section.id].Show();
  editors[section.id].editor.focus();

  if(linenumber !== undefined)
  {
    editors[section.id].editor.gotoLine(linenumber, 0, false);
  }
}
