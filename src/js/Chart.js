var canvas;
var canvasWidth;
var canvasHeight;
var centreX;
var centreY;
var chartColours = [];
var chartData = [];
var currentPullOutSlice = -1;
var maxPullOutDistance = 25;
var currentPullOutDistance = 0;
var totalValue = 0;
var chartStartAngle = -.5 * Math.PI;
var pullOutValuePrefix = "$";
var pullOutShadowColour = "rgba( 0, 0, 0, .5 )";
var pullOutShadowOffsetX = 5;
var pullOutShadowOffsetY = 5;
var pullOutShadowBlur = 5;
var pullOutBorderWidth = 2;
var pullOutBorderStyle = "#333";
var sliceBorderWidth = 1;
var sliceBorderStyle = "#fff";
var sliceGradientColour = "#ddd";
var chartRadius;
var context;

function draw() {
    var currentPos = 0;
    for (var item in chartData) {
        chartData[item]['startAngle'] = 2 * Math.PI * currentPos;
        chartData[item]['endAngle'] = 2 * Math.PI * ( currentPos + ( chartData[item]['value'] / totalValue ) );
        currentPos += chartData[item]['value'] / totalValue;
    }

    for (var slice in chartData) {
        if (slice != currentPullOutSlice) drawSlice(context, slice);
    }
}
var queryChar = function() {
    canvas = document.getElementById('chart');
    if (typeof canvas.getContext === 'undefined') return;
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    centreX = canvasWidth / 2;
    centreY = canvasHeight / 2;
    chartRadius = Math.min(canvasWidth, canvasHeight) / 2 * 0.55;
    context = canvas.getContext('2d');
    context.clearRect(0, 0, canvasWidth, canvasHeight);

    ReminderDatabase.initCanvas(draw);
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
        context.fillText(chartData[slice]['label'], centreX + Math.cos(midAngle) * ( chartRadius + maxPullOutDistance + pullOutLabelPadding ), centreY + Math.sin(midAngle) * ( chartRadius + maxPullOutDistance + pullOutLabelPadding ));
        context.fillText(pullOutValuePrefix + chartData[slice]['value'] + " (" + ( parseInt(chartData[slice]['value'] / totalValue * 100 + .5) ) + "%)", centreX + Math.cos(midAngle) * ( chartRadius + maxPullOutDistance + pullOutLabelPadding ), centreY + Math.sin(midAngle) * ( chartRadius + maxPullOutDistance + pullOutLabelPadding ) + 20);
        context.shadowOffsetX = pullOutShadowOffsetX;
        context.shadowOffsetY = pullOutShadowOffsetY;
        context.shadowBlur = pullOutShadowBlur;

    } else {
        startX = centreX;
        startY = centreY;
    }
    var sliceGradient = context.createLinearGradient(0, 0, canvasWidth * .75, canvasHeight * .75);
    sliceGradient.addColorStop(0, sliceGradientColour);
    sliceGradient.addColorStop(1, chartColours[slice]);

    context.beginPath();
    context.moveTo(startX, startY);
    context.arc(startX, startY, chartRadius, startAngle, endAngle, false);
    context.lineTo(startX, startY);
    context.closePath();
    context.fillStyle = sliceGradient;
    context.shadowColor = ( slice == currentPullOutSlice ) ? pullOutShadowColour : "rgba( 0, 0, 0, 0 )";
    context.fill();
    context.shadowColor = "rgba( 0, 0, 0, 0 )";

    if (slice == currentPullOutSlice) {
        context.lineWidth = pullOutBorderWidth;
        context.strokeStyle = pullOutBorderStyle;
    } else {
        context.lineWidth = sliceBorderWidth;
        context.strokeStyle = sliceBorderStyle;
    }
    context.stroke();
}

function easeOut(ratio, power) {
    return ( Math.pow(1 - ratio, power) + 1 );
}