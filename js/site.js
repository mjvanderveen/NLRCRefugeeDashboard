//configuration object

var config = {
    title:"Vluchtelingenhulpverlening",
    description:"Wat doet het Rode Kruis voor de vluchtelingen in Nederland?",
    data:"data/data.json",
    refugeesHelpedFieldName:"RefugeesHelped",
	whereFieldName:"DistrictCode",
    geo:"data/districten.geojson",
    joinAttribute:"tdn_code",
    nameAttribute:"provnaam",
    color:"#03a9f4"
};

function setLabels (cf){
	// get sum of non-filtered items
	var refugeesHelped = cf.groupAll().reduceSum(function(d) { return d.RefugeesHelped; }).value();
	var deployments = cf.groupAll().reduceSum(function(d) { return d.Deployments; }).value();
	var beds = cf.groupAll().reduceSum(function(d) { return d.Beds; }).value();
	
	//update labels
	$( "#numberrefugees" ).text(refugeesHelped);
	$( "#deployments" ).text(deployments);
	$( "#beds" ).text(beds);
};

//function to generate the 3W component
//data is the whole 3W Excel data set
//geom is geojson file
function generateInfographic(config,data,geom){
    
    var lookup = genLookup(geom,config);
    
    $('#title').html(config.title);
    $('#description').html(config.description);

    var whereChart = dc.leafletChoroplethChart('#where-chart');

    var cf = crossfilter(data);
	
	whereChart.on("filtered", function(chart, filter){
		setLabels(cf);
	});

	
	var whereDimension = cf.dimension(function(d){ return d[config.whereFieldName]; });
    var refugeesHelpedDimension = cf.dimension(function(d){ return d[config.refugeesHelpedFieldName]; });

    var refugeesHelpedGroup = refugeesHelpedDimension.group();
	var whereGroup = whereDimension.group();
    var all = cf.groupAll();

    dc.dataCount('#count-info')
            .dimension(cf)
            .group(all);

    whereChart.width($('#where-chart').width()).height(360)
            .dimension(whereDimension)
            .group(whereGroup)
            .center([0,0])
            .zoom(0)    
            .geojson(geom)
            .colors(['#CCCCCC', config.color])
            .colorDomain([0, 1])
            .colorAccessor(function (d) {
                if(d>0){
                    return 1;
                } else {
                    return 0;
                }
            })           
            .featureKeyAccessor(function(feature){
                return feature.properties[config.joinAttribute];
            }).popup(function(d){
                return lookup[d.key];
            })
            .renderPopup(true);
			
	// set all  labels
	setLabels(cf);

    dc.renderAll();
    
    var map = whereChart.map();

    zoomToGeom(geom);
  
    function zoomToGeom(geom){
        var bounds = d3.geo.bounds(geom);
        map.fitBounds([[bounds[0][1],bounds[0][0]],[bounds[1][1],bounds[1][0]]]);
    }
    
    function genLookup(geojson,config){
        var lookup = {};
        geojson.features.forEach(function(e){
            lookup[e.properties[config.joinAttribute]] = String(e.properties[config.nameAttribute]);
        });
        return lookup;
    }
}

//load data

var dataCall = $.ajax({ 
    type: 'GET', 
    url: config.data, 
    dataType: 'json',
});

//load geometry

var geomCall = $.ajax({ 
    type: 'GET', 
    url: config.geo, 
    dataType: 'json',
});

//when both ready construct Infographic

$.when(dataCall, geomCall).then(function(dataArgs, geomArgs){
    var geom = geomArgs[0];
    geom.features.forEach(function(e){
        e.properties[config.joinAttribute] = String(e.properties[config.joinAttribute]); 
    });
    generateInfographic(config,dataArgs[0],geom);
});