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
    var CommandManager  = brackets.getModule("command/CommandManager"),
	Menus               = brackets.getModule("command/Menus"),
	ScrollTrackMarkers  = brackets.getModule("search/ScrollTrackMarkers"),
    EditorManager  		= brackets.getModule("editor/EditorManager"),
    KeyEvent 			= brackets.getModule("utils/KeyEvent");
	
	// Extension variables
	var _enabled = true,
		scrollTrackStorage = [],
		scrollTrackPositions = [],
		gutterName = "CodeMirror-heatmapGutter";
	
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
    function makeHeatmap() {
					
		var editor = EditorManager.getCurrentFullEditor();
		//var editor = EditorManager.getActiveEditor();
		// Why does this line break?
			
		// Get line number where edit was made
		var pos = editor.getCursorPos();
		
		// Loop through array and check for duplicate entries
		duplicateCheck(pos.line);
		
		// Push line number to first position in array.
		scrollTrackPositions.unshift(pos);
		
		// Clip off old entries in array
		// TODO: make the length a preference
		if (scrollTrackPositions.length > 10) {
			scrollTrackPositions.length = 10;
		}
		
		// TODO: more research into clearing/setting visible and what's necessary.
		// TODO: style appearance of tick markers depending on their position in the array via classes (higher numbers = brighter, lower = darker)
		
		// Add scroll track markers
		ScrollTrackMarkers.clear();
		ScrollTrackMarkers.setVisible(editor, true);
		ScrollTrackMarkers.addTickmarks(editor, scrollTrackPositions);
		
		// Add color blocks to gutter
		showGutterMarks(editor);
		
		// Recolor the scroll track markers once they've been placed.
		recolorScrollTracks(editor, scrollTrackPositions);
		
    }

	function recolorScrollTracks(editor, scrollTrackPositions) {

		var collection = $(editor.getRootElement()).find(".tickmark");
		
		for (var i = 0; i < collection.length - 1; i++) {
			if (i == 0) {
				//console.log("green");
				$(collection[i]).css({"background":"#50de18", "border-top":"1px solid #50de18", "border-bottom":"1px solid #50de18"});				
			} else if (i == 1 || i == 2 || i == 3) {
				//console.log("yellow");
				$(collection[i]).css({"background":"#eddd23", "border-top":"1px solid #eddd23", "border-bottom":"1px solid #eddd23"});
			} else if (i == 4 || i == 5 || i == 6) {
				//console.log("orange");
				$(collection[i]).css({"background":"#ca8820", "border-top":"1px solid #ca8820", "border-bottom":"1px solid #ca8820"});
			} else {
				//console.log("red");
				$(collection[i]).css({"background":"#ca3820", "border-top":"1px solid #ca3820", "border-bottom":"1px solid #ca3820"});
			}
			
		}		
	}
	
	
	function makeMarker(i) {
		var marker = document.createElement("div");
		
		if (i == 0) {
			//console.log("green");
			marker.style.color = "#50de18";
		} else if (i == 1 || i == 2 || i == 3) {
			//console.log("yellow");
			marker.style.color = "#eddd23";
		} else if (i == 4 || i == 5 || i == 6) {
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

			for (var i = 0; i < scrollTrackPositions.length - 1; i++) {
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
	
	// Don't run main function on literally every key press
	// Gets laggy otherwise
	var slowDown = false;
	
	function _handler(event, editor, keyevent) {
		if (keyevent.type == "keydown" && slowDown == false) {
			makeHeatmap();
			slowDown = true;
			// Only allow to re-run after a second delay
			setTimeout(function(){slowDown = false;},1000);
		}
	}

	function _handlerOff(editor) {		
        editor.off('keydown', _handler);		
		ScrollTrackMarkers.setVisible(editor, false);
		scrollTrackPositions = [];
		var cm = editor._codeMirror;
			cm.clearGutter(gutterName); // clear color markers
    }
    
    function _disableHandler(editor) {
        editor.off('keydown', _handler);
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
        }
    }
	
	
    // Reset the listeners when the active editor change.
    EditorManager.on("activeEditorChange",
        function (event, current, previous) {
						
			function saveIntoStorage() {
				// Save track positions as object and push into storage array.	
				var saveMe = {
					name: previous.document.file._name,
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
							if (scrollTrackStorage[i].name == previous.document.file._name) {
								
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
					initGutter(current);				
					
					// Loop through storage array and look for matching name.					
					for (var i = 0; i < scrollTrackStorage.length; i++) {			
						
						// Found a match, load in the saved scroll track positions.
						if (scrollTrackStorage[i].name == current.document.file._name) {
							scrollTrackPositions = scrollTrackStorage[i].positions;							
							ScrollTrackMarkers.setVisible(current, true);
							ScrollTrackMarkers.addTickmarks(current, scrollTrackPositions);
							showGutterMarks(current);
							recolorScrollTracks(current, scrollTrackPositions);
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

