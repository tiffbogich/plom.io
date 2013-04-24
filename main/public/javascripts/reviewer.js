function Reviewer(tpl, model, theta){

  this.context_id = model.context._id;
  this.process_id = model.process._id;
  this.link_id = model.link._id;
  
  if(theta){
    this.theta_id = theta._id;
  }

  this.name = {
    disease: model.context.disease,
    context: model.context.name,
    process: model.process.name,
    link: model.link.name
  }

  this.render = _.template(tpl);
};

/**
 * Adds relevant _id and name component to obj depending on its type
 */
Reviewer.prototype.customize = function(obj, $form){

  obj.context_id = this.context_id;
  obj.process_id = this.process_id;
  obj.link_id = this.link_id;
  obj.name = this.name;

  if(obj.type === 'theta'){
    obj.theta_id = this.theta_id;
  } else if (obj.type === 'prior'){    
    obj.prior_id = $form.find( 'input[name="id"]' ).val();
    obj.name.parameter = $form.find( 'input[name="parameter"]' ).val();
    obj.name.group = $form.find( 'input[name="group"]' ).val();
  } else if (obj.type === 'posterior'){
    obj.prior_id = $form.find( 'input[name="id"]' ).val();
    obj.name.parameter = $form.find( 'input[name="parameter"]' ).val();
    obj.name.group = $form.find( 'input[name="group"]' ).val();
  } else if (obj.type === 'reaction'){
    obj.reaction_id = parseInt($form.find( 'input[name="id"]' ).val(), 10);
  } else if (obj.type === 'observed'){
    obj.observed_id = $form.find( 'input[name="id"]' ).val();
  }

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


Reviewer.prototype.update = function(theta){
  this.theta_id = theta.id;  
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
    this.customize(data);
  }

  $.ajax(url, {
    data : JSON.stringify(data),
    contentType : 'application/json',
    type : 'POST',
    success: function(reviews){
      $body.val('');
      $(that.threadId(reviews.reviews[0])).html(that.render(reviews));
    }
  });  
};
