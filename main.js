/*global $*/
/*global io*/

// Chat

function Message(text, name, interval, time = 0) {
    var prevLength;

    var currentLength = function() {
        return Math.min(Math.floor(time / interval), text.length);
    };
    var updatePrevLength = function() {
        prevLength = currentLength();
    };
    
    var current = function() {
        return namify(text.substring(0, currentLength()));
    };
    var namify = function(text) {
        if (name == undefined) {
            return text;
        }
        else {
            return "<span style=\"color:#0cf\">" + name + "</span>: " + text;
        }
    };
    var ended = function() {
        return currentLength() >= text.length;
    };
    var talk = function() {
        return (currentLength() - prevLength) != 0;
    };
    var step = function(delta) {
        updatePrevLength();
        time += delta;
    };
    
    updatePrevLength();
    
    this.current = current; // Get timed chat text
    this.ended = ended;     // Has the message ended?
    this.talk = talk;       // Should talk?
    this.step = step;       // Step time with delta
}

function Chat(text, talker, nextArrow, nextTrigger, queue = []) {
    var time = 0;
    var timer;
    var prevTime;

    var current = function() {
        return queue[0];
    };
    var empty = function() {
        return current() == undefined;
    };
    var next = function() {
        return queue.length > 1;
    };
    var addMessage = function(message) {
        queue.push(message);
    };
    var nextMessage = function() {
        queue.shift();
    };
    var tick = function(delta) {
        time += delta;
        
        // Tick message
        
        if (empty()) {
            $(text).html("");
        }
        else {
            current().step(delta);

            if ($(text).html() != current().current()) {
                $(text).html(current().current());
            }
            
            if (current().talk()) {
                var _talker = $(talker)[0];
                _talker.currentTime = 0;
                _talker.play();
            }
            
            $(nextArrow).css("display", (next() && current().ended()
                && (Math.floor(time / 500) % 2 == 0)) ? "block" : "none");
        }
    };
    var update = function() {
        var delta = Date.now() - prevTime;
        prevTime = Date.now();
        
        tick(delta);
    };
    
    var clear = function(newQueue) {
        queue = newQueue;
    };
    var chat = function(message) {
        addMessage(message);
    };
    var progress = function() {
        if (next()) {
            nextMessage();
        }
    };
    
    prevTime = Date.now();
    timer = setInterval(update, 33);
    $(nextTrigger).click(progress);
    
    this.clear = clear;
    this.chat = chat;
    this.progress = progress;
}

// Input

function Input(field, onenter) {
    $(field).keypress(function(e) {
        if (e.which === 13) {
            onenter($(this).val());
        }
    });
}

// Status

function Status(text) {
    var set = function(msg, color) {
        $(text).html(msg);
        $(text).css("color", color);
    };
    
    this.set = set;
}

// Main

$(function () {
    $("#main").fadeIn(1000);
    
    var status = new Status("#status");
    
    var url = prompt("Server to connect to?");
    console.log("Connecting...");
    var socket = io(url);
    
    var chat = new Chat("#chat #text", "#chat #talker", "#chat #next", "#chat");
    var input = new Input("#input #text", function(text) {
        if (text != "") {
            socket.emit("global", {
                "msg": text,
                "speed": $("#input #speed").val()
            });
            $("#input #text").val("");
        }
    });
    
    socket.on("global", function(data) {
        chat.chat(new Message(data["msg"], data["name"], data["interval"]));
    });
    
    // Connection status
    
    socket.on("connect", function() {
        console.log("Connected!");
        status.set("Online", "#0f0");
    });
    socket.on("disconnect", function() {
        console.log("Disconnected!");
        status.set("Offline (Trying to reconnect...)", "#f00");
    });
    socket.on("error", function(err) {
        console.log("Error connecting! " + err);
    });
    socket.on("reconnect", function(num) {
        console.log("Reconnected on try " + num + "!");
    });
    socket.on("reconnecting", function(num) {
        console.log("Reconnecting (Try " + num + ")...");
    });
    socket.on("reconnect_error", function(err) {
        console.log("Error reconnecting! " + err);
    });
    socket.on("reconnect_failed", function() {
        console.log("Could not reconnect.");
        status.set("Offline (Gave up reconnecting.)");
    })
});