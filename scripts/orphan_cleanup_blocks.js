var mongoose = require('mongoose')
  , lib = require('../lib/explorer')
  , db = require('../lib/database')
  , settings = require('../lib/settings')
  , request = require('request');

var action = "clean";
var startblock = 378000;
var endblock = 400000;

function usage() {

  console.log('Usage: node scripts/orphan_cleanup.js clean');
  console.log('');
  console.log('mode: (required)');
  console.log('clean      Clears orphan blocks received within the last x hours. Configure the hours by modifying \'hours\' in the script.');
  console.log('');
  process.exit(0);

}

if (process.argv[2] == 'clean'){
  action = 'clean';
} else {
  usage();
}

function exit() {
  mongoose.disconnect();
  process.exit(0);
}

var dbString = 'mongodb://' + settings.dbsettings.user;
dbString = dbString + ':' + settings.dbsettings.password;
dbString = dbString + '@' + settings.dbsettings.address;
dbString = dbString + ':' + settings.dbsettings.port;
dbString = dbString + '/' + settings.dbsettings.database;

var orphancount = 0;

mongoose.connect(dbString, function(err) {
	if (err) {
		console.log('Unable to connect to database: %s', dbString);
		console.log('Aborting');
		exit();
	} else {
		if (action == "clean"){
			var currblock = startblock;
			var blockcount = endblock - startblock;
			lib.syncLoop(blockcount, function (blockloop) {	
			   var n = blockloop.iteration();
			   console.log("Checking block: " + currblock + " ...");
			   db.get_blockindex(currblock, function (body) {
		    	   //console.log(body.length);
			    lib.syncLoop(body.length, function (loop) {
			      var i = loop.iteration();
		              //console.log("bh:" + body[i].blockhash + " tx:" + body[i].txid);
				lib.get_block(body[i].blockhash, function(block) {
				    if (block){
				        if (block.confirmations === -1){
					    orphancount++
				            console.log("Found orphan." + block.height + " | " + block.hash + " | " + body[i].txid);
					    db.delete_tx(body[i]._id, function (result){
					    //	console.log(result);
					    });
			                    loop.next();
				        } else {
			        	    loop.next();
					}
				    } else {
			        	loop.next();
			            }	
				});
			    }, function(){
		                currblock++
				blockloop.next();
			    });
			});
		       }, function(){
				console.log("Orphans detected: " + orphancount);
				console.log("blocks processed: " + blockcount);
				exit();
			});
		}
	}
});
