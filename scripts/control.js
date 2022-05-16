var TankState = {}
TankState.right = 0;
TankState.left = 0;

var ros;

var imu_sub, gps_sub, battery_sub;
var fr_motor_pub, fl_motor_pub, br_motor_pub, bl_motor_pub;
var motor_power_pub;

var roverIcon = L.icon({iconUrl: "assets/crosshair.png"});
var roverMarker;

function preSetup() {
    setupNavBar("#navbar", controlSetup);
}

function controlSetup() {
    var style = getComputedStyle(document.body);
    var theme = {};
    
    theme.primary = style.getPropertyValue('--primary');
    theme.secondary = style.getPropertyValue('--secondary');
    theme.success = style.getPropertyValue('--success');
    theme.info = style.getPropertyValue('--info');
    theme.warning = style.getPropertyValue('--warning');
    theme.danger = style.getPropertyValue('--danger');
    theme.light = style.getPropertyValue('--light');
    theme.dark = style.getPropertyValue('--dark');

    var map = L.map('map', {dragging: false}).setView([38.4063, -110.7918], 12);

    L.tileLayer('atlas/usgs/{z}/{x}/{y}.jpg', {
        maxZoom: 13,
    }).addTo(map);

    // Setup Orientation Color Bounds
    setupColorBounds("#rover_roll", [-30, -15, 15, 30], [theme.danger, theme.warning, theme.light, theme.warning, theme.danger]);
    setupColorBounds("#rover_pitch", [-30, -15, 15, 30], [theme.danger, theme.warning, theme.light, theme.warning, theme.danger]);

    // Add handler to motor power control slider
    $("#motorPowerControl").on("input", handleMotorPowerControlUpdate);

    // Reset Orientation Views
    setRotation("rover_roll", 0.0);
    setRotation("rover_pitch", 0.0);

    // Setup ROS
    ros = setupRos();
    setupRosNode();

    flag = setupInput("#controllerDropdown", "#controlToggleButton");
    if (flag == -1) // Browser not supported
    {
        alert("This browser does not support gamecontrollers...");
    }
    setupTankControls();
    handleTankUpdate();

    console.log("Loaded control page...");
};

function setupRosNode() {
    motor_power_pub = new ROSLIB.Topic({
        ros: ros,
        name: "/teensy/motor/max_power",
        messageType: "std_msgs/Float32"
    });
    fr_motor_pub = new ROSLIB.Topic({
        ros: ros,
        name: "/teensy/motor/front_right/power",
        messageType: "std_msgs/Float32"
    });
    fl_motor_pub = new ROSLIB.Topic({
        ros: ros,
        name: "/teensy/motor/front_left/power",
        messageType: "std_msgs/Float32"
    });
    br_motor_pub = new ROSLIB.Topic({
        ros: ros,
        name: "/teensy/motor/back_right/power",
        messageType: "std_msgs/Float32"
    });    
    bl_motor_pub = new ROSLIB.Topic({
        ros: ros,
        name: "/teensy/motor/back_left/power",
        messageType: "std_msgs/Float32"
    });

    imu_sub = new ROSLIB.Topic({
        ros: ros,
        name: "/sensor/zed2/zed_node/imu/data",
        messageType: "sensor_msgs/Imu"
    });

    gps_sub = new ROSLIB.Topic({
        ros: ros,
        name: "/teensy/gps",
        messageType: "embedded_controller_relay/NavSatReport"
    });

    battery_sub = new ROSLIB.Topic({
        ros: ros,
        name: "/teensy/battery_status",
        messageType: "embedded_controller_relay/BatteryReport"
    });

    imu_sub.subscribe(function (data) {
        or = data["linear_acceleration"];
        accX = or["x"];
        accY = or["y"];
        accZ = or["z"];

        pitch = 180 * Math.atan (accX/Math.sqrt(accY*accY + accZ*accZ))/Math.PI;
        roll = 180 * Math.atan2(accY, accZ)/Math.PI;

        setRotation("rover_roll", roll);
        setRotation("rover_pitch", pitch);
    });

    gps_sub.subscribe(function (data) {
        if (roverMarker === undefined)
        {
            roverMarker = L.marker([data.latitude, data.longitude], {icon: roverIcon});
            roverMarker.addTo(map);
        } else 
        {
            roverMarker.setLatLng([data.latitude, data.longitude]);
        }

        $("#roverSpeed").val(data.ground_speed);
    });

    battery_sub.subscribe(function (data) {
        $("#batteryVoltage").val(data.batteryVoltage);
    });
}

function setRotation(image_name, angle) {
    $("#"+image_name).val(angle);
    $("#"+image_name+"_svg").attr("transform", "rotate("+angle+")");

    // Trigger onchange event
    $("#"+image_name).trigger("change");
}

function updatePowerDisplay(wheelId, power) {
    prefix = "";

    if (power > 0) {
        prefix = "+";
    }

    $(wheelId).text(prefix + parseFloat(power).toFixed(0));
}

function handleMotorPowerControlUpdate() {
    max_power = $("#motorPowerControl").val();
    $("#motorPowerDisplay").val(max_power);
    max_power = max_power / 100.0;

    var powerControlUpdate = new ROSLIB.Message({
        data: max_power
    });

    motor_power_pub.publish(powerControlUpdate);
}

function setupColorBounds(target, bounds, colors) {
    // Hook onto change event
    $(target).change(function() {
        // Store value, format to two decimal places
        var val = $(target).val();
        $(target).val(parseFloat(val).toFixed(2));
        for (let i = 0; i <= bounds.length; i++)
        {
            if (i == bounds.length || val < bounds[i])
            {
                $(target).css("background-color", colors[i])
                return;
            }
        }
    });
}

function handleTankUpdate() {
    updatePowerDisplay("#frontRightWheelDisplay", 100*TankState.right);
    updatePowerDisplay("#backRightWheelDisplay", 100*TankState.right);
    updatePowerDisplay("#frontLeftWheelDisplay", 100*TankState.left);
    updatePowerDisplay("#backLeftWheelDisplay", 100*TankState.left);

    var rightUpdate = new ROSLIB.Message({data: TankState.right});
    var leftUpdate = new ROSLIB.Message({data: TankState.left});

    fr_motor_pub.publish(rightUpdate);
    br_motor_pub.publish(rightUpdate);
    fl_motor_pub.publish(leftUpdate);
    bl_motor_pub.publish(leftUpdate);
}

function handleAnalogInput(event) {
    var input = event.detail;

    if (input.controllerIndex != Input.activeController)
    {
        return;
    }

    if (Input.enabled)
    {
        if (input.name == "RIGHT_ANALOG_STICK") {
            TankState.right = -input.position.y;
        } else if (input.name == "LEFT_ANALOG_STICK") {
            TankState.left = -input.position.y;
        }
    } else if (TankState.right != 0 || TankState.left != 0) { // If input disabled, but TankState not 0, then set power to 0.
        TankState.right = 0;
        TankState.left = 0;
    } else {
        return;
    }

    handleTankUpdate();
}

function setupTankControls() {
    window.addEventListener("gc.analog.hold", handleAnalogInput);
    window.addEventListener("gc.analog.end", handleAnalogInput);
}

onload = preSetup;