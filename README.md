# delectroit
Mapping Memory Challenge 2025
To add the code for each marker and code, copy and past these lines of code 5 times for your markers.
Then edit the lat and long according to your location, and change the name of the marker in the second line of code.
var marker = L.marker([42.3280226, -83.0448932]).addTo(map);
marker.bindPopup("<b><center>Venue Name</center></b>Pop Up Information here.");
To add the latitude and longitude for each marker and pop-up, download the RAW file from the data set in Github. 
This makes copying and pasting the lat and long into each line of code for the markers much easier.



The slider expects a time string on each marker under the property name 'time' by default — I used 'YYYY-01-01 00:00:00' strings derived from our "Created" years; adjust to full timestamps when we have them.
SliderControl.js is already referenced in our head; keep that file in js/SliderControl.js.
We can tweak slider options (range, showAllOnStart, follow, showPopups) when creating L.control.sliderControl({...}