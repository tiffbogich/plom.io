function Reviewer(tpl){
  this.tpl = _.template(tpl);

  var that = this;
  //suscribe
  ['theta', 'prior', 'posterior', 'reaction', 'observed'].forEach(function(type){
    $.subscribe(type, function(e, id){
      $.getJSON('/review/' + type + '/' + id, that.render.bind(that));
    });
  });

};

/**
 * get thread id
 */
Reviewer.prototype.threadId = function(type, id){

  if(type === 'theta'){
    return '#threadTheta';
  } else if (type === 'prior'){    
    return '#threadPrior' + id;
  } else if (type === 'posterior'){
    return '#threadPosterior' + id;
  } else if (type === 'reaction'){
    return '#threadReaction' + id;
  } else if (type === 'observed'){
    return '#threadObserved' + id;
  }

};

Reviewer.prototype.render = function(reviews){
  if(reviews.reviews.length){
    var threadId = this.threadId(reviews.reviews[0].type, reviews.reviews[0].id);
    $(threadId).html(this.tpl(reviews));

    $('.collapse-comment').on("show",function(e){
      e.stopPropagation();
    });

  }
};


Reviewer.prototype.post = function($form){
  var that = this;

  var url = $form.attr('action')
    , $body = $form.find( 'textarea[name="body"]')
    , type = $form.find( 'input[name="type"]' ).val();

  var data = {
    type: type,
    status: $form.find( 'input[name="status"]:checked' ).val(),
    body: $body.val(),
    _csrf: $form.find( 'input[name="_csrf"]' ).val(),
  };

  var review_id = $form.find( 'input[name="review_id"]' ).val();
  if(review_id){ //we indeed post a comment
    data.review_id = review_id;
    data.change = $form.find( 'input[name="change"]:checked' ).val();
  } else {
    data.id = $form.find( 'input[name="id"]' ).val();

    if(data.type !== 'theta'){
      data.parameter = $form.find( 'input[name="parameter"]' ).val();
      data.group = $form.find( 'input[name="group"]' ).val();
    }
  }

  $.ajax(url, {
    data : JSON.stringify(data),
    contentType : 'application/json',
    type : 'POST',
    success: function(reviews){
      $body.val('');
      that.render(reviews);
    }
  });  
};
