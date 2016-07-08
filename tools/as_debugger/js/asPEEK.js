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


/** cache these dom elements*/
function SetupDOMElements()
{
  elements.hoverVariable = $("#hoverVariable");
  elements.hoverVariableTree = $("#hoverVariableTree");
  elements.hoverVariableName = $("#hoverVariableName");
  elements.log = $("#log");
  elements.console =  $("#console");
  elements.consoleInput = $("#consoleInput");
  elements.options = $("#options");
  elements.editorArea = $("#editorArea");
  elements.sectionList = $("#sectionList");
  elements.selectModule = $("#selectModule");
  elements.lowerArea = $("#lowerArea");
  elements.lowerAreaButtons = $("#lowerAreaButtons");
  elements.watcher = $("#watcher");
  elements.newVariable = $("#newVariable");
  elements.tips = $("#tips");
}

function SetupDOMEvents()
{
  elements.newVariable.keypress(NewVariableButton);
  elements.consoleInput.keypress(SendConsoleCommand);
}

function SetupKeybindings()
{
  shortcut.add(settings.keybindings.stepover, function() {SendStepOver();} );
  shortcut.add(settings.keybindings.stepin, function() {SendStepIn();} );
  shortcut.add(settings.keybindings['continue'], function() {SendContinue();} );
  shortcut.add(settings.keybindings.stepout, function() {SendStepOut();} );
  shortcut.add(settings.keybindings.save, function() {SaveSection();} );
}

function ResizeElements()
{
  elements.watcher.resizable("option", "maxWidth", window.innerWidth * 0.7);
  elements.lowerArea.resizable("option", "maxHeight", window.innerHeight * 0.8);

  var width = elements.watcher.width();
  var leftSpace = window.innerWidth - width;

  elements.editorArea.width(leftSpace - 5);
  elements.editorArea.height(window.innerHeight * 0.8);

  elements.lowerArea.height(window.innerHeight - elements.editorArea.height() - 3);
  elements.lowerArea.width(elements.editorArea.width());

  LowerAreaResized();
  WatcherResized();

}


/** Called when stack list received from server */
function HandleStack(data)
{
  var space1 = data.indexOf(' ');
  var obj = data.substr(space1 + 1);
  var msg = $.parseJSON(obj);

  var stackWindow = $("#stackWindow");
  stackWindow.html('');

  var s = "<ul>";
  s += "<li style='border-bottom: 1px solid black;   list-style: none;'>Stack:</li>";
  for(var i = 0; i < msg.length; ++i)
  {
    s += "<li class='stack'";
    if(scriptSections.hasOwnProperty(msg[i].s))
      s+= "onclick='scriptSections["+msg[i].s+"].GoTo("+msg[i].l+")'";
    s += ">";
    s += "<span>"+ i +": </span><span class='lineNumber'>[Line:"+ msg[i].l +"] </span>" + "<span>[Section: "+ scriptSections[msg[i].s].name +"]</span>" + "<span> ["+msg[i].f+"]</span>";
    s += "</li>";
  }
  s += "</ul>";
  stackWindow.append(s);

}


/**
 Ignore builtin keywords. Better stop it before we fill network with garbage data
 I am not checking for these keywords in server. Javascript calculates string comparisons fast.
 If somehow client sends one of these server will look for its for its value like dumbass.
 **/
function IsReservedKeyword(name)
{
    return (name === "and" || name === "else" || name === "in" ||  name === "null" || name === "true" ||
       name === "bool" || name === "enum" || name === "inout" ||  name === "or" || name === "typedef" ||
       name === "break" || name === "false" || name === "int" || name === "out" || name === "uint" ||
       name === "case" || name === "final" || name === "interface" || name === "override" || name === "uint8" ||
       name === "cast" || name === "float" || name === "int8" || name === "private" || name === "uint16" ||
       name === "class" || name === "for" || name === "int16" || name === "return" || name === "uint32" ||
       name === "const" || name === "from" || name === "int32" || name === "set" || name === "uint64" ||
       name === "continue" || name === "funcdef" || name === "int64" || name === "shared" || name === "void" ||
       name === "default" || name === "get" || name === "is" || name === "super" || name === "while" ||
       name === "do" || name === "if" || name === "namespace" || name === "switch" || name === "xor" ||
       name === "double" || name === "import" || name === "not" || name === "this" || name === "mixin"
      );
}