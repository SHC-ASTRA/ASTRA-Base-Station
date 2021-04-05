// Element References for Quick Access
var ros_status;

// ROS Instance Object
var ros;

// ROS Subscribers
var gps_sub;

function setup() {
    // Establish all element references for later use
    ros_status = $("#ros_status_output");

    ros = new ROSLIB.Ros({
        url: 'ws://10.0.0.30:9090'
    });
    
    ros.on('connection', function() {
        ros_log("Connected to websocket server.")
    });

    ros.on('error', function() {
        ros_log("Error connection to websocket server: " + error);
    });

    ros.on('close', function() {
        ros_log("Connection to websocket server closed.");
    });

    gps_sub = new ROSLIB.Topic({
        ros: ros,
        name: "/gps",
        messageType: "embedded_controller_relay/NavSatReport"
    });

    gps_sub.subscribe(update_gps);
}

function ros_log(log) {
    time = new Date().toTimeString().split(" ")[0];
    ros_status.text("[" + time + "] " + log + "\n" + ros_status.text());
}

function update_gps(message) {
    $("#gps_latitude").html(`Lat: ${message.latitude}` + "&deg;");
    $("#gps_longitude").html(`Lon: ${message.longitude}` + "&deg;");
    $("#gps_altitude").text(`Alt: ${message.altitude} m (ASL)`);
    $("#gps_accuracy").text(`Acc: ${message.horizontal_accuracy} m (radius)`);
    $("#gps_timestamp").text(message.timestamp);
}


// Run Setup after the document loads
window.onload = setup;