L.Control.Slider = L.Control.extend({
    includes: L.Mixin.Events,

    options: {
        position: 'bottomleft',
        map: null,
        layer: null,
        minValue: 0,
        maxValue: 100,
        value: 0,
        step: 1,
        range: false,
        sameDate: false,
        follow: 0,
        showAllOnStart: false,
        rezoom: null,
        timeAttribute: 'time',
        markers: [],
        showPopups: true,
    },

    initialize: function (options) {
        L.Util.setOptions(this, options);
        this._map = null;
        this._container = null;
        this.sliderBoxContainer = null;
        this.timestampContainer = null;
    },

    onAdd: function (map) {
        this.options.map = map;
        this._map = map; // <-- ensure _map is set (used later for events)

        // Create a control container for the slider
        // previously used this._container (undefined) which prevented proper creation
        this.container = L.DomUtil.create('div', 'leaflet-control-slider');

        this.sliderBoxContainer = L.DomUtil.create('div', 'slider', this.container);
        var sliderContainer = L.DomUtil.create('div', '', this.sliderBoxContainer);
        sliderContainer.id = "leaflet-slider";
        sliderContainer.style.width = "200px";

        L.DomUtil.create('div', 'ui-slider-handle', sliderContainer);
        this.timestampContainer = L.DomUtil.create('div', 'slider', this.container);
        this.timestampContainer.id = "slider-timestamp";
        this.timestampContainer.style.cssText = "width:200px; margin-top:3px; background-color:#FFFFFF; text-align:center; border-radius:5px;display:none;";

        // Prevent map panning/zooming while using the slider
        L.DomEvent.disableClickPropagation(this.sliderBoxContainer);
        if (this._map && this.clearTimestamp) {
            this._map.on('mouseup', this.clearTimestamp, this);
        }

        var options = this.options;
        this.options.markers = [];

        // If a Leaflet layer/featureGroup was passed, extract its layers into the markers array
        if (this.options.layer && typeof this.options.layer.eachLayer === 'function') {
            var idx = 0;
            var templayers = [];
            this.options.layer.eachLayer(function (l) { templayers.push(l); });
            templayers.forEach(function (layer) {
                options.markers[idx++] = layer;
            });
            options.minValue = 0;
            options.maxValue = Math.max(0, idx - 1);
            // default value to max if not provided
            if (typeof options.value === 'undefined' || options.value === null) options.value = options.maxValue;
            this.options = options;
        }

        // Leaflet expects the onAdd method to return the container element
        return this.container;
    },

    onRemove: function (map) {
        // Remove the slider and timestamp elements and unbind events
        if (this.sliderBoxContainer && this.sliderBoxContainer.parentNode) {
            this.sliderBoxContainer.parentNode.removeChild(this.sliderBoxContainer);
            this.sliderBoxContainer = null;
        }
        if (this.timestampContainer && this.timestampContainer.parentNode) {
            this.timestampContainer.parentNode.removeChild(this.timestampContainer);
            this.timestampContainer = null;
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
            this.container = null;
        }
        if (this._map && this.clearTimestamp) {
            this._map.off('mouseup', this.clearTimestamp, this);
        }
        this._map = null;
    },

    startSlider: function () {
        var _options = this.options;
        var _extractTimestamp = this.extractTimestamp;

        // Determine initial index_start based on options (value or values)
        var index_start;
        if (_options.range) {
            if (Array.isArray(_options.values) && typeof _options.values[1] !== 'undefined') {
                index_start = _options.values[1];
            } else if (typeof _options.maxValue !== 'undefined') {
                index_start = _options.maxValue;
            } else {
                index_start = _options.minValue;
            }
        } else {
            index_start = (typeof _options.value !== 'undefined' && _options.value !== null) ? _options.value : _options.minValue;
        }

        // Guard: ensure jQuery UI slider is available
        if (!this.sliderBoxContainer || typeof $(this.sliderBoxContainer).slider !== 'function') {
            console.error('SliderControl: jQuery UI slider not available. Ensure jquery-ui.js is loaded before SliderControl.js.');
            return;
        }

        if (_options.showAllOnStart) {
            if (_options.range) _options.values = [_options.minValue, _options.maxValue];
            else _options.value = _options.maxValue;
            index_start = _options.maxValue;
        }

        var timestampContainer = this.timestampContainer;
        var that = this;
        $(this.sliderBoxContainer).slider({
            range: _options.range,
            value: _options.value,
            values: _options.values,
            min: _options.minValue,
            max: _options.maxValue,
            sameDate: _options.sameDate,
            step: _options.step || 1,
            slide: function (e, ui) {
                var map = _options.map;
                var fg = L.featureGroup();
                // handle both single-value and range slider (use ui.value for single, ui.values for range)
                var currentIndex = _options.range ? (Array.isArray(ui.values) ? ui.values[1] : ui.value) : ui.value;

                if (!!_options.markers[currentIndex]) {
                    // If there is no time property, this line has to be removed (or exchanged with a different property)
                    if (_options.markers[currentIndex].feature !== undefined) {
                        if (_options.markers[currentIndex].feature.properties[_options.timeAttribute]) {
                            if (_options.markers[currentIndex]) {
                                if (timestampContainer) {
                                    timestampContainer.style.display = "block";
                                    $(timestampContainer).html(_extractTimestamp(_options.markers[currentIndex].feature.properties[_options.timeAttribute], _options));
                                }
                            }
                        } else {
                            console.error("Time property " + _options.timeAttribute + " not found in data");
                        }
                    } else {
                        // set by leaflet Vector Layers
                        if (_options.markers[currentIndex].options && _options.markers[currentIndex].options[_options.timeAttribute]) {
                            if (_options.markers[currentIndex]) {
                                if (timestampContainer) {
                                    timestampContainer.style.display = "block";
                                    $(timestampContainer).html(_extractTimestamp(_options.markers[currentIndex].options[_options.timeAttribute], _options));
                                }
                            }
                        } else {
                            console.error("Time property " + _options.timeAttribute + " not found in data");
                        }
                    }

                    var markers = [];
                    var i;
                    // clear markers
                    for (i = _options.minValue; i <= _options.maxValue; i++) {
                        if (_options.markers[i]) map.removeLayer(_options.markers[i]);
                    }
                    if (_options.range) {
                        // jquery ui using range
                        var startIdx = ui.values[0];
                        var endIdx = ui.values[1];
                        for (i = startIdx; i <= endIdx; i++) {
                            if (_options.markers[i]) {
                                markers.push(_options.markers[i]);
                                map.addLayer(_options.markers[i]);
                                fg.addLayer(_options.markers[i]);
                            }
                        }
                    } else if (_options.follow > 0) {
                        for (i = currentIndex - _options.follow + 1; i <= currentIndex; i++) {
                            if (_options.markers[i]) {
                                markers.push(_options.markers[i]);
                                map.addLayer(_options.markers[i]);
                                fg.addLayer(_options.markers[i]);
                            }
                        }
                    } else if (_options.sameDate) {
                        var currentTime;
                        if (_options.markers[currentIndex].feature !== undefined) {
                            currentTime = _options.markers[currentIndex].feature.properties[_options.timeAttribute];
                        } else {
                            currentTime = (_options.markers[currentIndex].options && _options.markers[currentIndex].options[_options.timeAttribute]);
                        }
                        for (i = _options.minValue; i <= _options.maxValue; i++) {
                            if (_options.markers[i] && _options.markers[i].options && _options.markers[i].options[_options.timeAttribute] == currentTime) {
                                markers.push(_options.markers[i]);
                                map.addLayer(_options.markers[i]);
                            }
                        }
                    } else {
                        for (i = _options.minValue; i <= currentIndex; i++) {
                            if (_options.markers[i]) {
                                markers.push(_options.markers[i]);
                                map.addLayer(_options.markers[i]);
                                fg.addLayer(_options.markers[i]);
                            }
                        }
                    }

                    if (_options.showPopups) {
                        that._openPopups(markers);
                    }
                    that.fire('rangechanged', {
                        markers: markers,
                    });
                }
                if (_options.rezoom) {
                    var bounds = fg.getBounds();
                    if (bounds.isValid && bounds.isValid()) {
                        map.fitBounds(bounds, {
                            maxZoom: _options.rezoom
                        });
                    }
                }
            }
        });

        // Add initial markers (show markers up to index_start)
        var map = _options.map;
        var initialMarkers = [];
        for (var j = _options.minValue; j <= index_start; j++) {
            if (_options.markers[j]) {
                map.addLayer(_options.markers[j]);
                initialMarkers.push(_options.markers[j]);
            }
        }
        if (_options.showPopups) {
            that._openPopups(initialMarkers);
        }
        that.fire('rangechanged', { markers: initialMarkers });
    },

    extractTimestamp: function (timestamp, options) {
        // Default implementation: simply return the timestamp
        // This can be overridden by the user for custom formatting
        if (!timestamp) return '';
        return timestamp;
    },

    clearTimestamp: function () {
        if (this.timestampContainer) {
            this.timestampContainer.innerHTML = '';
            this.timestampContainer.style.display = "none";
        }
    },

    _openPopups: function (markers) {
        if (!this.options.showPopups) return;
        var that = this;
        // Close any open popups on the map
        if (this._map && this._map.closePopup) this._map.closePopup();

        // Open popups for the given markers.
        // If you prefer only the most recently-selected marker's popup, open only the last item.
        markers.forEach(function (marker) {
            if (marker.getPopup && marker.getPopup()) {
                marker.openPopup();
                that._openPopup = marker.getPopup();
            }
        });
    },

    closePopup: function () {
        // Close any open popup via the map API
        if (this._map && this._map.closePopup) this._map.closePopup();
        this._openPopup = null;
    },
});

// factory aliases
L.control.slider = function (options) {
    return new L.Control.Slider(options);
};

// alias for code that expects sliderControl factory name
L.control.sliderControl = function (options) {
    return new L.Control.Slider(options);
};

// create markers with a time property and a popup
var events = [
  {lat: 42.3314, lng: -83.0458, time: '2020-01-01T10:00:00Z', popup: 'Event A'},
  {lat: 42.3320, lng: -83.0465, time: '2020-01-02T14:30:00Z', popup: 'Event B'},
  {lat: 42.3340, lng: -83.0470, time: '2020-01-03T09:15:00Z', popup: 'Event C'}
];

var fg = L.featureGroup();
events.forEach(function(e){
  // attach time as an option so SliderControl can read marker.options.time
  var m = L.marker([e.lat, e.lng], {time: e.time}).bindPopup(e.popup);
  fg.addLayer(m);
});
map.addLayer(fg);

// create slider control, telling it to read 'time' (default) from markers
var slider = L.control.slider({
  position: 'bottomleft',
  layer: fg,            // pass the featureGroup
  timeAttribute: 'time',
  showPopups: true,
  showAllOnStart: false,
  follow: 0
}).addTo(map);

// optional: format timestamps shown in the timestamp box
slider.extractTimestamp = function(timestamp, options){
  if (!timestamp) return '';
  var d = new Date(timestamp);
  return d.toLocaleString(); // or custom format
};

// must call after control is in DOM and jQuery UI is loaded
slider.startSlider();