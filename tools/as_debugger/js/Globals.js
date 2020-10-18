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


/**
 Holds ace editors, every sectionID may have an editor.
 Not every sectionID has an editor, file contents might not loaded yet.
 */
var editors = {};
/** Id of active editor */
var activeEditor = null;

/** Array of context ids */
var contexts = [];

var output;

var ModList = [];

var ModuleTreeRoots = {};

/** Local variables are in watcher */
var localTree;
/** @this variable are in watcher */
var thisTree;

/** This is the tree that apeears when mouse hovers over a variable*/
var hoverTree;

/** Holds data of all files. this is a big object */
var files = {};

/** Map. Holds script section names with ids */
var scriptSections = {};

/** Holds frequently used dom elements for fast access */
var elements = {};

// trim method to string
String.prototype.trim = function()
{
  return this.replace(/^\s+|\s+$/g,"");
};
