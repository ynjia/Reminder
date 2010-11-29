var monthStrings = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var monthOnDisplay;
var dateToDayObjectMap;
var selectedCalendarType = "";
var selectedCalendarEvent = null;
var calendarStartTime = 0;
var calendarEndTime = 0;
var insertedStyleRuleIndexForDayBox = -1;
var seletedColor = "background-color:#fe0100";

initDatabase();
function updateCalendarRowCount(count) {
    var stylesheet = document.styleSheets[0];
    if (count == 5) {
        if (insertedStyleRuleIndexForDayBox >= 0) {
            stylesheet.deleteRule(insertedStyleRuleIndexForDayBox);
        }
        insertedStyleRuleIndexForDayBox = -1;
        return;
    }
    if (insertedStyleRuleIndexForDayBox < 0)
        insertedStyleRuleIndexForDayBox = stylesheet.insertRule(".day.box { }", stylesheet.cssRules.length);
    var styleRule = stylesheet.cssRules[insertedStyleRuleIndexForDayBox];
    var h = 100 / count;
    styleRule.style.height = h + "%";
}

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

function initEventCalendarType() {
    $.each(localStorage.allTypes.split(":"), function() {
        $("#eventCalendarType").append("<option value='" + this + "'>" + this + "</option>");
    })
}

function closeDialog(){
    $("#eventOverlay").removeClass("show");
    $("#gridView").removeClass("inactive");

}

function initMonthOnDisplay() {
    monthOnDisplay = CalendarState.currentMonth();
    monthOnDisplayUpdated();
    getSelectedColor();
    if (localStorage.allTypes == undefined) {
        localStorage.allTypes = "";
    }
    initColorBox();
    initEventCalendarType();
}

function monthOnDisplayUpdated() {
    document.getElementById("monthTitle").innerText = monthStrings[monthOnDisplay.getMonth()] + " " + monthOnDisplay.getFullYear();
    CalendarState.setCurrentMonth(monthOnDisplay.toString());
    initDaysGrid();
    ReminderDatabase.openReminderEvents();
}

function addType() {
    var value = $("#newTypeValue").val();
    $("#newTypeValue").val("");
    var content = "<li onclick='calendarSelected(event)'><span class='colorIndicator' style='" + seletedColor + "'></span><input type='checkbox' id='" + value + "' onchange='calendarClicked(event)'>" + value + "</li>";
    localStorage.allTypes += value + ":";
    localStorage.setItem(value, content);
    localStorage.setItem(value + "_color", seletedColor);
    $("#calendarList").append(content);
    $("#eventCalendarType").append("<option value='" + value + "'>" + value + "</option>");
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
    updateCalendarRowCount(rows);
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

function removeEventsOfCalendarType(calendarType) {
    var daysGridElement = document.getElementById("daysGrid");
    var dayElements = daysGridElement.childNodes;
    for (var i = 0; i < dayElements.length; i++) {
        var dayObj = dayObjectFromElement(dayElements[i]);
        if (!dayObj)
            continue;
        dayObj.hideEventsOfCalendarType(calendarType);
    }
}

function pageLoaded() {
    document.getElementById("gridView").addEventListener("selectstart", stopEvent, true);
    document.getElementById("searchResults").addEventListener("selectstart", stopEvent, true);
    document.body.addEventListener("keyup", keyUpHandler, false);

    var calendarCheckboxes = document.getElementById("calendarList").getElementsByTagName("INPUT");
    for (var i = 0; i < calendarCheckboxes.length; i++)
        calendarCheckboxes[i].checked = CalendarState.calendarChecked(calendarCheckboxes[i].id);
    initMonthOnDisplay();
}

function previousMonth() {
    monthOnDisplay.setMonth(monthOnDisplay.getMonth() - 1);
    monthOnDisplayUpdated();
}

function nextMonth() {
    monthOnDisplay.setMonth(monthOnDisplay.getMonth() + 1);
    monthOnDisplayUpdated();
}

function calendarSelected(event) {
    if (event.target.tagName == "INPUT" || selectedCalendarType == "")
        return;

    var oldSelectedInput = document.getElementById(selectedCalendarType);
    var oldListItemElement = oldSelectedInput.findParentOfTagName("LI");
    oldListItemElement.removeStyleClass("selected");
    event.target.addStyleClass("selected");
    selectedCalendarType = event.target.getElementsByTagName("INPUT")[0].id;
}

function calendarClicked(event) {
    if (event.target.tagName != "INPUT")
        return;
    var calendarType = event.target.id;
    var checked = event.target.checked;
    CalendarState.setCalendarChecked(calendarType, checked);
    if (checked)
        addEventsOfCalendarType(calendarType);
    else
        removeEventsOfCalendarType(calendarType);
}

function keyUpHandler(event) {
    switch (event.keyIdentifier) {
        case "U+007F":   // Delete key
            if (selectedCalendarEvent && selectedCalendarEvent.day)
                selectedCalendarEvent.day.deleteEvent(selectedCalendarEvent);
            break;
        default:
            break;
    }
}

function eventDetailsDismissed() {
    if (selectedCalendarEvent) {
        var listItemNode = selectedCalendarEvent.listItemNode;
        if (listItemNode != null) {
            listItemNode.removeStyleClass("selected");
            selectedCalendarEvent.detailsUpdated();
        }
    }
    closeDialog();
    selectedCalendarEvent = null;
    $("#gridView").removeClass("inactive");
}

function searchForEvent(query) {
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