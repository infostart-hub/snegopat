
/** Update section list */
function UpdateSectionList()
{
  elements.sectionList.html("");

  var s = "";
  for(var i in scriptSections)
  {
    if(scriptSections.hasOwnProperty(i))
    {
      s += "<li class='section' data-id='"+ i +"' onclick='OpenSection(event)'>" +scriptSections[i].name+ "</li>";
    }
  }

  elements.sectionList.html(s);
}

/** Called when mouse clicks a section in sectionList*/
function OpenSection(evt)
{
  var id = $(evt.currentTarget).data('id');
  FocusDocument(scriptSections[id]);
}

/** Filter sectionList */
function SectionFilter(evt)
{
  elements.sectionList.html("");

  var s = "";
  for(var i in scriptSections)
  {
    if(scriptSections.hasOwnProperty(i))
    {
      var regex = new RegExp($(evt.currentTarget).val(), "i");
      var result = scriptSections[i].name.search(regex);
      if(result !== -1)
        s += "<li class='section' data-id='"+ i +"' onclick='OpenSection(event)'>" +scriptSections[i].name+ "</li>";

    }
  }

  elements.sectionList.html(s);
}

/** Fund and return a section, helper function */
function GetSection(name)
{
  for (var i in scriptSections)
  {
    if (scriptSections[i].name == name)
      return scriptSections[i];
  }

  return null;
}

/** Called when save button pressed */
function SaveSection()
{
  if(editors.hasOwnProperty(activeEditor))
  {
    editors[activeEditor].Save();
  }

}

/** Script section object */
function Section()
{
  this.id = 0;

  this.name = ""; // name of this section

  this.mod = ""; // name of module this section belongs

  this.data = "";

  this.breakpoints = {}; // breakpoint lines

  this.dataRequested = false;

  this.GoTo = function(lineNumber)
  {
    FocusDocument(this, lineNumber);
  };

  this.RequestData = function()
  {
    if(!this.dataRequested)
    {
      RequestSection(this.id);
      this.dataRequested = true;
    }
  };

  this.Reload = function()
  {
    if(editors.hasOwnProperty(this.id))
    {
      var pos = editors[this.id].editor.getCursorPosition();
      editors[this.id].editor.setValue(this.data);
      editors[this.id].editor.selection.clearSelection();
      editors[this.id].editor.moveCursorToPosition(pos);
      editors[this.id].editor.scrollToLine(pos.row, true, false);
    }
  }

  this.HasBreakpoint = function(line)
  {
    return this.breakpoints.hasOwnProperty(line);
  };

  this.AddBreakpoint = function (line)
  {
    this.breakpoints[line] = true;

    PopulateBreakpointsWindow();

    this.UpdateBreakpoints();
  };

  this.UpdateBreakpoints = function()
  {
    if(editors.hasOwnProperty(this.id))
      editors[this.id].RedrawBreakpoints();
  };

  this.RemoveBreakpoint = function (line)
  {
    delete this.breakpoints[line];

    PopulateBreakpointsWindow();

    this.UpdateBreakpoints();

  };

}