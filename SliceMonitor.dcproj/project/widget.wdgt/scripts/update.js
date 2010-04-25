var version_url = 'http://luddep.se/static/slicemonitor.txt',
    version = '1.1.4',
    regexp = /\./g

// Function: checkForUpdate();
// checks for a new version of the widget
function checkForUpdate() {
    $.get(version_url, {}, function(data, textStatus) {
        
        latest = data.replace(regexp, '');
        current = version.replace(regexp, '');
        
        alert('latest: '+latest+', current: '+current);
    
        if(parseInt(latest) > parseInt(current)) {
            alert('Update available');
            var update_url = "javascript:widget.openURL('http://luddep.se/slicemonitor/');"
            $('div#back_message').html('<span class="update" onclick="'+update_url+'">Update available</span>');
        } else {
            alert('Up to date');
        }
    });
}