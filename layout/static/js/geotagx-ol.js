/*
 * The GeoTag-X OpenLayers wrapper.
 */
;(function(geotagx, $, undefined){
	"use strict";
	/**
	 * Custom controls.
	 */
	var control_ = {
		// listenerKey:{
		// 	moveend:null
		// },
		ViewSelector:function(context, options, name){
			function onClick(){
				var map = context.getMap();
				var mapView = map.getView();
				var mapResolution = mapView.getResolution();

				// When the view's selector is clicked, all other layers are hidden.
				getLayer(map, "view").getLayers().forEach(function(layer){
					layer.setVisible(layer.get("name") === name);
				});

				// The 'Borders' layer is only visible for Satellite and Aerial imagery.
				var bordersLayer = getLayer(map, "legend", "Borders");
				var bordersLayerVisible = ["Satellite", "Aerial"].indexOf(name) !== -1;
				if (bordersLayerVisible){
					bordersLayer.setVisible(true);

					//FIXME
					// The layer is only visible to a certain resolution
					// otherwise it is more obstructive than helpful.
					// bordersLayer.setVisible(mapResolution > 100);

					// A handler to hide the 'Borders' layer when we reach a
					// certain resolution.
					// control_.listenerKey.moveend = map.on("moveend", function(){
					// 	var resolution = mapView.getResolution();
					// 	bordersLayer.setVisible(resolution > 100);
					// });
				}
				else {
					bordersLayer.setVisible(false);
					// map.unByKey(control_.listenerKey.moveend);
				}
			}

			options = options || {};

			var button = document.createElement("button");
			button.innerHTML = name.charAt(0).toUpperCase();
			button.addEventListener("click", onClick, false);
			button.addEventListener("touchstart", onClick, false);

			var element = document.createElement("div");
			element.className = "ol-control ol-unselectable geotagx-ol-control-view " + name.toLowerCase();
			element.appendChild(button);

			ol.control.Control.call(context, {
				element:element,
				target:options.target
			});
		},
		SatelliteViewSelector:function(options){
			control_.ViewSelector(this, options, "Satellite");
		},
		AerialViewSelector:function(options){
			control_.ViewSelector(this, options, "Aerial");
		},
		MapViewSelector:function(options){
			control_.ViewSelector(this, options, "Map");
		}
	};
	ol.inherits(control_.SatelliteViewSelector, ol.control.Control);
	ol.inherits(control_.AerialViewSelector, ol.control.Control);
	ol.inherits(control_.MapViewSelector, ol.control.Control);
	/**
	 * Creates a Map object which includes a private internal map (an actual OpenLayers map)
	 * object and an accessor to the aforementioned object.
	 */
	var Map = function(targetId){
		this.openLayersMap_ = createOpenLayersMap(targetId);
	};
	/**
	 * Removes any plotted polygons or selected countries from the map.
	 * If moveToCenter is set to true, the map is centered at the origin.
	 */
	Map.prototype.reset = function(panToCenter){
		reset(this.openLayersMap_, panToCenter);
	};
	/**
	 * Centers the map at the specified location.
	 * If the input element is specified, then its value will be updated with the location's full name.
	 */
	Map.prototype.setLocation = function(location, input){
		if (location && typeof(location) === "string"){
			var map = this.openLayersMap_;
			if (map){
				// Query OpenStreetMap for the location's coordinates.
				$.getJSON("http://nominatim.openstreetmap.org/search/" + location + "?format=json&limit=1", function(results){
					if (results.length > 0){
						var result = results[0];
						var latitude = parseFloat(result.lat);
						var longitude = parseFloat(result.lon);
						var center = ol.proj.transform([longitude, latitude], "EPSG:4326", "EPSG:3857");
						var view = map.getView();

						var start = Number(new Date());
						var duration = 2000;
						var pan = ol.animation.pan({
							duration:duration,
							source:view.getCenter(),
							start:start
						});
						var bounce = ol.animation.bounce({
							duration:duration,
							resolution:4 * view.getResolution(),
							start:start
						});
						map.beforeRender(pan, bounce);
						view.setCenter(center);
						view.setZoom(7);

						// If an input field was specified, replace its value with the location's full name.
						if (input)
							input.value = result.display_name;
					}
					else
						console.log("Location not found."); // e.g. xyxyxyxyxyxyx
				});
			}
		}
	};
	/**
	 * Returns the coordinates of the plotted polygon.
	 */
	Map.prototype.getSelection = function(){
		var selection = null;
		if (this.openLayersMap_){
			// If a polygon (feature) has been drawn, return its vertices in the form of an array of <X, Y> pairs.
			var features = getLayer(this.openLayersMap_, "interaction", "Plot").getSource().getFeatures();
			if (features.length > 0)
				selection = [].concat(features[0].getGeometry().getCoordinates()[0]);
		}
		return selection;
	};
	/**
	 * Returns an object that contains all selected country names and regions (polygons).
	 */
	Map.prototype.getSelectedCountries = function(){
		var features = null;
		if (this.openLayersMap_){
			var interactions = this.openLayersMap_.getInteractions();

			// The select interaction was the last to be inserted and is therefore the last item in the collection.
			var selectInteraction = interactions.item(interactions.getLength() - 1);
			features = selectInteraction.getFeatures();
		}
		return new SelectedCountries(features);
	};
	/**
	 *
	 */
	var SelectedCountries = function(features){
		this.selection_ = {};
		if (features){
			features.forEach(function(feature, i){
				var name = feature.get("name");
				var polygon = feature.getGeometry().getCoordinates()[0];
				this.selection_[name] = polygon;
			}, this);
		}
	};
	/**
	 * Returns the set of names of the selected countries.
	 */
	SelectedCountries.prototype.getNames = function(){
		return Object.keys(this.selection_);
	};
	/**
	 * Returns the set of polygons the define the region of the selected countries.
	 */
	SelectedCountries.prototype.getPolygons = function(){
		var polygons = [];
		for (var name in this.selection_)
			polygons.push(this.selection_[name]);

		return polygons;
	};
	/**
	 * Creates an OpenLayers map instance in the DOM element with the specified ID.
	 */
	function createOpenLayersMap(targetId){
		// Create the map iff the DOM element exists.
		if (!document.getElementById(targetId))
			return null;

		var plotInteractionVector = new ol.source.Vector({wrapX:false});
		var map = new ol.Map({
			target:targetId,
			loadTilesWhileAnimating:true,
			view:new ol.View({
				center:[0, 0],
				zoom:2,
				minZoom:1.5,
				maxZoom:19
			}),
			controls:ol.control.defaults().extend([
				new ol.control.ZoomSlider(),
				new ol.control.FullScreen(),
				new control_.SatelliteViewSelector(),
				new control_.AerialViewSelector(),
				new control_.MapViewSelector()
			]),
			layers:[
				new ol.layer.Group({
					name:"view",
					layers:[
						new ol.layer.Tile({
							name:"Satellite",
							visible:false,
							source:new ol.source.MapQuest({layer:"sat"})
						}),
						new ol.layer.Tile({
							name:"Aerial",
							visible:false,
							source:new ol.source.BingMaps({
								key:"Ak-dzM4wZjSqTlzveKz5u0d4IQ4bRzVI309GxmkgSVr1ewS6iPSrOvOKhA-CJlm3",
								imagerySet:"Aerial"
							})
						}),
						new ol.layer.Tile({
							name:"Map",
							source:new ol.source.MapQuest({layer:"osm"})
						}),
					]
				}),
				new ol.layer.Group({
					name:"legend",
					layers:[
						new ol.layer.Tile({
							name:"Borders",
							visible:false, // Only visible for Satellite and Aerial views.
							source:new ol.source.TileJSON({
								url:"http://api.tiles.mapbox.com/v3/mapbox.world-borders-light.jsonp",
								crossOrigin:"anonymous"
							})
						})
					]
				}),
				new ol.layer.Group({
					name:"interaction",
					layers:[
						// new ol.layer.Vector({
						// 	name: 'Sea color',
						// 	source:new ol.source.Vector({
						// 		url:"http://openlayers.org/en/v3.8.2/examples/data/geojson/countries.geojson",
						// 		//url:"data/countries.geojson",
						// 		format:new ol.format.GeoJSON()
						// 	}),
						// 	style:new ol.style.Style({
						// 		stroke:new ol.style.Stroke({
						// 			color:"#FFCC33"
						// 		})
						// 	})
						// }),
						new ol.layer.Vector({
							name:"Plot",
							source:plotInteractionVector,
							style:new ol.style.Style({
								fill:new ol.style.Fill({
									color:"rgba(255, 255, 255, 0.2)"
								}),
								stroke:new ol.style.Stroke({
									color:"#FC3",
									width:2
								}),
								image:new ol.style.Circle({
									radius:7,
									fill:new ol.style.Fill({
										color:"#FC3"
									})
								})
							})
						})
					]
				})
			],
		});
		// An interaction that allows us to plot a polygon on the map.
		var plotInteraction = new ol.interaction.Draw({
			source:plotInteractionVector,
			type:"Polygon"
		});
		plotInteraction.on("drawstart", function(){
			reset(this, false);
		}, map);
		map.addInteraction(plotInteraction);

		// An interaction that allows us to select a predefined region on the map.
		// new ol.interaction.Select() // Important: Update Map.getSelectedCountries if you change this field.

		return map;
	}
	/**
	 * Returns the map layer with the specified name in the group with the
	 * specified name.
	 */
	function getLayer(map, groupName, layerName){
		// TODO Optimize me. This function's time complexity hurts my eyes.
		var output = null;
		if (map && groupName && groupName.length > 0){
			var groups = map.getLayers();
			for (var i = 0; i < groups.getLength(); ++i){
				var group = groups.item(i);
				if (group.get("name") === groupName){
					output = group;
					if (layerName && layerName.length > 0){
						var layers = group.getLayers();
						for (var j = 0; j < layers.getLength(); ++j){
							var layer = layers.item(j);
							if (layer.get("name") === layerName){
								output = layer;
								break;
							}
						}
					}
					break;
				}
			}
		}
		return output;
	}
	/**
	 * Removes any plotted polygons from the map, and if panToCenter is set to
	 * true, then the map is centered at the origin.
	 */
	function reset(map, panToCenter){
		getLayer(map, "interaction", "Plot").getSource().clear();
		if (panToCenter){
			var view = map.getView();
			if (view){
				view.setCenter([0, 0]);
				view.setZoom(2);
			}
		}
	}

	// Expose the wrapper API.
	geotagx.ol = {
		/**
		 * Creates an instance of the OpenLayers map.
		 */
		Map:function(targetId){
			return new Map(targetId);
		}
	};
})(window.geotagx = window.geotagx || {}, jQuery);
