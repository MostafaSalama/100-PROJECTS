function setup() {
    // Create a canvas that is 900 pixels wide and 600 pixels high
    createCanvas(900, 600);
    // Set the angle mode to degrees instead of radians for easier calculation
    angleMode(DEGREES);

    // Initialize the sound synthesizer
    // We use an envelope to shape the sound into a short "tick"
    tickEnv = new p5.Envelope();
    // setADSR(attackTime, decayTime, sustainRatio, releaseTime)
    tickEnv.setADSR(0.005, 0.01, 0.1, 0.1);
    // setRange(attackLevel, releaseLevel)
    tickEnv.setRange(0.5, 0);

    // Create an oscillator for the tick tone
    tickOsc = new p5.Oscillator('sine');
    tickOsc.start();
    tickOsc.freq(800); // Set frequency to 800Hz
    tickOsc.amp(tickEnv); // Control amplitude with the envelope
}

// Variable to track the previous second to trigger sound only once per second
let lastSecond = -1;
let tickEnv;
let tickOsc;

function draw() {
    // Set the background color to a dark gray (RGB: 30, 30, 30)
    background(30);

    // Move the origin (0,0) to the center of the canvas
    translate(width / 2, height / 2);
    // Rotate the coordinate system -90 degrees so 0 degrees is at the top (12 o'clock)
    rotate(-90);

    // Get the current hour from the computer's clock
    let hr = hour();
    // Get the current minute from the computer's clock
    let mn = minute();
    // Get the current second from the computer's clock
    let sc = second();

    // --- Sound Logic ---
    // Check if the second has changed since the last frame
    if (sc !== lastSecond) {
        // Play the tick sound
        tickEnv.play();
        // Update the lastSecond variable
        lastSecond = sc;
    }

    // --- Clock Numbers ---
    push();
    // Loop through numbers 1 to 12
    for (let i = 1; i <= 12; i++) {
        // Calculate the angle for each number (each hour is 30 degrees)
        let angle = i * 30;
        // Calculate x and y coordinates using polar to cartesian conversion
        // Radius is 110 (slightly inside the clock face)
        let x = 110 * cos(angle);
        let y = 110 * sin(angle);

        push();
        // Move to the calculated position
        translate(x, y);
        // Rotate the text 90 degrees to make it upright (undoing the global -90 rotation)
        rotate(90);

        // Set text properties
        fill(255);
        noStroke();
        textSize(16);
        textAlign(CENTER, CENTER);
        // Draw the number
        text(i, 0, 0);
        pop();
    }
    pop();

    // --- Seconds Hand ---
    // Set the stroke weight (thickness) to 4 pixels
    strokeWeight(4);
    // Set the stroke color to a reddish color
    stroke(255, 100, 100);
    // Disable filling shapes
    noFill();
    // Calculate the angle for the seconds hand (0-60 maps to 0-360 degrees)
    let secondAngle = map(sc, 0, 60, 0, 360);

    // Save the current transformation state
    push();
    // Rotate the drawing context by the calculated second angle
    rotate(secondAngle);
    // Draw a line starting from the center (0,0) outwards to represent the seconds hand
    line(0, 0, 100, 0);
    // Restore the previous transformation state
    pop();

    // --- Minutes Hand ---
    // Set the stroke weight to 8 pixels
    strokeWeight(8);
    // Set the stroke color to white
    stroke(255);
    // Calculate the angle for the minutes hand (0-60 maps to 0-360 degrees)
    let minuteAngle = map(mn, 0, 60, 0, 360);

    // Save the current transformation state
    push();
    // Rotate the drawing context by the calculated minute angle
    rotate(minuteAngle);
    // Draw a line for the minutes hand (shorter than seconds hand)
    line(0, 0, 75, 0);
    // Restore the previous transformation state
    pop();

    // --- Hours Hand ---
    // Set the stroke weight to 12 pixels
    strokeWeight(12);
    // Set the stroke color to white
    stroke(255);
    // Calculate the angle for the hours hand (0-12 maps to 0-360 degrees)
    // We use hr % 12 to convert 24-hour time to 12-hour time
    let hourAngle = map(hr % 12, 0, 12, 0, 360);

    // Save the current transformation state
    push();
    // Rotate the drawing context by the calculated hour angle
    rotate(hourAngle);
    // Draw a line for the hours hand (shortest hand)
    line(0, 0, 50, 0);
    // Restore the previous transformation state
    pop();

    // --- Center Pin ---
    // Set the fill color to white
    fill(255);
    // Disable the stroke (outline)
    noStroke();
    // Draw a small circle at the center to represent the pin holding the hands
    ellipse(0, 0, 10, 10);

    // --- Clock Face Outline ---
    // Set the stroke color to white
    stroke(255);
    // Set the stroke weight to 2 pixels
    strokeWeight(2);
    // Disable fill so we only see the ring
    noFill();
    // Draw a circle surrounding the hands to represent the clock face
    ellipse(0, 0, 250, 250);
}

// Function to enable audio context on user interaction (required by some browsers)
function mousePressed() {
    userStartAudio();
}
