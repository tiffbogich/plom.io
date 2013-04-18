//set the active class of the navbar
$(document).ready(function() {
    var pathname = window.location.pathname;

    $('ul.nav li').removeClass('active');

    var root = '/' + pathname.split('/')[1];
    $('ul.nav a[href= "' + root + '"]').parent().addClass('active');
})
