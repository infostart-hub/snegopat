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


function PopulateBreakpointsWindow()
{

  var s = "";

  var breakpointsWindow = $("#breakpointsWindow");
  breakpointsWindow.html('');
  s += "<div style='cursor: move; border-bottom: 1px black solid;'>Breakpoints:</div>";
  for (var i in scriptSections)
  {
    if(!scriptSections.hasOwnProperty(i))
      continue;

    if($.isEmptyObject(scriptSections[i].breakpoints))
      continue;

    s += "<div>" + scriptSections[i].name +"</div>";
    for (var j in scriptSections[i].breakpoints)
    {
      s += "<div><a class='breakpointRemove' title='Remove Breakpoint'"+
        "onclick='SendRemoveBreakpoint("+ i + "," + j + ")'><a/>"+
      "<span class='breakpointLineNumber' onclick='FocusDocument(scriptSections["+ i +"],"+ j +" )'> Line: "+ j +"</span></div>";
    }

  }

  breakpointsWindow.append(s);
}
