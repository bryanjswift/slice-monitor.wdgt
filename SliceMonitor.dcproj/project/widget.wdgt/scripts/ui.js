// Set up all the JQuery UI components
function UISetUp()
{
    $("#slices").sortable({ 
        forcePlaceholderSize: true,
        cursor: 'move',
        scroll: false,
        start: function(event, ui) {
            $(ui.helper).addClass('helper');
        },
    });
    
    alert('UISetUp: successful');
}