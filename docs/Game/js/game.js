var host = "" //"/dino-run-and-jump/Game";
var game;

var firebaseConfig = {
    apiKey: "AIzaSyA4fyvc6p7bnP6TipjCpcc4V-dhysnRdx0",
    authDomain: "dino-run-and-jump-d2cdb.firebaseapp.com",
    databaseURL: "https://dino-run-and-jump-d2cdb-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "dino-run-and-jump-d2cdb",
    storageBucket: "dino-run-and-jump-d2cdb.appspot.com",
    messagingSenderId: "200118050769",
    appId: "1:200118050769:web:71d81d4e42b99e56110af0",
    measurementId: "G-S7CQ1S72TK"
};

// Inizializzare Firebase
const app = firebase.initializeApp(firebaseConfig);

// Inizializzare database
const db = firebase.database();

// Inizializzare variabili
const auth = firebase.auth();
var timestamp = Date.now();
const user = firebase.auth().currentUser;
var waitLobby = true;
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);
var rif;
var runGame = false;

db.ref("session/" + localStorage.getItem("sessionId")).on("child_added", function(snapshot) {
    if (NUM_DINI < 10) {
        NUM_DINI++;
        var id = snapshot.key;
        if (id.startsWith("guest_")) {
            diniNicknames.push(snapshot.key);
            diniColor.push(snapshot.val().dino_color);
            uids.push(null);
        } else if (id.length == 28) {
            db.ref('user/' + snapshot.key).once("value", function(data) {
                var uid = data.key;
                uids.push(uid);
                diniNicknames.push(data.val().nickname);
                diniColor.push(data.val().dino_color);
            });
        }
        diniJumps.push(false);
        rif.scene.restart();
    }
});

function setSettingsPhaser() {

    var sceneLobby = {
        key: 'sceneLobby',
        preload: preloadGame,
        create: createGame,
        update: updateLobby
    };
    var sceneGame = {
        key: 'sceneGame',
        preload: preloadGame,
        create: createGame,
        update: updateGame
    };

    var config = {
        type: Phaser.auto,
        width: window.innerWidth,
        height: window.innerHeight,

        scene: [sceneLobby, sceneGame],

        scale: {
            autoCenter: Phaser.Scale.CENTER_BOTH,
        },

        physics: {
            default: 'arcade',
            arcade: {
                gravity: {
                    y: 3000
                },
                checkCollision: {
                    up: true,
                    down: false,
                    left: false,
                    right: true
                },
                debug: false
            }
        },

        parent: "gameDiv",

        dom: {
            createContainer: true
        },

        //backgroundColor: 0xDDDDDD
        backgroundColor: 0xFFFFFF,
    };
    game = new Phaser.Game(config);
}

//#region dichiarazione costanti 

var NUM_DINI = -1;
const NUM_TERRENI = 2;
const NUM_MONTAGNE = 10;
const NUM_CACTUS = 5;
const START_HEIGHT = 410;
const HEIGHT_SPACE = 30;
const START_DISTANCE_CACTUS = 900;
const START_DISTANCE_DINI = 240;
const TRANSLATION = 20;
const ALTEZZA_CACTUS = 50;
const ALTEZZA_DINI = 50;

var terreni;
var montagne;
var nuvola;
var colorDini = "0x";

var dini;
var cactus;
var linesGroup;
var heights;

var distanzaMinima;
var colliderDini;
var velocitaSfondo;
var punteggio;
var pAssegnati;

var ignoreCollisions = false;

var diniNicknames = [];
var textDiniNicknames = [];
var uids = [];
var diniJumps = [];
var diniColor = [];
//#endregion

function createListeners() {
    for (var i = 0; i < diniNicknames.length; i++) {
        if (diniNicknames[i].startsWith("guest_")) {
            db.ref("session/" + localStorage.getItem("sessionId") + "/" + diniNicknames[i]).on("child_changed", function(data) {
                var index = diniNicknames.indexOf((data.ref_.path.pieces_)[2]);
                var player_jump = data.val();
                if (player_jump && (data.ref_.path.pieces_)[3] == "is_jumping") {
                    diniJumps[index] = true;
                }
            });
        } else {
            db.ref("session/" + localStorage.getItem("sessionId") + "/" + uids[i]).on("child_changed", function(snapshot) {
                var index = uids.indexOf((snapshot.ref_.path.pieces_)[2]);
                var player_jump = snapshot.val();
                if (player_jump && (snapshot.ref_.path.pieces_)[3] == "is_jumping") {
                    diniJumps[index] = true;
                }
            });
        }
    }
}

//funzione preloadGame, carica gli assets per poi usarli nella scena gioco
function preloadGame() {
    this.load.image('terreno', host + 'img/terreno3.png');
    this.load.image('montagne', host + 'img/montagne.png');
    this.load.image('nuvola', host + 'img/Nuvola.png');
    this.load.image('cactus', host + 'img/Cactus.png');
    this.load.spritesheet('dinoSprite', host + 'img/dinoSprite.png', {
        frameWidth: 50,
        frameHeight: 52
    });
}

function updateLobby() {

    setTouchingDown();
    checkJump();
    if (runGame) {

        db.ref("session/" + localStorage.getItem("sessionId")).off("child_added", function(snapshot) {
            NUM_DINI++;
            rif.scene.restart();
        });

        this.scene.switch('sceneGame');
    }
}

function setStartValues() {
    terreni = new Array(NUM_TERRENI);

    montagne = new Array(NUM_MONTAGNE);

    nuvola;
    colorDini = "0x";

    dini = new Array(NUM_DINI);
    cactus = new Array(NUM_DINI);

    for (var i = 0; i < cactus.length; i++) {
        cactus[i] = new Array(NUM_CACTUS);
    }

    linesGroup = [];
    heights = new Array(NUM_DINI);

    distanzaMinima = 260;
    colliderDini = new Array(NUM_DINI);
    velocitaSfondo = 5;
    punteggio = new Array(NUM_DINI);
    for (var i = 0; i < punteggio.length; i++) {
        punteggio[i] = 0;
    }
    pAssegnati = new Array(NUM_DINI);
    for (var i = 0; i < pAssegnati.length; i++) {
        pAssegnati[i] = new Array(NUM_CACTUS);
    }

    for (var i = 0; i < pAssegnati.length; i++) {
        for (var j = 0; j < pAssegnati[i].length; j++) {
            pAssegnati[i][j] = false;
        }
    }

    for (var i = 0; i < diniNicknames.length; i++) {
        if (diniNicknames[i].startsWith("guest_")) {
            db.ref("session/" + localStorage.getItem("sessionId") + "/" + diniNicknames[i]).update({
                is_jumping: false
            });
        } else /*if (id.length == 28)*/ {
            db.ref("session/" + localStorage.getItem("sessionId") + "/" + uids[i]).update({
                is_jumping: false
            });
        }
    }
    createListeners();
}

function setDiniNicknames(gamescene) {
    for (var i = 0; i < diniNicknames.length; i++) {
        textDiniNicknames.push(gamescene.add.text(START_DISTANCE_DINI + (i * TRANSLATION) - 200, START_HEIGHT - 20 + HEIGHT_SPACE * i, diniNicknames[i], { fontFamily: 'Arial', fontSize: 20, color: '#000' }));
    }
}

function setColliderLines(gamescene) {
    linesGroup = gamescene.physics.add.staticGroup();
    for (var i = 0; i < NUM_DINI; i++) {
        var height = START_HEIGHT + (i * HEIGHT_SPACE);
        let line = gamescene.add.zone(0, height, innerWidth, 1)
        linesGroup.add(line);
        heights[i] = height;
    }
}

function setTerreni(gamescene) {
    var counter = 0;
    for (var i = 0; i < terreni.length; i++) {
        terreni[i] = gamescene.physics.add.image(counter, 368, 'terreno').setOrigin(0, 0);
        terreni[i].setImmovable(true); //fissa i terreni
        terreni[i].body.allowGravity = false; // toglie la gravità
        counter += 2000;
    }
}

function setMontagne(gamescene) {
    counter = 0;
    for (var i = 0; i < montagne.length; i++) {
        montagne[i] = gamescene.physics.add.image(counter, 275, 'montagne').setOrigin(0, 0);
        montagne[i].setImmovable(true); //fissa le montagne
        montagne[i].body.allowGravity = false; // toglie la gravità
        counter += 408;
    }
}

function setNuvola(gamescene) {
    nuvola = gamescene.add.image(1200, 255, 'nuvola').setOrigin(0, 0);
}

function setCactus(gamescene) {

    for (var i = 0; i < cactus.length; i++) {
        for (var j = 0; j < cactus[i].length; j++) {
            var distanza = Math.floor(Math.random() * 200) + 70;
            var x = 0;
            if (j == 0) {
                x = START_DISTANCE_CACTUS + (i * TRANSLATION);
            } else if (i == 0) {
                x = (cactus[i][j - 1]).x + distanzaMinima + distanza;
            } else {
                x = cactus[i - 1][j].x + TRANSLATION;
            }
            cactus[i][j] = gamescene.physics.add.image(x, START_HEIGHT + (i * HEIGHT_SPACE) - ALTEZZA_CACTUS, 'cactus').setOrigin(0, 0);
            cactus[i][j].setImmovable(true);
            cactus[i][j].body.allowGravity = false;
        }
    }
}

function setDini(gamescene) {
    graphics = gamescene.add.graphics({ lineStyle: { width: 4, color: 0xaa00aa } });
    for (var i = 0; i < dini.length; i++) {
        dini[i] = gamescene.physics.add.sprite(START_DISTANCE_DINI + (i * TRANSLATION), 0, 'dinoSprite').setOrigin(0, 0);
        dini[i].setTintFill(diniColor[i], diniColor[i], diniColor[i], diniColor[i]);
        dini[i].setCollideWorldBounds(true); //collisioni del dino con i bordi
        colliderDini[i] = gamescene.physics.add.collider(dini[i], linesGroup.getChildren()[i]);
        dini[i].play("run");
    }
}

function setAnimations(gamescene) {
    //animazione di corsa
    gamescene.anims.create({
        key: 'run',
        frames: gamescene.anims.generateFrameNumbers('dinoSprite', {
            start: 0,
            end: 1
        }),
        frameRate: 10,
        repeat: -1
    });

    //animazione di salto
    gamescene.anims.create({
        key: 'jump',
        frames: gamescene.anims.generateFrameNumbers('dinoSprite', {
            start: 2,
            end: 2
        }),
        frameRate: 10,
        repeat: -1
    });

    //animazione di morte
    gamescene.anims.create({
        key: 'death',
        frames: gamescene.anims.generateFrameNumbers('dinoSprite', {
            start: 3,
            end: 3
        }),
        frameRate: 10,
        repeat: -1
    });
}

function collideCactus(dino) {
    dino.setVelocityX(-200);
    var index = dini.indexOf(dino);
    dino.play("death");
    if (colliderDini[index] != null || colliderDini[index] != undefined) {
        this.physics.world.removeCollider(colliderDini[index]);
    }
}

function setColliderCactusDini(gamescene) {
    for (var i = 0; i < cactus.length; i++) {
        for (var j = 0; j < cactus[i].length; j++) {
            gamescene.physics.add.overlap(dini[i], cactus[i][j], collideCactus, null, gamescene);
        }
    }
}

//funzione createGame, crea nel canvas tutti i vari assets caricati nella funzione preload game
function createGame() {
    document.getElementById('sessionId').innerHTML = localStorage.getItem("sessionId");
    rif = this;
    setStartValues();
    setColliderLines(this);
    setTerreni(this);
    setMontagne(this);
    setNuvola(this);
    setCactus(this);
    setAnimations(this);
    setDini(this);
    if (!ignoreCollisions) { setColliderCactusDini(this); }
    setDiniNicknames(this);
}

function updateTerreni() {
    //terreni si spostano
    for (var i = 0; i < terreni.length; i++) {
        terreni[i].x -= velocitaSfondo;
    }

    //se escono completamente dal canvas vengono ridisegnati in fondo
    for (var i = 0; i < terreni.length; i++) {
        if (terreni[i].x < -2000) {
            terreni[i].x = 1100;
        }
    }
}

function updateMontagne() {
    //montagne si spostano
    for (var i = 0; i < montagne.length; i++) {
        montagne[i].x -= 1;
    }

    //se escono completamente dal canvas vengono ridisegnati infondo
    for (var i = 0; i < montagne.length; i++) {
        if (montagne[i].x < -2000) {
            montagne[i].x = 2000;
        }
    }
}

function updateCactus() {
    //cactus si spostano

    for (var i = 0; i < cactus.length; i++) {
        for (var j = 0; j < cactus[i].length; j++) {
            cactus[i][j].x -= velocitaSfondo;
        }
    }

    //cacactus riposizionamento

    for (var i = 0; i < cactus.length; i++) {
        for (var j = 0; j < cactus[i].length; j++) {
            if (cactus[i][j].x < -26) {
                if (i == 0) {
                    var num = 0;
                    if (j == 0) {
                        num = cactus[i].length - 1;
                    } else {
                        num = j - 1;
                    }
                    cactus[i][j].x = cactus[i][num].x + distanzaMinima + Math.floor(Math.random() * 200) + 70;
                } else {
                    cactus[i][j].x = cactus[i - 1][j].x + TRANSLATION;
                }
                pAssegnati[i][j] = false;
            }
        }
    }
}

function updateNuvola() {
    //movimento nuvola
    nuvola.x -= 3;

    //nuvola random
    if (nuvola.x < -97) {
        nuvola.x = Math.floor(Math.random() * 2000) + 900;
    }
}

function checkJump() {
    for (var i = 0; i < dini.length; i++) {
        if (diniJumps[i] && dini[i].body.touching.down) { // https://phaser.io/examples/v3/view/physics/arcade/body-on-a-path
            dini[i].play("jump");
            dini[i].setVelocityY(-950);
            dini[i].play("run");
            diniJumps[i] = false;
            if (diniNicknames[i].startsWith("guest_")) {
                db.ref('session/' + localStorage.getItem("sessionId") + "/" + diniNicknames[i]).update({ 'is_jumping': false });
            } else {
                db.ref('session/' + localStorage.getItem("sessionId") + "/" + uids[i]).update({
                    is_jumping: false
                });
            }
        }
    }
}

function setScore() {
    for (var i = 0; i < dini.length; i++) {
        for (var j = 0; j < cactus[i].length; j++) {
            if (dini[i].x > cactus[i][j].x + TRANSLATION && !pAssegnati[i][j]) {
                punteggio[i]++;
                pAssegnati[i][j] = true;
                setDifficulty();
            }
        }
    }
}

function setDifficulty() {
    velocitaSfondo += 0.2 / NUM_DINI;
    distanzaMinima += 6 / NUM_DINI;
}

function checkEndOfGame(game) {
    var check = true;
    for (var i = 0; i < dini.length; i++) {
        check = check && dini[i].x < -50;
    }

    if (check) {
        endOfTheGame(game);
        check = false;
    }
}


function setTouchingDown() {
    for (let i = 0; i < diniNicknames.length; i++) {
        if (diniNicknames[i].startsWith("guest_")) {
            db.ref('session/' + localStorage.getItem("sessionId") + "/" + diniNicknames[i]).update({ 'is_touchingDown': dini[i].body.touching.down });
        } else {
            db.ref('session/' + localStorage.getItem("sessionId") + "/" + uids[i]).update({ 'is_touchingDown': dini[i].body.touching.down });
        }
    }
}

//funzione updateGame, viene richiamata 60 volte al secondo, utilizzata per i movimenti nel animazione
function updateGame() {
    setTouchingDown();
    updateTerreni();
    updateMontagne();
    updateCactus();
    updateNuvola();
    checkJump();
    setScore();
    checkEndOfGame(this);
}

function endOfTheGame(game) {
    game.input.stopPropagation();
    leaderboard();
    game.scene.stop();
}

function startGame() {
    runGame = true;
    rif.scene.restart();
}

function leaderboard() {
    document.getElementById("game").style.display = "none";
    document.getElementById("leaderboard").style.display = "block";
    var result = {};
    diniNicknames.forEach((key, i) => result[key] = punteggio[i]);

    var items = Object.keys(result).map(function(key) {
        return [key, result[key]];
    });

    // Sort the array based on the second element
    items.sort(function(first, second) {
        return second[1] - first[1];
    });
    document.getElementById("restart").style.display = "block";
    document.getElementById("home").style.display = "block";
    var table = document.getElementById("leader_table");
    var medal = createMedal(0, 0, 100);
    var i = 1;
    for (const [key, value] of items) {
        var row = "";
        row += '<tr><th scope="row">' + i + '</th><td>' + key + '</td><td>' + value + '</td>';
        if (i == 1) {
            row += '<td><svg width="100px" height="100px">' + medal + '</svg></td>';
            if (!key.includes("guest")) {
                saveMedal(medal, key);
                saveScore(score, key);
            }
        } else {
            row += "<td></td>";
        }
        row += "</tr>"
        table.innerHTML += row;
        i++;
    }
}

function saveMedal(medal, nick) {
    db.ref('user/' + uids[diniNicknames.indexOf(nick)] + "/medals").push({
        medal
    });
}

function saveScore(score, nick) {
    db.ref('user/' + uids[diniNicknames.indexOf(nick)]).once("value", function(data) {
        var old_score = data.val().best_score
        if (score > old_score) {
            db.ref('user/' + uids[diniNicknames.indexOf(nick)]).update({
                score: score,
            });
        }
    });

}

function backToHome() {

    db.ref('session/' + localStorage.getItem("sessionId")).remove();
    window.open("./../GUI/login.html", "_self");
}