var settings =
{
  "debug": false, // if true server messages will be written on the log window
  "ip": '127.0.0.1', // server ip
  "port": '9002', // server listen port
  "reconnectdelay": 1500, // time between each attempt connect to server

  "tabsize": 4, // editor tab size. soft-tabs.
  "theme": "kr_theme", // editor theme. look at js/ace/ folder see the available themes. chrome and xcode are good light editors. my interpretation of the famous zenburn is the default, i hope you like it
  //"theme": "solarized_light",
  //"theme": "xcode",
  //"theme": "clouds",
  "fontsize": '14px', // font size inside editor. i like big fonts!
  "printmargin": false, // show print margin. the dotted line middle of the editor

  "keybindings": // keyboard shortcuts
  {
    // some key binding might confict with browser default keys.
    // these happen particularly if you hold down the keys or press frequently over and over
    "stepover": "F10",
    "stepin": "F11",
    "continue": "F8",
    "stepout": "SHIFT+F11",
    "save": "CTRL+S"
  }
};