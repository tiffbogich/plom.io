function Reviewer(tpl){
  this.render = _.template(tpl);
};

/**
 * get thread id
 */
Reviewer.prototype.threadId = function(review){

  if(review.type === 'theta'){
    return '#threadTheta';
  } else if (review.type === 'prior'){    
    return '#threadPrior' + review.prior_id;
  } else if (review.type === 'posterior'){
    return '#threadPosterior' + review.prior_id;
  } else if (review.type === 'reaction'){
    return '#threadReaction' + review.reaction_id;
  } else if (review.type === 'observed'){
    return '#threadObserved' + review.observed_id;
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
      var threadId = that.threadId(reviews.reviews[0]);
      console.log(threadId);
      console.log(reviews.reviews);
      $(threadId).html(that.render(reviews));
    }
  });  
};
