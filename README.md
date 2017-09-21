Work Heatmap - A Brackets Extension
-------------------

This extension displays visual dots/markers/bookmarks next to lines you've recently edited. They appear as a dot next to the line number, and a bar in the scrollbar track. It's handy for navigating and not losing your place in long files.

![Screenshot](http://i.imgur.com/W4eud4g.png)

### User Preferences
You can set your user preferences by going to Debug > Open Preferences File. Then you'll add the preference at the end of this json file.

If you want to hide the circle heatmap markers to the left of the line number, add this to your brackets.json user preferences file:
```
"work-heatmap.gutterEnabled": false
```

If you'd like to change the number of markers that appear, add this (replace 20 with desired #):
```
"work-heatmap.maxMarkers": 20
```

If you'd like to clear the markers in a document after saving, add this line:
```
"work-heatmap.clearOnSave": true
```

You will need to refresh Brackets (press F5) after editing your preferences. Heatmap won't pick up changes automatically.


### Other Features
You can disable and enable Work Heatmap from the "View" menu. This will also reset/clear all of your markers for all open files.


I'm a relatively new coder so bug reports and suggestions are welcome!
