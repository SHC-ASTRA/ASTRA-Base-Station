var ros;

function setupNavBar(divID, callback) {
    $(divID).load("navbar.html", callback);
}

function setupRos() {
    var address = "ws://" + $("#rosBridgeAddress").val();

    ros = new ROSLIB.Ros();

    var button = $("#rosBridgeConnect");
    button.click(function() {
        if (button.text() == "Connect") {
            ros.connect("ws://" + $("#rosBridgeAddress").val());
        } else {
            ros.close();
        }
    });

    ros.on('connection', function () {
        console.log('Connected to websocket server.');
        button.removeClass("btn-outline-success");
        button.addClass("btn-outline-danger");
        button.text("Disconnect");
    });

    ros.on('error', function (error) {
        console.log('Error connection to websocket server: ' + error);
        button.addClass("btn-outline-success");
        button.removeClass("btn-outline-danger");
        button.text("Connect");
    });

    ros.on('close', function () {
        console.log('Connection to websocket server closed.');
        button.addClass("btn-outline-success");
        button.removeClass("btn-outline-danger");
        button.text("Connect");
    });

    ros.connect(address);

    return ros;
}