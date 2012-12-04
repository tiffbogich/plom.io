var mongodb = require('mongodb')
  , PlomComponents = require('./').PlomComponents
  , PlomTrees = require('./').PlomTrees;

var db = new mongodb.Db('plom', new mongodb.Server("127.0.0.1", 27017), {safe:true});

db.open(function (err, client) {

  if (err) throw err;
  console.log("Connected to mongodb");

  client.dropDatabase(function(err, done) {
    if (err) throw err;

    var components = new mongodb.Collection(client, 'components')
      , trees = new mongodb.Collection(client, 'trees');

    var ptrees =  new PlomTrees(components, trees);

    ptrees.insertComponent({name:"SIR", description: "SIR model with births and deaths", type: "process"}, function(){
      ptrees.insertComponent({name:"SIS", description: "SIS model no immunity", type: "process"}, function(){
        ptrees.insertComponent({name:"london", description: "measles in London", disease: ['measles'], type: "context"}, function(){
          ptrees.insertComponent({name:"sidney", description: "flu in australia", disease: ['influenza'], type: "context"}, function(){

            trees.findOne({"node.name":"london"}, function(err, doc){


              if (doc){

                ptrees.insertComponentAt({name:"SIR", description: "SIR model with birth and death", type: "process"}, doc._id.toString(),  doc.node[0]._id.toString(), function(err){
                  if (err) throw err;
                  ptrees.insertComponentAt({name:"SEIR", description: "exposed class", type: "process"}, doc._id.toString(),  doc.node[0]._id.toString(), function(err){
                    if (err) throw err;

                    ptrees.search("SEIR", function(err, cursor){
                      cursor.each(function(err, doc){
                        if(doc){
                          console.log('tree: ')
                          console.log(doc);
                          console.log('\n')
                        }
                      });
                    });

                    ptrees.findComponents("exposed").each(function(err, doc){
                      if(doc){
                        console.log('component: ')
                        console.log(doc);
                        console.log('\n')
                      }
                    });

                  });
                });

              }

            });


          });
        });
      });
    });




  });

});
