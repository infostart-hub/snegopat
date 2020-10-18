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


function iterate(obj, parent, parentname)
{
  var typeName = "";

  if (obj instanceof Array)
  {
    if (obj[0]._)
    {
      typeName = obj[0]._;
      obj.splice(0, 1);

      parent.data.tooltip = typeName;
    }
  }
  else if (obj instanceof Object)
  {
    if (obj._)
    {
      typeName = obj._;
      parent.data.tooltip = typeName;
    }
  }

  for (var property in obj)
  {
    if (obj.hasOwnProperty(property))
    {
      if (obj[property] instanceof Object)
      {

        var childNode = parent.addChild({
          title: property.toString(), 
          key: parentname + property.toString(),
          icon: false
        });
        iterate(obj[property], childNode, obj[property].toString());

      }
      else
      {
        if (property.toString() != "_")
        {
          var child = parent.addChild({
            title: property.toString() + " : " + obj[property].toString(), 
            key: parentname + "." + obj[property].toString(),
            icon: false
          });
        }
      }
    }
  }

}

function ConstructTree(obj, root, varname)
{
  iterate(obj, root, varname);
}

function HandleVariableValue(data)
{
  var recievedObj = $.parseJSON(data.substr(5, data.length));

  var moduleName = recievedObj.mod;

  var RootNode = ModuleTreeRoots[moduleName];

  var newNode;
  var existingNode = null;
  var children = RootNode.getChildren();
  if (children)
  {
    for (var j = 0; j < children.length; j++)
    {
      if (children[j].data.key == recievedObj.name)
      {
        existingNode = children[j];
        break;
      }
    }
  }

  // is already exists then remove children and construct it with the new info we god
  if (existingNode)
  {
    if (typeof (recievedObj.val) === "number")
    {
      existingNode.setTitle(recievedObj.name + ": " + recievedObj.val.toString());
    //existingNode.data.title = ;
    }
    else if (typeof (recievedObj.val) === "boolean")
    {
      existingNode.setTitle(recievedObj.name + ": " + recievedObj.val.toString());
    }
    else if (typeof (recievedObj.val) === "string")
    {
      existingNode.setTitle(recievedObj.name + ": " + recievedObj.val);
    }
    else if (recievedObj.val === null)
    {
      existingNode.setTitle(recievedObj.name + ": null");
    }
    else
    {
      existingNode.removeChildren();
      ConstructTree(recievedObj.val, existingNode, recievedObj.name);
    }

  }
  else // doesn't exist create!
  {
    if (typeof (recievedObj.val) === "number")
    {
      newNode = RootNode.addChild({
        title: recievedObj.name + ": " + recievedObj.val.toString(),
        key: recievedObj.name.toString(),
        icon: false
      });
    }
    else if (typeof (recievedObj.val) === "boolean")
    {
      newNode = RootNode.addChild({
        title: recievedObj.name + ": " + recievedObj.val.toString(),
        key: recievedObj.name.toString(),
        icon: false
      });
    }
    else if (typeof (recievedObj.val) === "string")
    {
      newNode = RootNode.addChild({
        title: recievedObj.name + ": " + recievedObj.val,
        key: recievedObj.name.toString(),
        icon: false
      });
    }
    else if (recievedObj.val === null)
    {
      newNode = RootNode.addChild({
        title: recievedObj.name + ": null",
        key: recievedObj.name.toString(),
        icon: false
      });
    }
    else
    {
      newNode = RootNode.addChild({
        title: recievedObj.name.toString(),
        key: recievedObj.name.toString(),
        icon: false
      });
      ConstructTree(recievedObj.val, newNode, recievedObj.name);
    }
  }

}

/** Remove all modules from watcher*/
function RemoveAllModules()
{
  for(var i in ModList)
  {
    $("#modtree_"+i).remove();
    $("#modtree_title_"+i).remove();
  }

  ModList = [];

  ModuleTreeRoots = {};
}

function ClearLocalTree()
{
  localTree.removeChildren();
}

function ClearThisTree()
{
  thisTree.removeChildren();
}

/** Create a new module watch in 'watch' area */
function AddModule(name, id)
{
  elements.watcher.append("<div id='modtree_title_" + id + "' style='text-align:center'>" + name + "<div style='text-align:left' id='modtree_" + id + "'></div></div>");

  var mod = $("#modtree_" + id);

  $(mod).dynatree({
    onKeydown : KeyPressModuleWatch
  });

  ModuleTreeRoots[name] = $(mod).dynatree("getRoot");


}

function KeyPressModuleWatch(node, evt)
{
  if(evt.keyCode === 46)
  {
    if(node.getLevel() === 1)
    {
      node.remove();
    }
  }

}

/** Add local section to the watcher */
function AddLocalWatcher()
{
  elements.watcher.append("<div style='text-align:center'>Locals<div style='text-align:left' id='modtree_local'></div></div>");

  var mod = $("#modtree_local");

  $(mod).dynatree({});

  localTree = $(mod).dynatree("getRoot");
}

function AddThisWatcher()
{
  elements.watcher.append("<div style='text-align:center'>@this<div style='text-align:left' id='modtree_this'></div></div>");

  var mod = $("#modtree_this");

  $(mod).dynatree({});

  thisTree = $(mod).dynatree("getRoot");
}

/** Fill local area in the watcher */
function FillLocal(data)
{
  var recievedObj = $.parseJSON(data.substr(4, data.length));

  localTree.removeChildren();

  ConstructTree(recievedObj, localTree, "Local");

  var children = localTree.childList;

  for(var i in children)
  {
    if(children.hasOwnProperty(i))
    {
      children[i].expand(true);
    }

  }
}

/** Fill this area in the watcher */
function FillThis(obj)
{
  var recievedObj;
  try
  {
    recievedObj = $.parseJSON(obj[obj.length - 1]);
  }
  catch(e)
  {
    return;
  }

  var stackDepth = obj[1];

  var RootNode = thisTree;

  var newNode;

  RootNode.removeChildren();
 
  newNode = RootNode.addChild({
    title: "Stack Level: " + stackDepth.toString(), 
    key: "_" + stackDepth.toString(),
    icon: false
  });

  ConstructTree(recievedObj, newNode, obj[2]);

  newNode.expand(true);

}

function RefreshWatched()
{
  for(var i in ModuleTreeRoots)
  {
    if(ModuleTreeRoots.hasOwnProperty(i))
    {
     var children = ModuleTreeRoots[i].childList;

      for(var j in children)
      {
        if(children.hasOwnProperty(j))
        {
          RequestGlobalVariable(i, children[j].data.key);
        }
      }
    }
  }
}


function WatcherResized()
{
  var width = elements.watcher.width();
  var leftSpace = window.innerWidth - width;


  elements.lowerArea.width(leftSpace - 5);

  elements.editorArea.width(leftSpace - 5);

  for(var e in editors)
  {
    editors[e].Resize(elements.editorArea.width(), elements.editorArea.height());
  }

  elements.newVariable.width(width - 26);
}


/** This renews Module dropdown box */
function RefreshModules()
{

  elements.selectModule.html("");

  elements.selectModule.append("<option value='Any'>Any Module</option>");

  for (var i = 0; i < ModList.length; ++i)
  {
    elements.selectModule.append("<option value='" + ModList[i] + "'>" + ModList[i] + "</option>");
    AddModule(ModList[i], i);
  }

}


function NewVariableButton(evt)
{
  if (evt.which === 13)
  {
    if (elements.selectModule.val() === "Any")
    {
      RequestGlobalVariable("*", $(evt.currentTarget).val());
    }
    else
    {
      RequestGlobalVariable(elements.selectModule.val(), $(evt.currentTarget).val());
    }
    $(evt.currentTarget).val("");
  }
}