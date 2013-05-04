/**
 * General idea: every time a csv is selected, it is immediately sent
 * to the server for validation. The server sends back the validated
 * data and a temporary path. The answer is stored in a hash (dataStore)
 * 
 * The final submission create a full context.json client side (using
 * the path stored) and send it to the server where the path are resolved.
 */


$(document).ready(function(){

  var dataStore = {};

  /**
   * err is an array of errors. 
   * value is the value to validate
   */
  var check = {
    name: function(value){ return (value && value.trim().split(' ').length === 1); },
    description: function(value){ return (value); },
    location: function(value){ return (value); }
  };

  function showError ($el){
    $el.closest('.control-group')
      .addClass('error')
      .find('.help-inline').show();
  };

  function hideError ($el){
    $el.closest('.control-group')
      .removeClass('error')
      .find('.help-inline').hide();
  };
  

  /**
   *  beforeSubmit callback of ajaxSubmit
   */
  function validate (arr, $form, options) { 
    var ok = true;

    arr.forEach(function(x){
      if(x.name in check){
        if(!check[x.name](x.value)){
          ok = false;
          //display errors:
          showError($form.find(':input[name=' + x.name + ']'));
        } else {
          hideError($form.find(':input[name=' + x.name + ']'));
        }
      }
    });
    
    if(!ok) {$form.find('input[type=file]').val('')};
    return ok;    
  }

  //hide error if fixed
  $('#templateContext').on('change', ':input[name=location], :input[name=description]', function(e){
    (check[$(this).attr('name')]($(this).val())) ? hideError($(this)) : showError($(this));
  })
    .on('keypress', function(e){ //prevent submission if enter is hit
      if (e.which == 13) {
        event.preventDefault();
      }
    });

  //keep the dataStore in sync
  $('#extra').on('focus', 'input[name=name]', function(e){
    //save previous value
    var $name = $(this);
    var name = $name.val();
    if(name){
      $name.data('name', name);
    }
    if (!(name in dataStore)) hideError($name);

  });

  $('#extraData, #extraMetaData').on('change', 'input[name=name]', function(e){
    //rename the datastore key if needed
    var $name = $(this);
    var name = $name.val();
    var previous = $name.data('name');    

    var ok = check['name'](name);
    (ok) ? hideError($name) : showError($name);

    if(!ok){
      $name.val(previous);
      return;
    }

    if( name === previous ){
      return;
    }

    //check name unicity
    (name in dataStore) ? showError($name) : hideError($name);


    if( (! (name in dataStore)) && (previous in dataStore)){
      //change data store key
      dataStore[name] = dataStore[previous];
      delete dataStore[previous];      
    } 
  });

  //desactivate click if greyed
  $('input[type=file]').on('click', function(e){
    if($(this).closest('.context-step').hasClass('greyed')){
      e.preventDefault();
    }
  });

  //autosubmit
  $('.context-step').on('change', 'input[type=file]', function(e){
    $(this).closest('form').trigger('submit');
  });



  $('#extraData, #extraMetaData').on('submit', 'form', function(e){      
    e.preventDefault();
    $(this).ajaxSubmit({
      beforeSubmit: validate,
      success: function(data, status, xhr, $form){
        if(!data.err){
          $form.prev('.alert').hide();
          var name = $form.find('input[name=name]').val();
          dataStore[name] = data.path;
        } else {
          $form.prev('.alert').show().find('span.error').html(data.err);
        }
      }
    });
  });

  //add remove diseases
  var $formtpl = $('.disease').clone();
  $('.remove-disease').remove();

  $('#formContext')
    .on('click', '.add', function(e){
      e.preventDefault();
      $(this).before($formtpl.clone());
    })
    .on('click', '.remove-disease', function(e){
      e.preventDefault();
      $(this).closest('.disease').remove();      
    });  

  //add remove extra data and metadata
  ['#extraData', '#extraMetaData'].forEach(function(id){
    var $formtpl = $(id).find('.replicate').hide().clone();

    $(id).on('click', '.add', function(e){
      e.preventDefault();
      if($(this).closest('.context-step').hasClass('greyed')){
        return;
      }
      $(this).before($formtpl.clone().show());

    });

    $(id).on('click', '.remove-form', function(e){
      e.preventDefault();
      if($(this).closest('.context-step').hasClass('greyed')){
        return;
      }
      var $form = $(this).closest('.replicate');
      var name = $form.find('input[name=name]').val();
      if (name in dataStore){
        delete dataStore[name];
      }
      $form.remove();
    });

  });


  //get the templates
  $.getJSON('/template/context', function(tpl){

    var pop, ts;

    $('#formContext').on('submit', function(e){      
      e.preventDefault();

      var $form = $(this);
      $(this).ajaxSubmit({
        beforeSubmit: validate,
        success: function(data) {
          if(!data.err){
            $form.prev('.alert').hide();
            $('#timeSeries').removeClass('greyed').find('.alert').hide();    
            $('#ts').empty();
            $('.replicate').remove();
            $('#formData input[type=file]').val('');
            $('#extra').addClass('greyed');
            pop = data.data[0].slice(1);
            dataStore.N = data.path;
            $('#population').html(_.template(tpl.pop)({population: data.data[0].slice(1)}));
          } else {
            $form.prev('.alert').show().find('span.error').html(data.err);
          }
        }
      });
    });

    $('#formData').on('submit', function(e){
      e.preventDefault();
      if($(this).closest('.context-step').hasClass('greyed')){
        return;
      }

      var $form = $(this);
      $(this).ajaxSubmit({
        success: function(data) {
          if(!data.err){
            $form.prev('.alert').hide();
            ts = data.data[0].slice(1);
            $('#ts').html(_.template(tpl.ts)({time_series: ts, population: pop}));
            $('#extra').removeClass('greyed');
            dataStore.data = data.path;

            $('.map').on('click', function(e){
              $($(this).toggleClass('active').attr('data-target')).collapse('toggle');
            });

            $( ".selectable" ).selectable({
              stop: function() {
                var cnt = 0;
                var $this = $(this);
                var result = $( $( ".select-result" ).get( $( ".selectable" ).index(this) ) ).empty();

                $( ".ui-selected", this ).each(function() {
                  var index = $this.find('li').index( this );
                  result.append( " #" + index );
                  cnt++;
                });

                //error msg
                (cnt) ? $this.closest('form').find('.text-error').hide() : $this.closest('form').find('.text-error').show();
              }
            });
          } else {
            $form.prev('.alert').show().find('span.error').html(data.err);          
          }
        }
      });
    });    


    //the actual submission
    $('#commitContext').on('submit', function(e){
      e.preventDefault();
      e.stopPropagation();

      var ok = true;
      var context = {       
        disease:[],
        population:[],
        time_series:[],
        frequency: $('select[name=frequency]').val(),
        data:[],
        metadata:[]
      };
      
      $('select[name=disease]').each(function(){
        context.disease.push($(this).val());
      });

      //add and validate context info
      var $form = $('#formContext');
      var $el, val;

      $el = $form.find('input[name=location]');
      val = $el.val();
      if(!check['location'](val)){
        ok = false;
        showError($el);
      } else {
        hideError($el);
        context.name = val;
      }

      $el = $form.find(':input[name=description]');
      val = $el.val();
      if(!check['description'](val)){
        ok = false;
        showError($el);
      } else {
        hideError($el);
        context.description = val;
      }

      //add populations
      $('#population form').each(function(){
        var $comment = $(this).find('input[name=comment]');
        context.population.push({id: $comment.attr('id'), comment: $comment.val()});
      });

      //add and validate time series
      $('#ts form').each(function(){
        var $form = $(this);
        var comment;

        var $el = $form.find('input[name=description]');
        var id = $el.attr('id');
        var val = $el.val();
        if(!check['description'](val)){
          ok = false;
          showError($el);
        } else {
          hideError($el);
          comment = val;
        }

        var population_id = $form.find('.ui-selected').map(function(){
          return $(this).html().split(';').join('__');
        }).get();

        if (!population_id.length){
          ok = false;
          $form.find('.text-error').show();
        } else {
          $form.find('.text-error').hide();
        }

        context.time_series.push({id:id, population_id: population_id, comment: comment});
      });

      //add data and N
      context.data.push({id:'data', source: dataStore['data']});
      context.metadata.push({id:'N', source: dataStore['N']});

      //add and validate extra data and metadata
      $('#extraData form, #extraMetaData form').each(function(){
        var $form = $(this);
        var comment, id;

        var $el = $form.find('input[name=name]');
        var val = $el.val();
        if(!check['name'](val)){
          ok = false;
          showError($el);
        } else {
          hideError($el);
          id = $el.val();
        }

        $el = $form.find('input[name=description]');
        val = $el.val();
        if(!check['description'](val)){
          ok = false;
          showError($el);
        } else {
          hideError($el);
          comment = val;
        }
        
        if(id){
          if(id in dataStore){
            context[$form.find('input[type=file]').attr('name')].push({
              id: id,
              comment: comment,
              source: dataStore[id]
            })
          } else {
            ok = false;
            $form.prev('.alert').show().find('span.error').html('Please upload the csv file');
          }
        }
      });

      
      var accepted = $(this).find('input[type=checkbox]').prop('checked') ? true : false;

      if(ok && accepted){
        $(this).prev('.alert').hide();
        
        $.ajax({
          type: "POST",
          url: $(this).attr('action'),
          data: {context: context, _csrf: $(this).find('input[name=_csrf]').val()},
          success: function(data){
            console.log(data);
          },
        });        

      } else {
        var errors = [];
        if(!ok){
          errors.push('Please correct the indicated error');
        } 
        if(!accepted){
          errors.push('Please accept the conditions by checking the checkbox');
        }
        $(this).prev('.alert').show().find('span.error').html('<ul>' + errors.map(function(x){return '<li>' + x + '</li>';}).join('') +'</ul>');
      }

    });

  });

});
