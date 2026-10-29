
var margin = { top: 20, right: 140, bottom: 20, left: 20 };
var width = 1000 - margin.left - margin.right;
var height = 600 - margin.top - margin.bottom;

var svg = d3.select("#choropleth")
    .attr("viewBox", "0 0 1000 600")
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var projection = d3.geoAlbersUsa()
    .translate([width / 2, height / 2])
    .scale(1200);

var path = d3.geoPath().projection(projection);

var colorScale = d3.scaleQuantile()
    .range(["#fee5d9", "#fcae91", "#fb6a4a", "#cb181d"]);

var mapGroup = svg.append("g")
    .attr("id", "states");

var legendGroup = svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(" + (width + 10) + ", 30)");

var tip = d3.tip()
    .attr("class", "d3-tip")
    .offset([-10, 0])
    .html(function(d) {
        return d.properties.name;
    });

svg.call(tip);

var metric = "prescriptions";

Promise.all([
    d3.json("data/states-10m.json"),
    d3.csv("data/fake_prescriptions.csv")
]).then(function(results) {
    var us = results[0];
    var csvData = results[1];

    var states = topojson.feature(
        us,
        us.objects.states
    ).features;

    var demoData = {};

    csvData.forEach(function(row) {
        demoData[row.state_id] = {
            prescriptions: +row.prescriptions,
            anomalies: +row.anomalies
        };
    });

    colorScale.domain(
        csvData.map(function(row) {
            return +row[metric];
        })
    );

    function updateMap() {
        var paths = mapGroup.selectAll("path")
            .data(states, function(d) {
                return d.id;
            });

        paths.enter()
            .append("path")
            .attr("class", "state")
            .merge(paths)
            .attr("d", path)
            .attr("fill", function(d) {
                var id = String(d.id).padStart(2, "0");
                var record = demoData[id];
                var value = record ? record[metric] : null;

                return value == null ? "#ccc" : colorScale(value);
            })
            .on("mouseover", function(d) {
                var id = String(d.id).padStart(2, "0");
                var record = demoData[id];
                var value = record ? record[metric] : null;

                tip.html(function() {
                    return "<strong>" + d.properties.name + "</strong><br>" +
                        "Metric: " + metric + "<br>" +
                        "Value: " + (value == null ? "No data" : value) +
                        "<br><em>Illustrative data only</em>";
                });

                tip.show(d, this);
            })
            .on("mouseout", function(d) {
                tip.hide(d, this);
            });

        paths.exit().remove();
    }

    function updateLegend() {
        legendGroup.selectAll("*").remove();

        var legend = d3.legendColor()
            .scale(colorScale)
            .shapeWidth(15)
            .shapeHeight(15)
            .shapePadding(4);

        legendGroup.call(legend);
    }

    function refreshMap() {
        colorScale.domain(
            csvData.map(function(row) {
                return +row[metric];
            })
        );

        updateMap();
        updateLegend();
    }

    refreshMap();

    d3.select("#metricDropdown").on("change", function() {
        metric = this.value;
        refreshMap();
    });
}).catch(function(error) {
    console.error("Error loading map or CSV data:", error);
});