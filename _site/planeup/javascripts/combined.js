Game = _.extend({

    model : {},

    view : {},

    collection : {},

    mixin : {},

    worker : {},

    allEntities : [],

    allPlanes : null,

    appReadyStatus : false,

    currentLevel : 0,

    // accepts backbone view
    addEntity : function(entity){
        gs.addEntity(entity);
        this.allEntities.push(entity);
    },


    // accepts backbone model
    delEntity : function(entityModel) {
        gs.delEntity(entityModel.view);

        for(var i = this.allEntities.length-1; i >= 0; i--){
            if(this.allEntities[i].cid == entityModel.view.cid){
                this.allEntities.remove(this.allEntities[i]);
                break;
            }
        }
    },


    // callback =>  function to be called when App is initialized
    onReady : function(callback) {
        if(Game.appReadyStatus == true) {

          callback();
        } else {

            Game.bind("ready", callback);
        }
    },


    trash : function(obj){
        obj = null;
    },


    startNewLevel : function(){

        var newLevel = Game.currentLevel + 1;
        Game.aliveAICount = newLevel;

        for(var i=0; i < newLevel; i++){

            Game.allPlanes.create({
                a : 0,
                id : Date.now() + 100000,
                u : 0,
                direction : 0,
                master : true,
                AI : true, 
                team : "red",
                currPosition : {
                    x : gs.random(10, 100),
                    y : gs.random(100, 200)
                },
                serverTimeDiffAvg : 0// Game.pingTest.serverTimeDiffAvg
            });
        }
    }

}, Backbone.Events);





// Action starts here....
Game.onReady(function(){

    var surface = document.getElementById("container");
    gs = new JSGameSoup(surface, 30);

    gs.addEntity(new Game.view.World(gs));

    Game.allPlanes = new Game.collection.Planes();

    Game.allControllers = new Game.collection.Controllers();

    Game.bullets = new Game.collection.Bullets();

    var team = Math.random() > 0.5 ? "red" : "blue";
    var d = team == "red"? 0 : Math.PI;


    // Game.pingTest = new Pings().bind("completed", function(){

        // for(var  i  = 0; i < 1; i++){

            Game.human = Game.allPlanes.create({
                a : 0,
                id : Date.now(),
                u : 0,
                direction : Math.PI,
                master : true,
                AI : false, 
                team : "blue", //team
                currPosition : {
                    x : gs.random(900, 1000),
                    y : gs.random(500, 600)
                },
                serverTimeDiffAvg : 0 //Game.pingTest.serverTimeDiffAvg
            });
        
            Game.startNewLevel();

            // Game.AI = Game.allPlanes.create({
            //     a : 0,
            //     id : Date.now() + 100000,
            //     u : 0,
            //     direction : 0,
            //     master : true,
            //     AI : true, 
            //     team : "red",
            //     currPosition : {
            //         x : gs.random(10, 100),
            //         y : gs.random(100, 200)
            //     },
            //     serverTimeDiffAvg : 0// Game.pingTest.serverTimeDiffAvg
            // });

            Game.time = Date.now();
 
        // }

    // });


    gs.launch();

});




// for now, game is ready when dom is ready
$(function() {  
    Backbone.sync = function(method, model, options) {
        
        var error = options.error || function() {};
        var success = options.success || function() {};
        
        // Don't pass the callbacks to the backend
        delete options.error;
        delete options.success;

        // hack
        var resp = model.toJSON();
        success(resp);
        return true;
    }
    
    Game.trigger("ready");
});











Game.model.Plane = Backbone.Model.extend({


    defaults : {
        health : 100,
        capturedActions : {
            actionUpDown : 0,
            actionLeftRight : 0
        },
        captureInterval : 50,
        applyInterval : 50
    },
    
    initialize: function(args) {
        this.master = false;

        if(args.AI){
            this.AI = true;
            this.set({AI : false});
        } else {
            this.AI = false;
        }

        if(args.master){
            this.master = true;
            this.set({master : false});
            // override set method to reject updates from backend/ accept updates only from update method
            this.oldSet = this.set;
            this.set = this.newSet;

            // this.set({
            //     captureInterval : Game.pingTest.roundTripAvg + 100,
            //     applyInterval : Game.pingTest.roundTripAvg + 100
            // }, {local : true});

            this.controller = Game.allControllers.create({ id : this.id }); // create controller

        } else {
            this.controller = Game.allControllers.get(this.id);
        }

        this.controller.bind("controller:update", this.applyActions, this);

        this.controller.master = this.master;
        this.controller.plane = this;

        // AI stuff //
        var self = this;

        if(this.AI){
            _.extend(this, Game.mixin.AIControlled)

            // first AI action
            window.setTimeout(function() {
                self.getAIUpdate();
            }, 2000);

            this.controller.bind("controller:halftime", this.getAIUpdate, this);
        }

        // AI stuff //


        this.view = new Game.view.PlaneView({model : this});
    },


    // local is true in case of local upadate ie not from backend
    newSet : function(attrs, options) {
        if(options && options.local)
            this.oldSet(attrs);
    },


    isMaster : function(){
        return this.master;
    },


    applyActions : function(controller) {

        //console.log("applying", this.now(), controller.leftRight, controller.upDown);

        this.set({
            actionLeftRight : controller.leftRight,
            actionUpDown : controller.upDown
        }, {local : true});

        if(controller.fireBullet)
            this.fireBullet();
    },


    now : function() {
        return Math.round(Date.now() - this.get("serverTimeDiffAvg"));
    },


    getAIUpdate : function() {
        var currMove = {
            value : 0,
            p1 : this.toJSON(),
            p2 : Game.human.toJSON(),
            terminal : function(){return false;},
            action : []
        }


        var curr = this.get("currPosition");
        var currP2 = Game.human.get("currPosition");
        var d = this.get("direction");


        var value = this.alphabeta(currMove, 1, "p1", -this.INFINITY, this.INFINITY);

        var action = this.getAction(currMove, value);

        console.log("P1", Math.round(curr.x), Math.round(curr.y), Math.round(d), "->", currMove, action.toString());

        // if(this.count == 10)
        //     return false;

        // this.count++;

        this.onAIUpdate(action);
    },


    onAIUpdate : function(action){

        // perform action
        this.controller.setActions(action);

    },

    lastBulletTime : 0,


    fireBullet : function(){
        if(Date.now() - this.lastBulletTime < 200)
            return false;

        this.lastBulletTime = Date.now();

        //fire bullet
        var q = parseFloat(this.get('direction')) - 0.01;
        var currPos = this.get("currPosition");
        var u = parseFloat(this.get("u")) + 10;

        var c = {
            x : parseFloat(currPos.x) + (30 * Math.cos(q)),
            y : parseFloat(currPos.y) + (30 * Math.sin(q))
        };

        Game.bullets.create({
            id : Date.now(),
            u : u,
            q : q,
            pos : c
        });
    },


    count : 0



    
});









Game.model.Smoke = Backbone.Model.extend({
   initialize : function(){
       this.view = new Game.view.SmokeView({model : this});
   } 
});







Game.model.Bullet = Backbone.Model.extend({

    config : {
        damage : 5
    },
    
    initialize: function(args) {
        this.view = new Game.view.BulletView({model : this});
    }

});












Game.model.Controller = Backbone.Model.extend({

    actionUpDown : 0,
    actionLeftRight : 0,
    lastCaptureInterval : 0,


    defaults : {
        id : 0, // same as plane id
        leftRight : 0,
        upDown : 0,
        timestamp : Date.now()
    },

    
    initialize: function(args) {

        this.bind("change", this.applyActionsAfterTimeout, this); // got update( on capturing)

        this.bind("controller:update", this.onApply, this);
    },


    setActionLeftRight : function(value) {
        this.actionLeftRight = value;

        this.isChanged = true;
        this.captureActions();
    },


    setActionUpDown : function(value) {
        this.actionUpDown = value;

        this.isChanged = true;
        this.captureActions();
    },


    setActions : function(action) {
        this.actionUpDown = action[0];
        this.actionLeftRight = action[1];
        this.actionFireBullet = action[2];

        this.isChanged = true;
        this.captureActions();
    },


    captureActions : function() {

        if(this.isCaptured)
            return false; // if an action is captured, wait till it is applied

        this.set({
            leftRight : this.actionLeftRight,
            upDown : this.actionUpDown,
            fireBullet : this.actionFireBullet,
            timestamp : this.plane.now()
        });

        console.log("capturing", this.actionUpDown, this.actionLeftRight);

        if(this.needResetSave)
            this.needResetSave = false;

        if(this.isChanged) { 
            // reset values
            this.actionUpDown = 0;
            this.actionLeftRight = 0;
            this.needResetSave = true;
        }

        this.isChanged = false;

        // dnt touch
        this.isCaptured = true;

    },


    onApply : function(){
        //console.log("applied");
        this.isCaptured = false;

        if(this.needResetSave || this.isChanged)
            this.captureActions();
    },


    applyActionsAfterTimeout : function(){

        //if(!this.master)
            //console.log("got update", this.get("leftRight"), this.get("upDown"));

        var timeRemaining = this.plane.get("applyInterval") - (this.plane.now() - this.get("timestamp"));

        var self = this;

        window.setTimeout(function(){
            self.trigger("controller:update", self.toJSON());
        }, timeRemaining);

        // helper for master, to calulate next action at half time
        if(this.master && this.plane.AI){
            window.setTimeout(function(){
                self.trigger("controller:halftime");
            }, timeRemaining / 2);            
        }

    }

});










Game.collection.Planes = Backbone.Collection.extend({

    url : "/planes",
    // Specify the backend with which to sync
    backend: 'planes',

    model: Game.model.Plane,

    initialize: function() {
        // Setup default backend bindings
        // this.bindBackend();
        
        this.bind('backend:update', this.addExistingPlane, this);
    },


    addExistingPlane : function(model) {
        if(!this.get(model.id)){
            this.add(model);
        }
    }

});






Game.collection.Bullets = Backbone.Collection.extend({

    url : "/bullets",
    // Specify the backend with which to sync
    backend: 'bullets',

    model: Game.model.Bullet,

    initialize: function() {
        // Setup default backend bindings
        // this.bindBackend();
        
        this.bind('backend:update', this.addExistingBullet, this);
    },

    addExistingBullet : function(model) {
        if(!this.get(model.id)){
            this.add(model);
        }
    }

});







Game.collection.Controllers = Backbone.Collection.extend({

    url : "/controllers",
    // Specify the backend with which to sync
    backend: 'controllers',

    model: Game.model.Controller,

    initialize: function() {
        // Setup default backend bindings
        //this.bindBackend();

        this.bind('backend:update', function(model) {
        
            window.setTimeout($.proxy(function(){ // introduce fake lag

                var m = this.get(model.id);
                if(m)
                    m.set(model);
                else 
                    this.add(model);

            }, this), 0);
            
        }, this);
        
        this.bind('backend:update', this.addExistingController, this);
    },


    addExistingController : function(model) {
        // if(!this.get(model.id)){
        //     this.add(model);
        // }
    }

});









Pings = Backbone.Collection.extend({

    // Specify the backend with which to sync
    backend: 'pings',

    roundTrip : [],

    oneWay : [],

    serverTimeDiff : [],

    initialize: function() {
        // Setup default backend bindings
        this.bindBackend();

        this.pingCount = 0;

        this.doPing();

    },


    doPing : function() {
        var ping = this.create({ id : Date.now() });
        ping.fetch({ 
            success : $.proxy(this.success, this)
        });

        ++this.pingCount;
    },


    success : function(model) {
        var roundTrip = Date.now() - model.id;
        this.roundTrip.push(roundTrip);
        this.oneWay.push(model.get("timestamp") - model.id);
        var serverTime = model.get("timestamp") + (roundTrip/2);
        this.serverTimeDiff.push(Date.now() - serverTime);

        if(this.pingCount < 25)
            this.doPing();
        else
            this.showResults();
    },


    showResults : function(){ 
        console.log("Max Ping", _.max(this.roundTrip), _.max(this.oneWay));
        console.log("Min Ping", _.min(this.roundTrip), _.min(this.oneWay));
        this.roundTripAvg = _.reduce(this.roundTrip, function(memo, num){ return memo + num; }, 0) / this.roundTrip.length;
        this.oneWayAvg = _.reduce(this.oneWay, function(memo, num){ return memo + num; }, 0) / this.oneWay.length;

        this.serverTimeDiffAvg = _.reduce(this.serverTimeDiff, function(memo, num){ return memo + num; }, 0) / this.serverTimeDiff.length;

        console.log("Avg Ping", this.roundTripAvg, this.oneWayAvg);

        this.trigger("completed");
    }

});





Game.worker.planeUpdate = worker(function update(model, config, time) { // time in ms
    var t = 0.1;

    if(time)
        t = time / 300;

    // acceleration
    switch(model.actionUpDown) {

        case 1 :    model.a = model.u < 0 ? config.a + config.da : config.a; // up
            break;

        case -1 :   model.a = model.u > 0? -(config.a + config.da) : -config.a; // down
            break;

        case 0 :    if(model.u > 0) {
                        model.a = -config.da;
                    } else if(model.u < 0) {
                        model.a = config.da;
                    }
            break;
    }


    // velocity dependent turning radius

    var turnCoefficient = 400 / (Math.abs(model.u) + 1) ;// range 3 - 9

    turnCoefficient = turnCoefficient > 8 ? 8 : turnCoefficient;

    // turnCoefficient = 8;

    // direction
    switch(model.actionLeftRight) { // no direction change when no acceleration
        case -1 :   model.direction -= turnCoefficient / 100; //0.05; // left
            break;

        case 1 :    model.direction += turnCoefficient / 100 //0.05; // right
            break;

        case 0 :    // do nothing
            break;
    }


    var d = model.u * t + (model.a * Math.pow(t, 2))/2;          
    var v = model.u + model.a * t;

    var ang = model.direction % (2 * Math.PI);

    model.u = v > config.vmax ? config.vmax : v;
    //model.u = v < -config.vmax ? -config.vmax : v;

    var dx = Math.round(d * Math.cos(model.direction));
    var dy = Math.round(d * Math.sin(model.direction));

    model.currPosition.x += dx;
    model.currPosition.y += dy;

    if(model.currPosition.x < -20)
        model.currPosition.x = 1180;

    if(model.currPosition.x > 1220)
        model.currPosition.x = 20;

    if(model.currPosition.y < -20)
        model.currPosition.y = 630;

    if(model.currPosition.y > 670)
        model.currPosition.y = 20;

    model.direction = ang < 0 ? 6.28 + ang : ang;
        
    return model;
});









Game.view.PlaneView = Backbone.View.extend({

    radius : 10,

    type : "plane",

    tail : [], // list of smoke clouds

    config : {
        vmax : 70, // set in calibration with airstrike
        a : 40,
        da : 20,
        ga : 34
    },


    initialize: function(args) {
        Game.addEntity(this);

        // make plane user controlled
        if(this.model.master && !this.model.AI)
            _.extend(this, Game.mixin.RemoteControlled);

        
        this.sprite = {
            healthy : $("#" + args.model.get("team") + "-plane-image")[0],
            dead : $("#" + this.model.get("team") + "-wreck-plane-image")[0]
        };

        this.smokeInterval = 3;
        this.smokeStep = 1;
        this.smokeIndex = 0;

        // add some clouds
        // for(var i = 0; i < 20; i++){
        //     this.tail.push(new Game.model.Smoke());
        // }

        statemachine(this);
        this.set_state("healthy");

        this.model.bind("change:health", this.onHealthChanged, this);
        this.model.bind("change:time", this.onChangeTime, this);

        this.updateCount = 0;
    },
    

    update : function() {
        ++this.updateCount;

        if(this.updateCount == 70 && this.model.isMaster()){ // 2 secs sync
            //console.log("plane sync");
            // this.model.save();
            this.updateCount = 0;
        }

        var model = this.model.toJSON();  
        Game.worker.planeUpdate(model, this.config).on("data", $.proxy(this.onUpdated, this));

    },


    onUpdated : function(model){

        // as this function is async so it overrides the changed values of model, that were changed between sync
        // time, hence we restore original values

        // model.actionLeftRight = this.model.get("actionLeftRight");
        // model.actionUpDown = this.model.get("actionUpDown");

        this.model.set(model, {local : true});

        $("#time").html(Math.round((Date.now() - Game.time) / 1000));
    },


    // for test purpose only
    onChangeTime : function(){
        //console.log("Ping", Date.now()-this.model.get("time"));
    },



    onHealthChanged : function(){
        h = this.model.get("health");

        if(h < 50){
            if(h > 0)
                this.set_state("injured"); 
            else if(h == 0){
                this.onDeath();
            }
        } else {
            this.set_state("healthy"); 
        }

        $("#" + this.model.get("team") + "-health").html(h);
    },
    

    onDeath : function(){

        

        if(this.model.get("team") == "blue"){
            var refresh = confirm("You Crashed at level " + (Game.currentLevel + 1) + " !! Restart??");
            if(refresh)
                window.location.reload();

        } else {

            this.set_state("dead"); 
            this.update = function(){};
            this.model.fireBullet = function(){};
            Game.aliveAICount--;

            if(Game.aliveAICount == 0){
                var nextLevel = confirm("Victory!! Start level " + (Game.currentLevel + 2) +" ??")

                if(nextLevel){
                    Game.currentLevel++;
                    Game.startNewLevel();
                    Game.human.set({health : 100}, {local : true});
                }
            }    
        }
    },


    healthy_draw : function(context) {
        this.drawPlane(context, "healthy");
        if(this.model.get("a") > 0)
            this.drawSmoke(context, "white", this.model.get("currPosition"));
    },


    injured_draw : function(context){
        this.drawPlane(context, "healthy"); 
        if(this.model.get("a") > 0)
            this.drawSmoke(context, "black", this.model.get("currPosition"));
    },


    dead_draw : function(context){
        this.drawPlane(context, "dead");
        if(this.model.get("a") > 0)
            this.drawSmoke(context, "black", this.model.get("currPosition"));
    },


    drawPlane : function(context, state){
        var attrs = this.model.toJSON();

        var sprite = this.sprite[state];
        var sourceX = 48 * Math.round(attrs.direction * 10);
        var sourceY = 0;
        var sourceWidth = 48;
        var sourceHeight = 48;
        var destWidth = sourceWidth;
        var destHeight = sourceHeight;
        var destX = attrs.currPosition.x - 24;
        var destY = attrs.currPosition.y - 24; 

        context.drawImage(sprite, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);
    },


    drawSmoke : function(context, color, pos){

        if(this.smokeStep == this.smokeInterval){
            
            if(this.model.get("u") < 10)
                return false;

            var cloud = new Game.model.Smoke();//this.tail[this.smokeIndex];
            cloud.set({ 
                color : color,
                pos : {
                    x : pos.x,
                    y : pos.y
                }
            });

            if(this.smokeIndex == 19)
                this.smokeIndex = 0;
            else 
                this.smokeIndex++;

            this.smokeStep = 1;
        } else {
            this.smokeStep++;
        }
    },


    get_collision_circle : function() {
        var currPos = this.model.get("currPosition");
        return [[currPos.x, currPos.y], 15];
    },
    
    collide_circle : function(who) {
      switch(who.type){
          case "bullet" : console.log("collided");
            this.model.set({health : this.model.get("health") - who.model.config.damage}, {local : true});
          break;
      }
    }
    
});







Game.view.SmokeView = Backbone.View.extend({

    spriteLength : {
        "black" : 256,
        "white" : 512
    },

    initialize : function() {
        this.model.bind("change", this.render, this);
    },


    render : function(){
        this.sourceX = 0;
        this.sprite = $("#"+ this.model.get("color") +"-smoke-image")[0];
        Game.addEntity(this);  
    },

    
    update : function() {
        this.sourceX += 16;
        if(this.sourceX == this.spriteLength[this.model.get("color")] ){
            Game.delEntity(this.model);
            Game.trash(this);
        }
    },


    draw : function(context){
        var pos = this.model.get("pos");

        var sourceX = this.sourceX;
        var sourceY = 0;

        var sourceWidth = 16;
        var sourceHeight = 16;
        var destWidth = sourceWidth;
        var destHeight = sourceHeight;
        var destX = pos.x;
        var destY = pos.y;

        context.drawImage(this.sprite, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);      
    }

});








Game.view.World = Backbone.View.extend({

    initialize : function(args){
        this.gs = args.gs;
    },


    update : function(){
        collide.circles(Game.allEntities, Game.allEntities);
    },


    draw : function(context) {
        gs.clear();
        gs.background('#cbbefe');
    }
});





Game.worker.bulletUpdate = worker(function update(u, q, currPos, config) {

    var t = config.t;

    var a = u > 0 ? -config.da : config.da;

    var d = u * t + (a * Math.pow(t, 2))/2;
    var v = u + a * t;

    var dx = Math.round(d * Math.cos(q));
    var dy = Math.round(d * Math.sin(q));

    currPos.x += dx;
    currPos.y += dy;
        
    var data = {
        v : v,
        currPos : currPos,
    };

    return data;
});



// TODO  : should not create objs for each bullet instead used fixed no. say 5 and use them again.
Game.view.BulletView = Backbone.View.extend({

    type : "bullet",

    config : {
        radius : 2,
        t : 0.1,
        da : 5,
        u : 50,
        ttl : 1500
    },


    initialize: function(args) {
        Game.addEntity(this);
        this.model.set({ u : this.model.get("u") + this.config.u});// relative vel of bullet
        this.time = Date.now();
    },
    

    update : function() { 
        var u = this.model.get("u"),
        q = this.model.get("q"),
        currPos = this.model.get("pos");

        Game.worker.bulletUpdate(u, q, currPos, this.config).on("data", $.proxy(this.onUpdated, this));

    },


    onUpdated : function(data){

        this.model.set({
           u :  data.v,
           pos : data.currPos
        });


        if(Date.now() - this.time > this.config.ttl){
            Game.delEntity(this.model);
        }

    },


    draw : function(context){
        var pos = this.model.get("pos");
        context.fillStyle = "#222";
        context.beginPath();
        context.arc(pos.x, pos.y, this.config.radius, 0, Math.PI * 2, true);
        context.fill();      
    },

    get_collision_circle : function() {
        var currPos = this.model.get("pos");
        return [[currPos.x, currPos.y], this.config.radius];
    },
    
    collide_circle : function(who) {
      Game.delEntity(this.model);
    }

});






Game.mixin.RemoteControlled = {

    lastBulletTime : 0,

    // keyDown_37 : function () {
    //     this.model.controller.setActionLeftRight(-1); // left
    // },
        
    // keyDown_39 : function () {
    //     this.model.controller.setActionLeftRight(1); // right
    // },

    keyHeld_37 : function () {
        this.model.controller.setActionLeftRight(-1); // left
    },
        
    keyHeld_39 : function () {
        this.model.controller.setActionLeftRight(1); // right
    },

    // keyUp_37 : function () {
    //     this.model.controller.setActionLeftRight(0);
    // },
        
    // keyUp_39 : function () {
    //     this.model.controller.setActionLeftRight(0);
    // },

    // keyDown_38 : function () {
    //     this.model.controller.setActionUpDown(1); // up
    // },

    keyHeld_38 : function () {
        this.model.controller.setActionUpDown(1); // up
    },

    // keyUp_38 : function () {
    //     this.model.controller.setActionUpDown(0);
    // },

    keyDown_40 : function () {
        this.model.controller.setActionUpDown(-1); // down
    },

    // keyUp_40 : function () {
    //     this.model.controller.setActionUpDown(0);
    // },
        
    keyHeld_32 : function () {
        this.model.fireBullet();
    },


    keyDown_32 : function () {
        this.model.fireBullet();
    },

    keyHeld_16 : function () {
        this.model.fireBullet();
    },


    keyDown_16 : function () {
        this.model.fireBullet();
    }
};








Game.mixin.AIControlled = {

    INFINITY : 99999,   // Put a large number in here.

    // Plausible-move generator// generates one more level
    moveGen : function(move, player) {

        move.status = 0; /////////////

        var opponent = player == "p1" ? "p2" : "p1";

        // position after left move
        var pL = {
            x : move[player].currPosition.x + 20 * Math.cos(move[player].direction - 1),
            y : move[player].currPosition.y + 20 * Math.sin(move[player].direction - 1)
        }

        // position after right move
        var pR = {
            x : move[player].currPosition.x + 20 * Math.cos(move[player].direction + 1),
            y : move[player].currPosition.y + 20 * Math.sin(move[player].direction + 1)
        }

        var distLeft = Math.sqrt( Math.pow(move[opponent].currPosition.x - pL.x, 2) + Math.pow(move[opponent].currPosition.y - pL.y, 2)); // distance of p2 from next left move position
        var distRight = Math.sqrt( Math.pow(move[opponent].currPosition.x - pR.x, 2) + Math.pow(move[opponent].currPosition.y - pR.y, 2));

        // -1 for left 1 for right
        var leftRight = distLeft < distRight ? -1 : 1; //right or left

        move.children = new Array;

        var str = "";

        for(var i=0; i <= 1; i++) {
            for(var j=-1; j<=1; j++){

                if(j == -leftRight) // skip opposite of selected move(leftRight)
                    continue;

                move.children.push({
                    value : 0,
                    action : [i, j], // upDown, leftRight arrow keys
                    p1 : $.extend(true, {}, move.p1), // clone w/o reference
                    p2 : $.extend(true, {}, move.p2),
                    terminal : function(){return false;},
                    DEPTH : move.DEPTH,
                    evalFor : player
                }); // plausible up/down moves

                str+= [i, j] + " - ";

            }
        }

        console.log(str);
        move.terminal = function(){return false;};

        return move;
    },


    // Evaluation function
    evaluate : function(move, player){ // dnt give -ve value for other player.
        move.eval = true;

        var opponent = player == "p1" ? "p2" : "p1";

        // update player's actions
        move[player].actionUpDown = move.action[0];
        move[player].actionLeftRight = move.action[1];

        var originalDirection = move[player].direction;

        // update physics - get advance position of player
        move[player] = this.updatePhysics(move[player], Game.human.view.config, Game.human.get("applyInterval"));

        // compare advance position with opponent's position ( distance factor )
        var displacement = Math.sqrt( Math.pow(move[opponent].currPosition.x - move[player].currPosition.x, 2) + Math.pow(move[opponent].currPosition.y - move[player].currPosition.y, 2));

        var newDirection = move[player].direction;

        // (direction factor calculation)
        var diffY = move[opponent].currPosition.y - move[player].currPosition.y;
        var diffX = move[opponent].currPosition.x - move[player].currPosition.x;

        var slope = Math.atan(diffY / diffX);
        var lineDirection; // direction of line joining p1 p2
        
        if(diffY > 0){

            if(diffX > 0){ // 1 quadrant
                lineDirection = slope;
            } else { // 2
                lineDirection = Math.PI + slope;
            }

        } else {

            if(diffX > 0) { // 4
                lineDirection = 2*Math.PI - slope;
            } else { // 3           
                lineDirection = Math.PI + slope;
            }
        }

        var newDiff = Math.abs(lineDirection - newDirection);
        var oldDiff = Math.abs(lineDirection - originalDirection);


        if(newDiff < 0.52 && displacement < 400)
            move.action[2] = 1; // fire bullet
        else
            move.action[2] = 0;

        var directionFactor = 0;

        if(oldDiff > Math.PI){
            // highr diff goood 
            if(newDiff > oldDiff )
                directionFactor = +newDiff; // better
            else 
                directionFactor = -newDiff; // poor
        }
        else {
            // lower diff good
            if(newDiff < oldDiff )
                directionFactor = +newDiff; // better
            else 
                directionFactor = -oldDiff; // poor
        }

        // disabled
        //directionFactor = 0;


        directionFactor = Math.round( directionFactor * 3 ); // it can be -ve or +ve, it changes goodness of a move, range -62 - +62

        // displacement factor is always + but diretionfactor can be - and +
        move.value = this.INFINITY - Math.round(displacement) + directionFactor ; // more the displ worst the move

        move.df = directionFactor;
        move.disp = displacement;

        return (move.DEPTH%2 ? -1: 1) * move.value;
    },



    // player = 1 0r 2
    // Minimax algorithm
    minimax : function(move, depth, player){

        move.status = 1;
        move.DEPTH = move.DEPTH || depth; // save initial depth

        if((move.terminal)() == true || depth == 0)
            return this.evaluate(move, move.evalFor);

        move = this.moveGen(move, player);

        a = -this.INFINITY;
        var oppositePlayer = player == "p1" ? "p2" : "p1";

        for(var child = 0; child < move.children.length; child++){
                a = Math.max(a, -this.minimax(move.children[child], depth-1, oppositePlayer));// maximize
        }
        move.value = a;
        return a;
    },


    // AlphaBeta algorithm
    alphabeta : function(move, depth, player, alpha, beta){
        move.status = 1;

        move.DEPTH = move.DEPTH || depth; // save initial depth
        
        if((move.terminal)() == true || depth == 0)
            return this.evaluate(move, move.evalFor);

        move = this.moveGen(move, player);
        //this.showPlausibleMoves(move);

        var oppositePlayer = player == "p1" ? "p2" : "p1";

        if(move.children){
            for(var child = 0; child < move.children.length; child++){
                alpha = Math.max(alpha, -this.alphabeta(move.children[child], depth-1, oppositePlayer, -beta, -alpha));
                move.value = alpha;
                if(beta <= alpha){break;}
            }
        }
        return alpha;
    },


    getAction : function(move, value){
        var str= "";
        for(var i=0; i< move.children.length; i++){
            if(Math.abs(move.children[i].value) == Math.abs(value)){
                //console.log(move.children[i].action);
                return move.children[i].action;

                // if(move.children[i].children)
                //  go(move.children[i], value);

                // break;
            }
        }
    },


    tree : function(move){
        var str= "";
        for(var i=0; i< move.children.length; i++){
            str += move.children[i].value + "-" + move.children[i].action + " ";
            if(move.children[i].children){
                this.tree(move.children[i]);
            }
        }
        console.log(str);
    },


    showPlausibleMoves : function(move){
        var str= "";
        for(var i=0; i< move.children.length; i++){
            str += move.children[i].action + " ";
            if(move.children[i].children){
                tree(move.children[i]);
            }
        }
        console.log(str);
    },


    updatePhysics : function(model, config, time) { // time in ms
        var t = 0.1;

        if(time)
            t = time / 300;

        // acceleration
        switch(model.actionUpDown) {

            case 1 :    model.a = model.u < 0 ? config.a + config.da : config.a; // up
                break;

            case -1 :   model.a = model.u > 0? -(config.a + config.da) : -config.a; // down
                break;

            case 0 :    if(model.u > 0) {
                            model.a = -config.da;
                        } else if(model.u < 0) {
                            model.a = config.da;
                        }
                break;
        }


        // velocity dependent turning radius

        var turnCoefficient = 400 / (Math.abs(model.u) + 1) ;// range 3 - 9

        turnCoefficient = turnCoefficient > 8 ? 8 : turnCoefficient;

        // direction
        switch(model.actionLeftRight) {
            case -1 :   model.direction -= turnCoefficient / 100; //0.05; // left
                break;

            case 1 :    model.direction += turnCoefficient / 100 //0.05; // right
                break;

            case 0 :    // do nothing
                break;
        }


        var d = model.u * t + (model.a * Math.pow(t, 2))/2;          
        var v = model.u + model.a * t;

        var ang = model.direction % (2 * Math.PI);

        model.u = v > config.vmax ? config.vmax : v;
        //model.u = v < -config.vmax ? -config.vmax : v;

        var dx = Math.round(d * Math.cos(model.direction));
        var dy = Math.round(d * Math.sin(model.direction));

        model.currPosition.x += dx;
        model.currPosition.y += dy;

        if(model.currPosition.x < -20)
            model.currPosition.x = 1180;

        if(model.currPosition.x > 1220)
            model.currPosition.x = 20;

        if(model.currPosition.y < -20)
            model.currPosition.y = 630;

        if(model.currPosition.y > 670)
            model.currPosition.y = 20;

        model.direction = ang < 0 ? 6.28 + ang : ang;
            
        return model;
    }

};