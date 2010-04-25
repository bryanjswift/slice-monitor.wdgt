/*
    # Constants #
*/
// Front heights
var widgetWidth = 414;
var widgetHeight = 78;
var blockHeight = 56;

// Back heights
var backHeight = 190;

// Slices height
var sliceListHeight = 18;

// Misc
var animationSpeed = 300;
var isFront = true;
var shows = 0;
var ajaxRunning = false;

// Lists
var allSlices = []
var selectedSlices = []

// Data
var data = '';
var imageTypes = {};

// API URL
var api_url = 'https://api.slicehost.com/slices.xml';
var image_api_url = 'https://api.slicehost.com/images.xml';
var test_url = false;
//var test_url = 'http://dl-client.getdropbox.com/u/24582/test.xml';

/*
    # Data fetch functions #
*/

// Function: fetchData()
// queries slicehost for the xml data
function fetchData(callback, side) {
    
    // Development settings
    if(test_url) {
        url = test_url;
        apiKey = null;
        
    // Live settings
    } else {
        url = api_url
        apiKey = getPref('apiKey');
    }
    
    // debug
    alert('Initiated ajax request ('+side+') to: '+url);
    
    // Clear message
    $('div#back_message').html('');
    
    // Get the spinner for this side
    spinner = $('img#'+side+'_spinner');
    
    // If there are no sliceblocks, use the dark spinner & fade it a bit
    // But only if we are at the front
    if(side == 'front' && $('div#content').children().length == 0) {
        spinner
            .attr('src', 'gfx/spinners/front_dark.gif')
            .css('opacity', 0.5);
    } else {
        spinner
            .attr('src', 'gfx/spinners/front.gif')
            .css('opacity', 1);
    }
    
    // Show the spinner
    $('img#'+side+'_spinner').show();
    
    // Run ajax
    $.ajax({
        type: "GET",
        username: apiKey,
        password: apiKey,
        url: url,
        beforeSend: function(XMLHttpRequest) {
            if(window.ajaxRunning == true) {
                alert('AJAX is already running, terminating call');
                return false;
            } else {
                // Tell any other request that we are already running
                window.ajaxRunning = true;
                
                alert('No ajax is running');
            }
        },
        success: callback,
        error: function(XMLHttpRequest, textStatus, errorThrown) {
            if(textStatus == 'timeout') {
                $('div#back_message').html('Timeout error: (recheck API Key?)');
            } else {
                $('div#back_message').html('Error: '+textStatus);
                if (window.isFront) {
                    showBack();
                }
            }
            
            alert('AJAX error: '+textStatus);
            
            // Ajax stopped.
            window.ajaxRunning = false;
            
            // Stop spinner
            $('img#'+side+'_spinner').hide();
        },
        complete: function (XMLHttpRequest, textStatus) {
            // Stop spinner
            $('img#'+side+'_spinner').hide();
            
            // Tell requests that we are finished
            window.ajaxRunning = false;
            
            alert('Finished ajax request ('+side+')');
            
            slices_fetched = $('slice', window.data).length
            if (slices_fetched == 0 && textStatus != 'timeout') {
                alert('No slice was fetched, something went wrong on the slicehost api.');
                if (isFront) {
                    showBack();
                }
                $('div#back_message').html('API Error: no slices were found.')
            }
        },
        timeout: 10000,
     });
}

// Function: fetchImageTypes()
// Setup an object with Image-Id to Image name
function fetchImageTypes() {
    var apiKey = getPref('apiKey');
    alert('Fetching Image Types');
    if (apiKey) {
        $.ajax({
            type: 'GET',
            username: apiKey,
            password: apiKey,
            url:image_api_url,
            error: function() {
                alert('Error retrieving image data.. uhoh..');
            },
            success: function(data,status) {
                alert('Image types fetched.. processing ' + $(data).find('image').length + ' types');
                $(data).find('image').each(function() {
                    var image = $(this);
                    imageTypes[image.find('id[type=integer]').text()] = image.find('name').text();
                });
            }
        });
    }
}

// Function: resetAjax()
// Resets the ajax vars & hides any spinners.
function resetAjax() {
     // Reset the ajax parts
    window.ajaxRunning = false;
    $('img#front_spinner, img#back_spinner').hide();
}

// Function: checkForError(data)
// Used to check if there was an error on slicehosts part
function checkForError(data) {
    alert('checking for errors:'+$('slice', data).length);
}

// Function: fetchSlices()
// Used by 'Fetch slices' button to get slices from API
function fetchSlices() {
    
    $('div#slicesLabel').css('opacity', '1');
    apiKeyField = $('input#apiKeyField');
    
    // simple length check
    if(apiKeyField.val().length >= 1) {
        // Save API key to preferences
        setPref('apiKey', apiKeyField.val());

        // Fetch Data
        fetchImageTypes();
        fetchData(populateSliceList(), 'back');
    }
}

// Function: updateStatus()
// Updates the status of the slices
function updateStatus() {
    // Fetch Data
    fetchData(function(data, textStatus) {
            // Update data var
            window.data = data;
            
            // Rebuild front
            buildFrontSliceList(data)
        },
        'front'
    );
}

/*
    # Data manipulation #
*/

// Function: saveSliceOrder()
// Saves the current slice order.
function saveSliceInfo()
{
    // Save order
    /*order = $('ul#slices').sortable('toArray');*/

    order = []
    $("input[type=checkbox]").each(function(i) {
        order[i] = $(this).val();
    });
    setPref('sliceOrder', order);
    alert('Saving slice order: '+order);
    
    // Save selected slices
    selectedSlicesList = []
    $("input:checked").each(function(i) {
        selectedSlicesList[i] = slugify($(this).val());
    });
    setPref('selectedSlicesList', selectedSlicesList);
    alert('Selected slices: '+selectedSlicesList);
}

/*
    # Back manipulation functions #
*/

// Function: activateFetchSlicesButton()
// Used by apiKeyField to enable the fetch slices button
function activateFetchSlicesButton(data, textStatus)
{
    // simple length check
    if($('input#apiKeyField').val().length >= 1) {
        $('div#fetchSlicesButton').css('opacity', '1');
    } else {
        $('div#fetchSlicesButton').css('opacity', '0.5');
    }
}

// ### DATA CALLBACK
// Function: populateSliceList()
// Populates the list of slices in back
function populateSliceList()
{
    return function(data, textStatus) {
    
        // vars
        window.data = data;
        var slices = $('ul#slices');
        var slices_list = [];
    
        // Clear current list
        slices.html('')
    
        $('slice', data).each(function(i){
            name = $(this).find('name').text()
        
            // Assign to slice_list
            slices_list[i] = name;
        
            // Add to slices
            slices.append('<li id="'+slugify(name)+'"><input type="checkbox" id="'+slugify(name)+'-checkbox" checked="checked" value="'+name+'" /> <span>'+name+'</span></li>');
        });
        
        alert('back slices data: '+slices.html());
    
        // Save slices_list to preferences
        setPref('slices_list', slices_list);
        
        // Resize back
        rows = Math.ceil(slices_list.length / 3)-1
        if(backHeightPreference = getPref('backHeight')) {
            from = backHeightPreference;
        } else {
            from = backHeight;
        }
        to = (rows*(sliceListHeight))+backHeight;
        
        alert(to+' - '+from);

        if(from == to) {
            alert('No need to resize');
            
            // Save new back height
            setPref('backHeight', to);
            
        } else if(to < backHeight) {
            alert('too small back resize, reverting back to default');
            
            // Resize
            window.resizeTo(widgetWidth, backHeight); 
            
        } else {
            // Resize
            widgetAnimationResizer(from, to);
            
            // Save new back height
            setPref('backHeight', to);
        }
        
        // Refresh sortables
        $('ul#slices').sortable('refresh');
        
        // Show done button
        $('div#done').show();
        
        alert('Successfully populated back slice list');
    }
}

// Function: populateSliceListFromPreference()
// Populates the list of slices in back from saved preferences
function populateSliceListFromPreference(data)
{
        // vars
        var slices = $('ul#slices');
        var slices_temp = $('div#slices-temp');
        var slices_list = [];
        var selectedSlicesList = getPref('selectedSlicesList');
        
        alert('data:'+data);
    
        // Add to temp
        $('slice', data).each(function(i){
            name = $(this).find('name').text()
        
            // Assign to slice_list
            slices_list[i] = name;
        
            // Add to slices
            slices_temp.append('<li id="'+slugify(name)+'"><input type="checkbox" id="'+slugify(name)+'-checkbox" value="'+name+'" /> <span>'+name+'</span></li>');
            alert('Added "'+name+'" to slice temp');
        });

    
        // Set boxes to checked
        checkboxes = $('input[type=checkbox]');
        checkboxes.each(function() {
            if(selectedSlicesList.inArray(slugify($(this).val()))) {
                $(this).attr('checked', 'checked');
            }
        });
        // Can't use this ..
        //$('input[type=checkbox]').val(selectedSlicesList)

        alert('slices temp value: '+slices_temp.html());
        
        // Fetch from preferences
        slicesListPreference = getPref('sliceOrder');
        
        // Insert into list
        for(i = 0; i < slicesListPreference.length; i++) {
            current = slicesListPreference[i]
            $('div#slices-temp li#'+slugify(current)).appendTo('ul#slices');
            alert('re-added "'+current+'" to slice list');
        }
        
        alert('slices list value: '+slices.html());
        
        // Refresh sortables
        $('ul#slices').sortable('refresh');
        
        alert('Successfully re-populated back slice list');

}

/*
    # Front manipulation functions #
*/

// Function: buildFrontSliceList()
// Build the list of slices on the front
function buildFrontSliceList(preData)
{
    alert('Building front slice list');
    
    if(preData) {
        alert('Building from given data');
        data_to_use = preData;
    } else {
        alert('data: '+data);
        data_to_use = data;
    }

    content = $('div#content');
    selectedSlicesList = getPref('selectedSlicesList');
    
    // Clear list
    content.html('');
    
    // Add HTML to temp
    $('slice', data_to_use).each(function(i){
        name = $(this).find('name').text()
        
        alert('slugged: '+name+' ('+slugify(name)+'), selected: '+selectedSlicesList);
        
        // Check if this slice is selected
        if(selectedSlicesList.inArray(slugify(name))) {
            
            status = $(this).find('status').text();
            bw_in = $(this).find('bw-in').text();
            bw_out = $(this).find('bw-out').text();
            bw_iototal = fixAtTwo(parseFloat(bw_in) + parseFloat(bw_out));
            bw_available = $(this).find('progress').text();
            image_id = $(this).find('image-id').text();
            var type = '<span class="dash"> &mdash; </span><span class="type">' + (imageTypes[image_id] ? imageTypes[image_id] : 'Not found') + '</span>';
            alert('type: ' + type);
        
            // Build sliceblock
            sliceblock = $('<div class="sliceblock" id="'+slugify(name)+'"></div>')
                            .append($('<div class="indicator '+status+'"></div>'))
                            .append($('<div class="header"><span class="name">'+name+'</span><span class="dash">&mdash;</span><span class="addresses"></span>' + type + '</div>'))
                            .append($('<div class="stats"><span class="status">'+
                                      '<label>Status:</label> '+status+'</span>'+
                                      '<span class="bw">'+
                                        '<label>Bandwidth:</label> ' + bw_iototal + '/' + bw_available + 'GB '+
                                        '<span class="in_out">('+bw_in+' in / '+bw_out+' out)</span>'+
                                      '</span></div>'));
            
            // Add addresses
            addresses = $('span.addresses', sliceblock);
            $('address', $(this).find('addresses')).each(function(i){
                if (i == 0) {
                    addresses.text($(this).text());
                } else {
                    addresses.append(', '+$(this).text());
                }
            });

            // Set up bandwidth in & out fader
            $('div.stats', sliceblock).hover(
                function() {
                    $('span.in_out', this).fadeIn(100);
                },
                function() {
                    $('span.in_out', this).fadeOut(100);
                }
            );
            
            // Add to temp
            $('div#temp').append(sliceblock);
            
            alert('... added '+slugify(name)+' to temp.');
        }
    });

    alert('Populated temp: '+$('div#temp').html());

    // Populate content
    for(i = 0; i < selectedSlicesList.length; i++) {
        current = selectedSlicesList[i]
        slice = $('div#temp div#'+current);
        clone = slice.clone(true);
    
        // Remove the one in temp
        slice.remove();
        
        if (i == 0) {
            clone.addClass('first')
        }
        
        clone.appendTo('div#content');
        alert('.. appending '+current+', ('+slugify(current)+') to content.');
    }
    
    alert('Populated content: '+$('div#content').html());

    // Update size
    if (preData) {
        updateFrontSize(true);
    } else {
        updateFrontSize();
    }
}


/*
    # Resize functions #
*/

// Function: widgetResizer(to)
// Resizes the widget instantly
function widgetResizer(to)
{
    alert('Resizing widget to: '+to);

    // Resize
    window.resizeTo(widgetWidth, parseInt(to));
}

// Function: widgetAnimationResizer(from, to)
// Resizes the widget in an animation
function widgetAnimationResizer(from, to)
{
    // Debug
    alert('Resizing widget (animation); from: '+from+', to: '+to+' - with speed: '+animationSpeed);
    
    // Build animation
    animator = new AppleAnimator(animationSpeed, 13);
    animation = new AppleAnimation(from, to, handler);
    animator.addAnimation(animation);

    // Handler, gets called whenever the animation fires
    function handler(animation, current, start, finish)
    {
        //$('div#frontWrap').css('height', current);
        window.resizeTo(widgetWidth, to);
    }

    // Start animation
    animator.start();
    
}

// Function: updateFrontSize()
// resizes the front based on how many sliceblocks there are.
function updateFrontSize(firstLoad)
{
    // Check to make sure that we don't resize the widget to the
    // fronts dimensions when we are on the back.
    if(window.isFront) {
        // Set up vars
        sliceblocks = $('div#content div.sliceblock');
        count = sliceblocks.length-1;

        // Count blocks
        alert('Amount of slices:'+(count+1));
        
        // Check if a new height has already been set
        widgetHeightPreference = getPref('widgetHeight')
        if(widgetHeightPreference && !firstLoad) {
            alert('Not first load..')
            from = widgetHeightPreference;
            to = (count*blockHeight) + widgetHeight;
        } else {
            alert('Is first load..')
            from = widgetHeight;
            to = (count*blockHeight) + widgetHeight;
        }
        
        alert('resize from: '+from+', to: '+to)
        alert('math: ('+count+'*'+blockHeight+')+'+widgetHeight+' = '+to)
        
        // Don't resize the widget to smaller than backHeight
        if(to < backHeight) {
            widget_to = backHeight;
        } else {
            widget_to = to;
        }
        
        //if (from == to) {
        //    alert('No need to resize front, from updateFrontSize()');
        
        if(to < widgetHeight) {
            alert('Too small front resize, reverting back to default');
            
            // Resize widget first
            window.resizeTo(widgetWidth, backHeight); 
            $('div#frontWrap').css('height', widgetHeight);
            
            // Show back and print error
            //$('div#back_message').html('Error: '+(count+1)+' slices found.')
            //showBack();
            
        } else {
            // Resize widget first
            window.resizeTo(widgetWidth, widget_to);
        
            // Save new widget heght
            setPref('widgetHeight', widget_to);
        
            // Resize front
            //widgetAnimationResizer(from, to);
            alert('Resizing front to: '+to);
            $('div#frontWrap').css('height', to);
        }
    }
}



/* 
 */

//
// Function: load()
// Called by HTML body element's onload event when the widget is ready to start
//
function load()
{
    alert(' --- ');
    alert('Load!');
    alert('');
    
    // Check for update
    checkForUpdate();
    
    // Apple setup
    dashcode.setupParts();

    // SliceMonitor setup
    UISetUp();

    // An API key has been saved
    if(apiKey = getPref('apiKey')) {
        alert('api key set:'+apiKey);

        // Fill in API Key
        $('input#apiKeyField').val(apiKey);

        // fetch new data
        fetchData(function(data, textStatus){
            window.data = data;
            
            checkForError(data);
            
            // check
            if(getPref('selectedSlicesList')) {
                // Rebuild front
                buildFrontSliceList(data);

                // Rebuild back
                populateSliceListFromPreference(data);

            } else {
            
                // Hide done button
                $('div#done').hide();
            
                // No slice list has been built before
                showBack();
                
                // There is an api key but no saved slices, so highlight the fetch slices button
                $('div#fetchSlicesButton').css('opacity', '1');
            }
            
        }, 'front');
    
    // No api key
    } else {
        alert('api key has NOT been set, showing back.');
        
        // Fade slice label
        $('div#slicesLabel').css('opacity', '0.5');
        
        // Hide done button
        $('div#done').hide();
        
        // Show back
        setTimeout('showBack();', 300);
    }
}

//
// Function: remove()
// Called when the widget has been removed from the Dashboard
//
function remove()
{
    setPref('widgetHeight', null);
    setPref('backHeight', null);
    setPref('apiKey', null);
    setPref('slices_list', null);
    setPref('selectedSlicesList', null);
}

//
// Function: hide()
// Called when the widget has been hidden
//
function hide()
{
    // Reset the ajax vars
    resetAjax();
}

//
// Function: show()
// Called when the widget has been shown
//
function show()
{
    if(getPref('apiKey')) {
        // not on first show
        if (window.shows > 0 && isFront) {
            // Update status
            updateStatus();
            
            alert('Updating status ('+window.shows+')')
        } else {
            alert('Not updating status, first show ('+window.shows+')');
        }
    }
    
    window.shows++;
}

//
// Function: sync()
// Called when the widget has been synchronized with .Mac
//
function sync()
{
    // Retrieve any preference values that you need to be synchronized here
    // Use this for an instance key's value:
    // instancePreferenceValue = widget.preferenceForKey(null, dashcode.createInstancePreferenceKey("your-key"));
    //
    // Or this for global key's value:
    // globalPreferenceValue = widget.preferenceForKey(null, "your-key");
}

//
// Function: showBack(event)
// Called when the info button is clicked to show the back of the widget
//
// event: onClick event from the info button
//
function showBack(event)
{
    window.isFront = false;
    
    // Reset the ajax vars
    resetAjax();

    var front = document.getElementById("front");
    var back = document.getElementById("back");

    if (window.widget) {
        widget.prepareForTransition("ToBack");
    }

    front.style.display = "none";
    back.style.display = "block";

    if (window.widget) {
        setTimeout('widget.performTransition();', 0);
    }
    
    // Resize widget
    backHeightPreference = getPref('backHeight');
    if(backHeightPreference && parseInt(backHeightPreference) > backHeight) {
        to = backHeightPreference;
    } else {
        to = backHeight;
    }
    widgetResizer(to);
}

//
// Function: showFront(event)
// Called when the done button is clicked from the back of the widget
//
// event: onClick event from the done button
//
function showFront(event)
{
    // Reset the ajax vars
    resetAjax();

    // Check to see that atleast one slice has been selected
    if($('input:checked').length == 0) {
        $('div#back_message').html('Please select atleast 1 slice.');
    } else {
        $('div#back_message').html('');
        
        var front = document.getElementById("front");
        var back = document.getElementById("back");

        if (window.widget) {
            widget.prepareForTransition("ToFront");
        }

        front.style.display="block";
        back.style.display="none";

        if (window.widget) {
            setTimeout('widget.performTransition();', 0);
        }
        
        // Save slice order
        saveSliceInfo();
        
        // Update front
        //buildFrontSliceList();
        updateStatus();

        window.isFront = true;
    
    }
}

if (window.widget) {
    widget.onremove = remove;
    widget.onhide = hide;
    widget.onshow = show;
    widget.onsync = sync;
}


/*
    # Preference setters and getters #
*/

function getKey(key)
{
    return widget.identifier+'-'+key;
}

function getPref(key)
{
    key = getKey(key);
    preference = widget.preferenceForKey(key)
    
    if (preference) {
        alert('Fetched preference: '+key+', with value: '+preference);
        if (preference.indexOf(';;-;;')) {
            return preference.split(';;-;;');
        } else {
            return preference;
        }
    } else {
        return null;
    }
}

function setPref(key, content)
{
    key = getKey(key);
    if (content != null && isArray(content)) {
        widget.setPreferenceForKey(content.join(';;-;;'), key);
        alert('Set preference for key: '+key+', with value: '+content.join(';;-;;'));
    } else if(isInteger(content)) {
        widget.setPreferenceForKey(content.toString(), key);
        alert('Set preference for key: '+key+', with value: '+content.toString());
    } else {
        widget.setPreferenceForKey(content, key);
        alert('Set preference for key: '+key+', with value: '+content);
    }
}

function slugify(text)
{
    return hex_md5(text);
}

function textify(text)
{
    text = text.split(' ');
    return text.join('-');
}


/*
    # 3rd party functions #
*/

function isArray() {
    if (typeof arguments[0] == 'object') {
        var criterion =  arguments[0].constructor.toString().match(/array/i); 
        return (criterion != null);
    }
    return false;
}

function isInteger (s)
   {
      var i;

      if (isEmpty(s))
      if (isInteger.arguments.length == 1) return 0;
      else return (isInteger.arguments[1] == true);

      for (i = 0; i < s.length; i++)
      {
         var c = s.charAt(i);

         if (!isDigit(c)) return false;
      }

      return true;
   }

function isEmpty(s)
   {
      return ((s == null) || (s.length == 0))
   }

function isDigit (c)
   {
      return ((c >= "0") && (c <= "9"))
   }

Array.prototype.inArray = function (value)
    // Returns true if the passed value is found in the
    // array. Returns false if it is not.
    {
        var i;
        for (i=0; i < this.length; i++) {
            // Matches identical (===), not just similar (==).
            if (this[i] === value) {
                return true;
            }
        }
    return false;
    }

function fixAtTwo(anynum) 
{
	var numStr=anynum.toString();
	var decPos = numStr.indexOf(".");	
	if ( decPos == -1 )
		return numStr + ".00";
	else
	{
		// add two zeros to get at least two digits at the 
		// end of the string in case it ends at the decimal
		numStr += "00";	
		return numStr.substr(0,decPos+3);
	}
}
