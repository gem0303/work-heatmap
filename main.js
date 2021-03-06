/*
	The toggle and handler code was borrowed from brackets-quick-search,
	which was in turn borrowed from brackets-automatch-pairs. Including
	and adopting the original license.
	
	- Gwen Mullinix
*/

/*
* Copyright (c) 2013 Zaidin Amiot. All rights reserved.
*
* Permission is hereby granted, free of charge, to any person obtaining a
* copy of this software and associated documentation files (the "Software"),
* to deal in the Software without restriction, including without limitation
* the rights to use, copy, modify, merge, publish, distribute, sublicense,
* and/or sell copies of the Software, and to permit persons to whom the
* Software is furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
* FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
* DEALINGS IN THE SOFTWARE.
*
*/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets */

define(function (require, exports, module) {
    "use strict";

	// Brackets modules
    var CommandManager  	= brackets.getModule("command/CommandManager"),
		Menus               = brackets.getModule("command/Menus"),
		ScrollTrackMarkers  = brackets.getModule("search/ScrollTrackMarkers"),
		EditorManager  		= brackets.getModule("editor/EditorManager"),
		KeyEvent 			= brackets.getModule("utils/KeyEvent"),
		PreferencesManager	= brackets.getModule("preferences/PreferencesManager");
	
	// Extension variables
	var _enabled = true,
		scrollTrackStorage = [],
		scrollTrackPositions = [],
		gutterName = "CodeMirror-heatmapGutter",
		prefs = PreferencesManager.getExtensionPrefs("work-heatmap"),
		stateManager = PreferencesManager.stateManager.getPrefixedSystem("work-heatmap");
	
	// Set preferences
	prefs.definePreference("gutterEnabled", "boolean", true);
	var gutterEnabled = prefs.get("gutterEnabled");
	
	prefs.definePreference("clearOnSave", "boolean", false);	
	var clearOnSave = prefs.get("clearOnSave");
		
	prefs.definePreference("maxMarkers", "number", 10);
	var maxMarkers = prefs.get("maxMarkers");	
	// Make sure the # of yellow, orange and red markers are (roughly) even
	// Subtract 1 to account for the sole green marker
	var markerGroup = Math.floor((maxMarkers-1)/3);
		
	// Make the heatmap gutter
	function initGutter(editor) {
		var cm = editor._codeMirror;
		var gutters = cm.getOption("gutters").slice(0);
		var str = gutters.join('');
		if (str.indexOf(gutterName) === -1) {
			gutters.unshift(gutterName);
			cm.setOption("gutters", gutters);
		}
	}
	
	//  Main function
    function makeHeatmap(editor) {
				
		// Get line number where edit was made
		var pos = editor.getCursorPos();
		
		// Loop through array and check for duplicate entries
		duplicateCheck(pos.line);
		
		// Push line number to first position in array.
		scrollTrackPositions.unshift(pos);
		
		// Clip off old entries in array
		if (scrollTrackPositions.length > maxMarkers) {
			scrollTrackPositions.length = maxMarkers;
		}
				
		// TODO: more research into clearing/setting visible and what's necessary.		
		
		// Add scroll track markers
		ScrollTrackMarkers.clear();
		ScrollTrackMarkers.setVisible(editor, true);
		ScrollTrackMarkers.addTickmarks(editor, scrollTrackPositions);
		
		// Recolor the scroll track markers once they've been placed.
		recolorScrollTracks(editor);
		
		// Add color blocks to gutter, if gutter is enabled
		if (gutterEnabled) {
			showGutterMarks(editor);
		}
    }

	function recolorScrollTracks(editor) {
		var collection = $(editor.getRootElement()).find(".tickmark");
		
		for (var i = 0; i < collection.length; i++) {
			if (i == 0) {
				//console.log("green");
				$(collection[i]).css({"background":"#50de18", "border-top":"1px solid #50de18", "border-bottom":"1px solid #50de18"});
			} else if (i >= 1 && i <= markerGroup) {
				//console.log("yellow ", i);
				$(collection[i]).css({"background":"#eddd23", "border-top":"1px solid #eddd23", "border-bottom":"1px solid #eddd23"});
			} else if ( (i >= (markerGroup+1)) && (i <= (markerGroup*2)) ) {
				//console.log("orange ", i);
				$(collection[i]).css({"background":"#ca8820", "border-top":"1px solid #ca8820", "border-bottom":"1px solid #ca8820"});
			} else {
				//console.log("red ", i);
				$(collection[i]).css({"background":"#ca3820", "border-top":"1px solid #ca3820", "border-bottom":"1px solid #ca3820"});
			}
			
		}		
	}
	
	
	function makeMarker(i) {
		var marker = document.createElement("div");
		
		if (i == 0) {
			//console.log("green");
			marker.style.color = "#50de18";
		} else if (i >= 1 && i <= markerGroup) {
			//console.log("yellow");
			marker.style.color = "#eddd23";
		} else if ( (i >= (markerGroup+1)) && (i <= (markerGroup*2)) ) {
			//console.log("orange");
			marker.style.color = "#ca8820";
		} else {
			//console.log("red");
			marker.style.color = "#ca3820";
		}
		
		marker.innerHTML = "●";
		return marker;
	}

    function showGutterMarks(editor) {
			var cm = editor._codeMirror;
			cm.clearGutter(gutterName); // clear color markers

			for (var i = 0; i < scrollTrackPositions.length; i++) {
				cm.setGutterMarker(scrollTrackPositions[i].line, gutterName, makeMarker(i));
			}
	}
	
	function duplicateCheck(linenumber) {
		for (var i = 0; i < scrollTrackPositions.length - 1; i++) {
			if (scrollTrackPositions[i].line == linenumber) {
				// Remove the duplicate entry
				scrollTrackPositions.splice(i, 1);
			}
		}
	}
	
	// If user has the "clear on save" preference enabled
	if (clearOnSave) {
		
		function clearMarks(editor) {
			ScrollTrackMarkers.clear();
			var cm = editor._codeMirror;
			cm.clearGutter(gutterName);
			
			// empty out the saved marks in storage too, otherwise they reappear on document change
			for (var i = 0; i < scrollTrackStorage.length; i++) {
				if (scrollTrackStorage[i].name == editor.document.file._path) {
					// note that positions = [] didn't work here, only length = 0 did.
					scrollTrackStorage[i].positions.length = 0;
					break;
				}
			}
		}
	
		var DocumentManager = brackets.getModule('document/DocumentManager');
		
		 // Attach events
		$(DocumentManager).on("documentSaved", function() {
            var editor = EditorManager.getCurrentFullEditor();
			clearMarks(editor);
        });
	}
	
	// Don't run main function on literally every key press
	// Gets laggy otherwise
	var slowDown = false;
	
	function _handler(event, editor, keyevent) {
		if (keyevent.type == "keydown" && slowDown == false) {
			makeHeatmap(editor);
			slowDown = true;
			// Only allow to re-run after a short delay
			setTimeout(function(){slowDown = false;}, 750);
		}
	}

	function _handlerOff(editor) {		
        editor.off('keydown', _handler);		
		ScrollTrackMarkers.setVisible(editor, false);
		scrollTrackPositions = [];
		var cm = editor._codeMirror;
			cm.clearGutter(gutterName); // clear color markers
    }
        
    function _handlerOn(editor) {
        editor.on('keydown', _handler);
    }
    
    // Toggle the extension, set the _document and register the listener.
    function _toggle() {
        _enabled = !_enabled;
        
        // Set the new state for the menu item.
        CommandManager.get(WORK_HEATMAP).setChecked(_enabled);
        
        var editor = EditorManager.getActiveEditor();
        
        // Register or remove listener depending on _enabled.
        if (_enabled) {
            _handlerOn(editor);
        } else {
            _handlerOff(editor);
			
			// Also clear all stored positions
			scrollTrackStorage = [];
        }
    }
	
	
    // Reset the listeners when the active editor changes.
    EditorManager.on("activeEditorChange",
        function (event, current, previous) {
						
			function saveIntoStorage() {
				// Save track positions as object and push into storage array.	
				var saveMe = {
					name: previous.document.file._path,
					positions: scrollTrackPositions
				}				
				scrollTrackStorage.push(saveMe);
			}
			
            if (_enabled) {
                if (previous) {
					
					// We need to save the scroll track positions for the previous file.
					
					// If array is empty, just push in entry.
					if (scrollTrackStorage.length == 0) {				
						saveIntoStorage();
					} else {
						
						var hasMatch = false;
						
						// Check if we already have an entry for file in scrollTrackStorage
						for (var i = 0; i < scrollTrackStorage.length; i++) {
							
							// Loop through storage array and look for matching name.
							if (scrollTrackStorage[i].name == previous.document.file._path) {
								
								// An entry already exists for this file. Let's empty it and then update its data.
								scrollTrackStorage[i].positions = [];
								scrollTrackStorage[i].positions = scrollTrackPositions;
								hasMatch = true;
								break;
							}
						}
						
						if (hasMatch == false) {
							saveIntoStorage();
						}
					}
					
					// Remove key event handler from this editor.
                    _handlerOff(previous);
                }
				
                if (current) {
					
					if (gutterEnabled) {
						initGutter(current);
					}					
					
					// Loop through storage array and look for matching name.					
					for (var i = 0; i < scrollTrackStorage.length; i++) {
						
						// Found a match, load in the saved scroll track positions.
						if (scrollTrackStorage[i].name == current.document.file._path) {
							scrollTrackPositions = scrollTrackStorage[i].positions;
							ScrollTrackMarkers.setVisible(current, true);
							ScrollTrackMarkers.addTickmarks(current, scrollTrackPositions);
							
							// TODO, BUG: my colors get overwritten by Brackets and turn everything yellow, why?
							recolorScrollTracks(current);

							if (gutterEnabled) {
								showGutterMarks(current);
							}						
							
							break;
						}
					}
					
                    _handlerOn(current);
                }
            }
        });

		
	var WORK_HEATMAP = "heatmap.makeHeatmap";
	
    // Register command.
    CommandManager.register("Work Heatmap", WORK_HEATMAP, _toggle);

    // Add command to View menu.
    Menus.getMenu(Menus.AppMenuBar.VIEW_MENU).addMenuItem(WORK_HEATMAP);

    // Set the starting state for the menu item.
    CommandManager.get(WORK_HEATMAP).setChecked(_enabled);

});

