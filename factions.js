var https = require("https");
var mongoose = require('mongoose');

// id,name,updated_at,government_id,government,allegiance_id,allegiance,state_id,state,home_system_id,is_player_faction

var Schema = mongoose.Schema;
var Faction = new Schema({
  id: {
    type: Number,
    unique: true
  },
  name: {
    type: String,
    unique: true
  },
  updated_at: Number,
  government_id: Number,
  government: String,
  allegiance_id: Number,
  allegiance: String,
  state_id: Number,
  state: String,
  home_system_id: Number,
  is_player_faction: Boolean
});

var FactionModel = mongoose.model('Faction', Faction);

function pack(arr) {
  var names = ["id","name","updated_at","government_id","government","allegiance_id","allegiance","state_id","state","home_system_id","is_player_faction"];
  var result = {};

  for (var i = 0; i < names.length; i++) {
    result[names[i]] = arr[i];
  }

  return result;
}

function updateDB() {
  return new Promise(function (resolve, reject) {
    var data = "";
    var start = true;
    var counter = 1;
    var bulk = FactionModel.collection.initializeUnorderedBulkOp();

    https.get("https://eddb.io/archive/v5/factions.csv", function (res) {
      console.log(`STATUS: ${res.statusCode}`);
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        data = data + chunk;
        var splited = data.split('\n');

        if (start) {
          var header = splited.shift();
          console.log(`BODY: ${header}`);
          start = false;
        }

        for (var i = 0; i < splited.length - 1; i++) {
          var item = pack(splited[i].split(','));
          bulk.find({id: item.id}).upsert().update({$set: item}, {strict: true});
          counter++;
        }
        data = splited.pop();

        if (counter % 1000 == 0) {
          counter = 1;
          bulk.execute(function (err, result) {
            if (err) {
              console.log(err);
              return;
            }
          });
        }
      });

      res.on('end', () => {
        var splited = data.split('\n');
        for (var i = 0; i < splited.length; i++) {
          var item = pack(splited[i].split(','));
          bulk.find({id: item.id}).upsert().update({$set: item}, {strict: true});
        }

        bulk.execute(function (err, result) {
          if (err) {
            console.log(err);
            return;
          }
          resolve();
        });
        console.log('No more data in response.');
      });

      res.on('error', (err) => {
        reject(err);
      })
    })
  });
}

module.exports.updateDB = updateDB;
