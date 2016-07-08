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


function HandleSCLS(data)
{
  var o = $.parseJSON(data.substr(5, data.length));

  EndDebug();

  for(var i in o)
  {
    if(o.hasOwnProperty(i))
    {

      var section = new Section();

      section.id = o[i].id;
      section.name = o[i].name;
      section.mod = o[i].mod;

      scriptSections[section.id] = section;
    }

  }

  UpdateSectionList();

}

function HandleCTXL(obj)
{
  contexts = [];

  for (var i = 1; i < obj.length; ++i)
    contexts[i - 1] = obj[i];
}

/** Called when one of the lower buttons clicked*/
function LowerButtonClick(evt)
{

  elements.log.hide();
  elements.console.hide();
  elements.consoleInput.hide();
  elements.options.hide();
  elements.tips.hide();

  elements.lowerAreaButtons.children().removeClass('activeButton');
  if($(evt.currentTarget).attr('id') === "logButton")
  {
    $(evt.currentTarget).addClass('activeButton');
    elements.log.show();
  }
  else if($(evt.currentTarget).attr('id') === "consoleButton")
  {
    $(evt.currentTarget).addClass('activeButton');
    elements.console.show();
    elements.consoleInput.show();
  }
  else if($(evt.currentTarget).attr('id') === "optionsButton")
  {
    $(evt.currentTarget).addClass('activeButton');
    elements.options.show();
  }
  else if($(evt.currentTarget).attr('id') === "tipsButton")
  {
    $(evt.currentTarget).addClass('activeButton');
    elements.tips.show();
  }

}

function LowerAreaResized()
{
  elements.editorArea.height(window.innerHeight - elements.lowerArea.height() - 3);

  for(var e in editors)
  {
    if(editors.hasOwnProperty(e))
      editors[e].Resize(elements.editorArea.width(), elements.editorArea.height());
  }


  elements.log.height(elements.lowerArea.height() - elements.lowerAreaButtons.height());
  elements.console.height(elements.lowerArea.height() - elements.lowerAreaButtons.height());
  elements.tips.height(elements.lowerArea.height() - elements.lowerAreaButtons.height());

  elements.consoleInput.width(elements.console.width() * 0.6);
  elements.consoleInput.css('bottom', elements.console.height() + 25);
}

/** Add a log message*/
function AddLogMessage(message, color)
{
  elements.log.append("<div style='color:"+ color +"'>"+ message +"</div>");
  elements.log.animate({ scrollTop: $(document).height() }, 100);
}

/** Add a console message */
function AddConsoleMessage(msg)
{
  elements.console.prepend(msg + "<br/>");
}
