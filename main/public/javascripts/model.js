function getReaction($form){
  return {
    from: $form.find('input[name="from"]').val(),
    to: $form.find('input[name="to"]').val(),
    rate: $form.find('input[name="rate"]').val()
  };
};

function getpmodel(classId){

  return $(classId).map(function(){
    var $form = $(this);            
    return getReaction($form);
  }).get()
    .filter(function(r){
      return r.from && r.to && r.rate;
    });
};

function getStates(pmodel){
  return _.uniq(pmodel.map(function(x){return x.from;}).concat(pmodel.map(function(x){return x.to;})))
    .filter(function(s){return s!=='U' && s!='DU';});
};

//get sd of white noises
function getSd(classId){
  return $(classId).map(function(){
    var $form = $(this);            
    return $form.find('input[name=sd]').val();
  }).get()
    .filter(function(r){
      return r.trim();
    });
};

//get volatilities of diffusions
function getVolatilities(classId){
  return $(classId).map(function(){
    var $form = $(this);            
    return $form.find('input[name=volatility]').val();
  }).get()
    .filter(function(r){
      return r.trim();
    });
};


//from plom-priors display (TODO browserify);
//TODO: remove par_fixed
function getParameters(pmodel){
  var op = ['+', '-', '*', '/', ',', '(', ')'];
  var specials = ['N', 'correct_rate', 'sin', 'cos', 'M_PI', 'ONE_YEAR_IN_DATA_UNIT', 'terms_forcing', 'step', 'step_lin'];
  function parseRate (rate){

    rate = rate.replace(/\s+/g, '');

    var s = ''
      , l = [];

    for (var i = 0; i< rate.length; i++){
      if (op.indexOf(rate[i]) !== -1){
        if(s.length){
          l.push(s);
          s = '';
        }
        l.push(rate[i]);
      } else {
        s += rate[i];
      }
    }

    if (s.length){
      l.push(s);
    }

    return l;
  }

  var states = getStates(pmodel);
  var rates = _.uniq(pmodel.map(function(x){return x.rate;})).map(parseRate);
  var parameters = [];
  rates.forEach(function(r){
    r.forEach(function(x){
      if(op.indexOf(x) === -1 && states.indexOf(x) === -1 && specials.indexOf(x) === -1){
        parameters.push(x);
      }
    });
  });

  return _.uniq(parameters);
};

function displayErrors($form, err){
  if(err.length){
    $form.prev('.alert').show().find('span.error').html('<ul>' + err.map(function(x){return '<li>' + x + '</li>';}).join('') +'</ul>');
  } else {        
    $form.prev('.alert').hide();
  }
};



$(document).ready(function(){

  $( "#reactions" ).sortable();

  //get noise template from the page
  var $whiteNoiseLi = $('#whiteNoises li').clone();
  $('#whiteNoises li').remove();

  var $diffusionLi = $('#diffusions li').clone();
  $('#diffusions li').remove();

  //get incidence and prevalences template from the page
  var $incidenceLi = $('#incidences li').clone();
  $('#incidences li').remove();

  var $prevalenceLi = $('#prevalences li').clone();
  $('#prevalences li').remove();

  //remove everything except reaction
  $( "#whiteNoises, #diffusions, #incidences, #prevalences" ).on('click', '.remove', function(e){
    e.preventDefault();
    $(this).closest('li').remove();
  });

  //prevent submission if enter is hit
  $('body').on('keypress', 'input[type=text]', function(e){ 
    if (e.which == 13) {
      event.preventDefault();
    }
  });
  
  $.getJSON('/template/model', function(tpl){

    var tplReaction = _.template(tpl['reaction'])
      , tplRoption = _.template(tpl['roption'])
      , tplSoption = _.template(tpl['soption'])
      , tplPoption = _.template(tpl['poption']);

    //re-render selects (re-select previously selected if still relevant or destroy li if nothing is still relevant)
    function reRenderSelects (){

      $('.select-reactions').each(function(){
        var selected = $(this).val();
        $(this).html(tplRoption({reactions: getpmodel('.reaction')}));
        $(this).val(selected);
        if(!$(this).val()){
          $(this).closest('li').remove();
        }
      });

      $('.select-parameters').each(function(){
        var selected = $(this).val();
        var parameters = getParameters(getpmodel('.reaction'));
        if(parameters.indexOf(selected) === -1){
          $(this).closest('li').remove();          
        } else {
          $(this).html(tplPoption({parameters: parameters}));
          $(this).val(selected);
        }
      });

      $('.select-states').each(function(){
        var selected = $(this).val();
        $(this).html(tplSoption({states: getStates(getpmodel('.reaction'))}));
        $(this).val(selected);
        if(!$(this).val()){
          $(this).closest('li').remove();
        }
      });
    };


    //edit reaction
    $( "#reactions" ).on('change', '.reaction input[type=text]', function(e){
      e.preventDefault();
      var $form = $(this).closest('form');
      //validate reactions
      var val = $(this).val().trim();
      if(!val){
        $form.prev('.alert').show().find('span.error').html($(this).attr('name') + ' is mandatory');
      } else {
        $form.prev('.alert').hide();
      }
      reRenderSelects();
    });
    
    //remove reaction
    $( "#reactions" ).on('click', '.remove', function(e){
      e.preventDefault();
      $(this).closest('li').remove();
      reRenderSelects();
    });

    //add empty reactions
    $('#addReaction').on('click', function(e){
      e.preventDefault();
      $("#reactions").append(tplReaction({reactions:[{}]}));
    });

    //add empty white noise (with latest reactions in the select)
    $( "#whiteNoises").on('click', '.add', function(e){
      e.preventDefault();      
      var $li = $whiteNoiseLi.clone();
      $li.find('.select-reactions').html(tplRoption({reactions: getpmodel('.reaction')}));
      $(this).prev('ul').append($li);
    });

    //add empty diffusion (with latest parameters in the select)
    $( "#diffusions").on('click', '.add', function(e){
      e.preventDefault();      
      var $li = $diffusionLi.clone();
      $li.find('.select-parameters').html(tplPoption({parameters: getParameters(getpmodel('.reaction'))}));
      $(this).prev('ul').append($li);
    });

    //add empty incidence (with latest reactions in the select)
    $( "#incidences").on('click', '.add', function(e){
      e.preventDefault();      
      var $li = $incidenceLi.clone();
      $li.find('.select-reactions').html(tplRoption({reactions: getpmodel('.reaction')}));
      $(this).prev('ul').append($li);
    });

    //add empty prevalence (with latest states in the select)
    $( "#prevalences").on('click', '.add', function(e){
      e.preventDefault();      
      var $li = $prevalenceLi.clone();
      $li.find('.select-states').html(tplSoption({states: getStates(getpmodel('.reaction'))}));
      $(this).prev('ul').append($li);
    });
    
    
    $('a.fork').on('click', function(e){
      e.preventDefault();
      //only merge non overlapping reactions
      $.getJSON(this.href, function(p){
        var pmodel = getpmodel('.reaction');        
        var merge =[]; 
        p.model.forEach(function(r){          
          for(var i=0; i< pmodel.length; i++){
            if( (pmodel[i].from === r.from) && (pmodel[i].to === r.to) && (pmodel[i].rate === r.rate)){ break; }
          }
          if(i === pmodel.length){ merge.push(r); }
        });
        $("#reactions").append(tplReaction({reactions:merge}));
        reRenderSelects();
      });
    });

    $('#submit').on('click', function(e){
      e.preventDefault();

      //validate reactions
      $('.reaction').each(function(){
        var err = [];
        $(this).find('input[type=text]').each(function(){
          if(!$(this).val().trim()){
            err.push(this.name + ' is mandatory');
          }          
        });
        displayErrors($(this), err);
      });

      var pmodel = getpmodel('.reaction');
      var allp = getStates(pmodel).concat(getParameters(pmodel));
      var novol = allp.concat(getSd('.white-noise'));
      var nosd = allp.concat(getVolatilities('.diffusion'));

      //validate white noise
      $('.white-noise').each(function(){
        var err = [];
        var sd = $(this).find('input[name=sd]').val().trim();
        if(!sd){
          err.push('sd is mandatory');
        } else if(nosd.indexOf(sd) !== -1) {
          err.push(sd + ' is already taken');
        }
        if(!$(this).find('select').val()){
          err.push('please select at least one reactions');          
        }
        displayErrors($(this), err);       
      });      

      //validate diffusion
      $('.diffusion').each(function(){
        var err = [];
        var vol = $(this).find('input[name=volatility]').val().trim();
        if(!vol){
          err.push('sd is mandatory');
        } else if(novol.indexOf(vol) !== -1) {
          err.push(vol + ' is already taken');
        }
        displayErrors($(this), err);       
      });
      


    });


  });

});
