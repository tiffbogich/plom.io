//set the active class of the navbar
$(document).ready(function() {
  var pathname = window.location.pathname;

  var root = '/' + pathname.split('/')[1];

  if(root !== '/review' && root !== '/requests'){
    $('ul.nav li').removeClass('active');
  }


  $('ul.nav a[href= "' + root + '"]').parent().addClass('active');
})
