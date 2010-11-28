var canvas;
var canvasWidth;
var canvasHeight;
var centreX;
var centreY;
var chartColours = [];
var chartData = [];
var currentPullOutSlice = -1;
var maxPullOutDistance = 15;
var currentPullOutDistance = 0;
var totalValue = 0;
var chartStartAngle = -.5 * Math.PI;
var pullOutLabelPadding = 25;
var pullOutFrameStep = 2;
var chartRadius;
var context;
var animationId = 0;

function draw() {
    context = canvas.getContext('2d');
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    var currentPos = 0;
    for (var item in chartData) {
        chartData[item]['startAngle'] = 2 * Math.PI * currentPos;
        chartData[item]['endAngle'] = 2 * Math.PI * ( currentPos + ( chartData[item]['value'] / totalValue ) );
        currentPos += chartData[item]['value'] / totalValue;
    }

    for (var slice in chartData) {
        if (slice != currentPullOutSlice) drawSlice(context, slice);
    }
    if (currentPullOutSlice != -1) drawSlice(context, currentPullOutSlice);
}

var queryChar = function() {
    canvas = document.getElementById('chart');
    if (typeof canvas.getContext === 'undefined') return;
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    centreX = canvasWidth / 2;
    centreY = canvasHeight / 2;
    chartRadius = Math.min(canvasWidth, canvasHeight) / 2 * 0.55;

    ReminderDatabase.initCanvas(draw);
    $('#chart').click(handleChartClick);
};


function drawSlice(context, slice) {
    var startX,startY;
    var startAngle = chartData[slice]['startAngle'] + chartStartAngle;
    var endAngle = chartData[slice]['endAngle'] + chartStartAngle;
    if (slice == currentPullOutSlice) {
        var midAngle = (startAngle + endAngle) / 2;
        var actualPullOutDistance = currentPullOutDistance * easeOut(currentPullOutDistance / maxPullOutDistance, .8);
        startX = centreX + Math.cos(midAngle) * actualPullOutDistance;
        startY = centreY + Math.sin(midAngle) * actualPullOutDistance;
        context.fillStyle = chartColours[slice];
        context.textAlign = "center";
        context.font = "bold 18px sans-serif";
        context.fillText(chartData[slice]['label'], centreX + Math.cos(midAngle) * ( chartRadius + maxPullOutDistance + pullOutLabelPadding ), centreY + Math.sin(midAngle) * ( chartRadius + maxPullOutDistance + pullOutLabelPadding));
        context.fillText(chartData[slice]['value'] + " (" + ( parseInt(chartData[slice]['value'] / totalValue * 100 + .5) ) + "%)", centreX + Math.cos(midAngle) * ( chartRadius + maxPullOutDistance + pullOutLabelPadding ), centreY + Math.sin(midAngle) * ( chartRadius + maxPullOutDistance + pullOutLabelPadding ) + 20);
    } else {
        startX = centreX;
        startY = centreY;
    }
    var sliceGradient = context.createLinearGradient(0, 0, canvasWidth * .75, canvasHeight * .75);
    sliceGradient.addColorStop(0, "#ddd");
    sliceGradient.addColorStop(1, chartColours[slice]);

    context.beginPath();
    context.moveTo(startX, startY);
    context.arc(startX, startY, chartRadius, startAngle, endAngle, false);
    context.lineTo(startX, startY);
    context.fillStyle = sliceGradient;
    context.fill();

    if (slice == currentPullOutSlice) {
        context.lineWidth = 1.5;
        context.strokeStyle = "#333";
    } else {
        context.lineWidth = 1;
        context.strokeStyle = "#fff";
    }
    context.stroke();
    context.closePath();
}

function handleChartClick(clickEvent) {
    var mouseX = clickEvent.pageX - this.offsetLeft;
    var mouseY = clickEvent.pageY - this.offsetTop;
    var xFromCentre = mouseX - centreX;
    var yFromCentre = mouseY - centreY;
    var distanceFromCentre = Math.sqrt(Math.pow(Math.abs(xFromCentre), 2) + Math.pow(Math.abs(yFromCentre), 2));

    if (distanceFromCentre <= chartRadius) {
        var clickAngle = Math.atan2(yFromCentre, xFromCentre) - chartStartAngle;
        if (clickAngle < 0) clickAngle = 2 * Math.PI + clickAngle;

        for (var slice in chartData) {
            if (clickAngle >= chartData[slice]['startAngle'] && clickAngle <= chartData[slice]['endAngle']) {
                toggleSlice(slice);
                return;
            }
        }
    }
    pushIn();
}

function toggleSlice(slice) {
    if (slice == currentPullOutSlice) {
        pushIn();
    } else {
        startPullOut(slice);
    }
}

function startPullOut(slice) {
    if (currentPullOutSlice == slice) return;
    currentPullOutSlice = slice;
    currentPullOutDistance = 0;
    clearInterval(animationId);
    animationId = setInterval(function() {
        animatePullOut(slice);
    }, 40);
}

function animatePullOut() {
    currentPullOutDistance += pullOutFrameStep;
    if (currentPullOutDistance >= maxPullOutDistance) {
        clearInterval(animationId);
        return;
    }
    draw();
}

function pushIn() {
    currentPullOutSlice = -1;
    currentPullOutDistance = 0;
    clearInterval(animationId);
    draw();
}

function easeOut(ratio, power) {
    return ( Math.pow(1 - ratio, power) + 1 );
}