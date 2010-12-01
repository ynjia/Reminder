var monthOnDisplay;
var dateToDayObjectMap;
var selectedEventType = "";
var selectedReminderEvent = null;
var calendarStartTime = 0;
var calendarEndTime = 0;
var seletedColor = "";

initDatabase();
function getSelectedColor() {
    $("#colorBox div.colorBlock").unbind('click').bind("click", function() {
        var colorBlock = $(this);
        seletedColor = colorBlock.children("a").attr("style").toString().split(";")[0];
    });
}

function initColorBox() {
    $.each(localStorage.allTypes.split(":"), function() {
        $("#calendarList").append(localStorage.getItem(this));
    });
}

function initEventType() {
    $.each(localStorage.allTypes.split(":"), function() {
        $("#eventEventType").append("<option value='" + this + "'>" + this + "</option>");
    })
}

function closeDialog() {
    $("#eventOverlay").removeClass("show");
    $("#gridView").removeClass("inactive");
}

function initMonth() {
    monthOnDisplay = CalendarState.currentMonth();
    monthOnDisplayUpdated();
    getSelectedColor();
    if (localStorage.allTypes == undefined) {
        localStorage.allTypes = "";
    }
    initColorBox();
    initEventType();
}

function monthOnDisplayUpdated() {
    var monthStrings = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    $("#monthTitle").text(monthStrings[monthOnDisplay.getMonth()] + " " + monthOnDisplay.getFullYear());
    CalendarState.setCurrentMonth(monthOnDisplay.toString());
    initDaysGrid();
    ReminderDatabase.openReminderEvents();
}

function addType() {
    if (seletedColor == "") {
        alert("Select Type Color, please");
        return;
    }
    var value = $("#newTypeValue").val();
    if (value == "") {
        alert("Input Type Name, please");
        return;
    }
    $("#newTypeValue").val("");
    var content = "<li><span class='colorIndicator' style='" + seletedColor + "'></span><input type='checkbox' id='" + value + "' onchange='calendarClicked(event)'>" + value + "</li>";
    localStorage.allTypes += value + ":";
    localStorage.setItem(value, content);
    localStorage.setItem(value + "_color", seletedColor);
    $("#calendarList").append(content);
    $("#eventEventType").append("<option value='" + value + "'>" + value + "</option>");
}

function removeType() {
    if($("#calendarList li input:checked").length==0)return;
    $.each($("#calendarList li input:checked"), function() {
        var item = $(this);
        deleteEventsOfCalendarType(item.attr("id"));
        item.parent().remove();
    });
    if ($("#calendarList li").children("input").length == 0)
        localStorage.allTypes = "";
    else
        $.each($("#calendarList li").children("input"), function() {
            localStorage.allTypes = $(this).attr("id") + ":";
        });
}
function initDaysGrid() {
    var displayedDate = new Date(monthOnDisplay);
    displayedDate.setDate(displayedDate.getDate() - displayedDate.getDay());

    var daysGrid = document.getElementById("daysGrid");
    daysGrid.removeChildren();
    dateToDayObjectMap = new Object();
    calendarStartTime = displayedDate.getTime();
    var doneWithThisMonth = false;
    var rows = 0;
    while (!doneWithThisMonth) {
        rows++;
        for (var i = 0; i < 7; ++i) {
            var dateTime = displayedDate.getTime();
            var dayObj = new Day(displayedDate);
            dateToDayObjectMap[dateTime] = dayObj;
            dayObj.attach(daysGrid);
            displayedDate.setDate(displayedDate.getDate() + 1);
        }
        doneWithThisMonth = (displayedDate.getMonth() != monthOnDisplay.getMonth());
    }
    displayedDate.setDate(displayedDate.getDate() - 1);
    displayedDate.setHours(23, 59, 59, 999);
    calendarEndTime = displayedDate.getTime();
}

function isCalendarTypeVisible(type) {
    var input = document.getElementById(type);
    if (!input || input.tagName != "INPUT")
        return false;
    return input.checked;
}

function addEventsOfCalendarType(calendarType) {
    ReminderDatabase.loadEventsFromDBForCalendarType(calendarType);
}

function hiddenEventsOfCalendarType(calendarType) {
    var dayElements = document.getElementById("daysGrid").childNodes;
    for (var i = 0; i < dayElements.length; i++) {
        var dayObj = dayObjectFromElement(dayElements[i]);
        if (!dayObj)
            continue;
        dayObj.hideEventsOfCalendarType(calendarType);
    }
}
function deleteEventsOfCalendarType(calendarType) {
    var dayElements = document.getElementById("daysGrid").childNodes;
    for (var i = 0; i < dayElements.length; i++) {
        var dayObj = dayObjectFromElement(dayElements[i]);
        if (!dayObj)
            continue;
        dayObj.deleteEventsOfCalendarType(calendarType);
    }
}

function pageLoaded() {
    document.getElementById("gridView").addEventListener("selectstart", stopEvent, true);
    document.getElementById("searchResults").addEventListener("selectstart", stopEvent, true);
    document.body.addEventListener("keyup", keyUpHandler, false);
    initMonth();
}

function previousMonth() {
    monthOnDisplay.setMonth(monthOnDisplay.getMonth() - 1);
    monthOnDisplayUpdated();
}

function nextMonth() {
    monthOnDisplay.setMonth(monthOnDisplay.getMonth() + 1);
    monthOnDisplayUpdated();
}

function calendarClicked(event) {
    if (event.target.tagName == "INPUT") {
        var calendarType = event.target.id;
        var checked = event.target.checked;
        CalendarState.setCalendarChecked(calendarType, checked);
        if (checked)
            addEventsOfCalendarType(calendarType);
        else
            hiddenEventsOfCalendarType(calendarType);
    }
}

function keyUpHandler(event) {
    switch (event.keyIdentifier) {
        case "U+007F":   // Delete key
            if (selectedReminderEvent && selectedReminderEvent.day)
                selectedReminderEvent.day.deleteEvent(selectedReminderEvent);
            break;
        default:
            break;
    }
}

function eventDetailsDismissed() {
    if (selectedReminderEvent) {
        var listItemNode = selectedReminderEvent.listItemNode;
        if (listItemNode != null) {
            listItemNode.removeStyleClass("selected");
            selectedReminderEvent.detailsUpdated();
        }
    }
    closeDialog();
    selectedReminderEvent = null;
    $("#gridView").removeClass("inactive");
}

function eventSearch(query) {
    if (query.length == 0) {
        var searchResultsList = document.getElementById("searchResults");
        searchResultsList.removeChildren();
        unhighlightAllEvents();
        return;
    }
    query = "%" + query + "%";
    ReminderDatabase.queryEventsInDB(query);
}

var CalendarState = {
    currentMonth: function() {
        var month = new Date();
        if (localStorage.monthOnDisplay)
            month.setTime(Date.parse(localStorage.monthOnDisplay));
        month.setDate(1);
        month.setHours(0, 0, 0, 0);
        return month;
    },

    setCurrentMonth: function(monthString) {
        localStorage.monthOnDisplay = monthString;
    },

    toCalendarKey: function(calendarType) {
        return calendarType + "CalendarChecked";
    },

    calendarChecked: function(calendarType) {
        var value = localStorage.getItem(CalendarState.toCalendarKey(calendarType));
        if (!value)
            return true;
        return (value == "yes");
    },

    setCalendarChecked: function(calendarType, checked) {
        localStorage.setItem(CalendarState.toCalendarKey(calendarType), checked ? "yes" : "no");
    }
};

function highlightEventInCalendar(calendarEvent) {
    var itemsToHighlight = $("ul.contents li." + calendarEvent.calendar);
    for (var i = 0; i < itemsToHighlight.length; ++i) {
        var listItem = itemsToHighlight[i];
        if (listItem.innerText !== calendarEvent.title)
            continue;
        if (listItem.hasStyleClass("highlighted"))
            continue;
        listItem.addStyleClass("highlighted");
        break;
    }
}

function unhighlightAllEvents() {
    var highlightedItems = $("ul.contents li.highlighted");
    for (var i = 0; i < highlightedItems.length; ++i)
        highlightedItems[i].removeStyleClass("highlighted");
}

function dayObjectFromElement(element) {
    var parent = element;
    while (parent && !parent.dayObject)
        parent = parent.parentNode;
    return parent ? parent.dayObject : null;
}