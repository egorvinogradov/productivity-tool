
function setValuesFromGetParams(){
  let params = {};
  window.location.search
    .replace(/^\?/, '')
    .split('&')
    .forEach(function(pair){
      var key = pair.split('=')[0];
      var value = pair.split('=')[1];

      if (key === 'currentProductiveHours') {
        params.currentProductiveHours = +value.split(':')[0];
        params.currentProductiveMinutes = +value.split(':')[1];
      }
      else if (key === 'currentUnproductiveHours') {
        params.currentUnproductiveHours = +value.split(':')[0];
        params.currentUnproductiveMinutes = +value.split(':')[1];
      }
      else if (key) {
        params[key] = +value;
      }
    });



  if (Object.keys(params).length) {
    $('#desiredProductivity').focus();
  }
  
  for (var key in params) {
    if (key) {
      $(`#${key}`).val(params[key]);
    }
  }
}


function calcProductivity(){
  let currentProductiveHours = +$('#currentProductiveHours').val();
  let currentProductiveMinutes = +$('#currentProductiveMinutes').val();
  let currentUnproductiveHours = +$('#currentUnproductiveHours').val();
  let currentUnproductiveMinutes = +$('#currentUnproductiveMinutes').val();

  let desiredProductivity = +$('#desiredProductivity').val() / 100;
  let plannedHoursPerDay = $('#plannedHoursPerDay').val();
  let totalExpectedDistraction = $('#totalExpectedDistraction').val();

  if (plannedHoursPerDay === '') {
    plannedHoursPerDay = 15;
  }
  if (totalExpectedDistraction === '') {
    totalExpectedDistraction = 2;
  }
  plannedHoursPerDay = +plannedHoursPerDay;
  totalExpectedDistraction = +totalExpectedDistraction;

  if (currentProductiveMinutes) {
    currentProductiveHours = currentProductiveHours + (currentProductiveMinutes / 60);
  }
  if (currentUnproductiveMinutes) {
    currentUnproductiveHours = currentUnproductiveHours + (currentUnproductiveMinutes / 60);
  }
  let hoursNeeded = getHoursNeededForDesiredProductivity(desiredProductivity, currentProductiveHours, currentUnproductiveHours);
  let minutesNeeded = Math.floor((hoursNeeded % 1) * 60);
  hoursNeeded = Math.floor(hoursNeeded);

  let maxProductivity = getMaxProductivityThisWeek(currentProductiveHours, currentUnproductiveHours, plannedHoursPerDay, totalExpectedDistraction);
  $('#hoursNeededForDesiredProductivity').text(`${hoursNeeded}h ${minutesNeeded}min`);
  $('#maxProductivityThisWeek').text((maxProductivity * 100).toFixed(2) + '%');
}


function getHoursNeededForDesiredProductivity(desiredProductivity, currentProductiveHours, currentUnproductiveHours) {
  return (desiredProductivity * currentUnproductiveHours / (1 - desiredProductivity)) - currentProductiveHours;
}


function getMaxProductivityThisWeek(currentProductiveHours, currentUnproductiveHours, plannedHoursPerDay, totalExpectedDistraction){
  const today = new Date();
  const todayDayIndex = today.getDay();

  let endOfWeek = new Date();
  endOfWeek.setMinutes(59);
  endOfWeek.setHours(23);

  let hoursLeft = (endOfWeek - today) / 1000 / 60 / 60;
  let daysLeft = 0;
  if (todayDayIndex) {
    daysLeft = 7 - todayDayIndex;
    hoursLeft = hoursLeft + daysLeft * plannedHoursPerDay;
  }
  return (currentProductiveHours + hoursLeft) / (currentProductiveHours + currentUnproductiveHours + hoursLeft + totalExpectedDistraction);
};


function calcRange(str){
  const range = str.replace(/([0-9]+)([a-z]+)/g, '$1-$2').split('-');
  if (range[1] === 'm' || range[1] === 'min') {
    return +range[0];
  }
  else if (range[1] === 'h') {
    return +range[0] * 60;
  }
  if (range[1] === 'd') {
    return +range[0] * 60 * 24;
  }
  else {
    return 0;
  }
}


function formatTime(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  let ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0'+minutes : minutes;
  return hours + ':' + minutes + ' ' + ampm;
}


function parseTodoRow(row){
  row = row.trim();
  let data = {};
  if (/^\-\s[0-9]+\/[0-9]+\/[0-9]+\s\[[\s]\]/i.test(row) || /^([0-9]+[a-z]+)\s?([0-9]+[a-z]+)?\s+/i.test(row)) {
    let vals = row
      .replace(/^(?:\-\s+)?(?:[0-9]+\/[0-9]+\/[0-9]+\s\[[\s]\]\s)?([0-9]+[a-z]+)\s?([0-9]+[a-z]+)?\s+(.+)$/i, '@@@$1@@@$2@@@$3@@@')
      .split(/[@]{3,}/g)
      .filter(s => s);

    if (vals.length === 2) {
      data.minutes = calcRange(vals[0]);
      data.timeStr = vals[0];
      data.text = vals[1];
    }
    else if (vals.length === 3) {
      data.minutes = calcRange(vals[0]);
      data.minutes += calcRange(vals[1]);
      data.timeStr = vals[0] + ' ' + vals[1];
      data.text = vals[2];
    }

    if (data.text) {
      data.text = data.text.replace(/\s*\([^\)]*$/, '');
      console.log('-', vals, data);
    }
  }
  return data;
}


function calcTime(text){
  let minutesTotal = 0;
  const items = text.split(/\n/)
    .map(parseTodoRow)
    .filter(row => row && row.text && row.minutes);
  
  items.forEach(row => { minutesTotal += row.minutes; });

  const breakMinutes = Math.round((minutesTotal / 52) * 15);
  const minutesWithBreaksTotal = breakMinutes + minutesTotal;
  const endTime = new Date(+new Date() + (minutesTotal * 60 * 1000));
  const endWithBreaksTime = new Date(+new Date() + ((minutesTotal + breakMinutes) * 60 * 1000));
  
  const total = Math.floor(minutesTotal / 60) + 'h ' + (minutesTotal % 60) + 'm';
  const totalWithBreaks = Math.floor(minutesWithBreaksTotal / 60) + 'h ' + (minutesWithBreaksTotal % 60) + 'm';
  const updatedTodos = items.map(item => `${item.timeStr} ${item.text}`).join('\n') + '\n';
  window.items = items;

  $('#total').html(`Approx. ${totalWithBreaks} (${total} exactly)`);
  $('#current').html(`Now: ${formatTime(new Date())}`);
  $('#finish').html(`Exact Finish: ${formatTime(endTime)}`);
  $('#breaks').html(`Estimate Finish: ${formatTime(endWithBreaksTime)}`);

  $('#todoTextarea').val(updatedTodos);
}


function onInit(){
  setTimeout(() => {
    calcTime($('#todoTextarea').val().trim());
  }, 100);
}


function clearText(){
  $('#todoTextarea').val('');
}


console.log('Init app');
setValuesFromGetParams();

$('#calcTodosButton').on('click', onInit);
$('#calcProductivityButton').on('click', calcProductivity);
$('#todoTextarea')
  .on('paste', onInit)
  .on('drop', onInit);

$('#productivity').on('submit', (e) => {
  e.preventDefault();
  calcProductivity();
});


/*  
window.onbeforeunload = function(){
  return true;
}
*/
