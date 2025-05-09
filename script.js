window.onload = function(){
    var w = window.innerWidth || 360;
    var h = window.innerHeight || 500;
    
    var tsw = (w > h) ? h : w;
    
    var sw = (tsw - 16)/8;
    
    var container = document.getElementById("container");
    for(var n = 0; n < 64; n++){
        var square = document.createElement("div");
        square.classList.add("square");
        square.classList.add("s"+n);
        square.style.height = sw + 'px';
        square.style.width = sw + 'px';
        square.style.top = 7+(h-tsw)/2+sw*(Math.floor(n/8)) + 'px';
        square.style.left = 7+(w-tsw)/2+sw*(n%8) + 'px';
        square.style.fontSize = sw*3/4 + 'px';
        container.appendChild(square);
    }

    var fonts = {
        'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
        'l': '♔', 'w': '♕', 't': '♖', 'v': '♗', 'm': '♘', 'o': '♙'
    };
    
    var values = ['r','n','b','q','k','b','n','r','p','p','p','p','p','p','p','p',0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,'o','o','o','o','o','o','o','o','t','m','v','w','l','v','m','t'];
    var ck = false; // Black king moved
    var cr1 = false; // Black queenside rook moved
    var cr2 = false; // Black kingside rook moved
    var cl; // Castling flag
    
    var sqs = document.getElementsByClassName("square");

    for(var n = 0; n < 64; n++){
        if(values[n] !== 0){
           sqs[n].innerHTML = fonts[values[n]];
        }
        sqs[n].addEventListener("click", check);
    }
    
    function updateSquarecolor(){
        for(var n = 0; n < 64; n++){
            var row = Math.floor(n/8);
            var col = n%8;
            if((row%2) === (col%2)){
                sqs[n].style.background = '#9ff';
            } else {
                sqs[n].style.background = '#5fa';
            }
        }
    }
    
    updateSquarecolor();

    var moveable = false;
    var moveTarget = -1;
    var moveScopes = [];

    // Initialize Stockfish
    var stockfish = new Worker('https://cdn.jsdelivr.net/npm/stockfish@14.1.0/stockfish.wasm.js');
    stockfish.postMessage('uci');
    stockfish.postMessage('isready');

    function checkBlack(n, values){
        var target = values[n];
        var scopes = [];
        var row = Math.floor(n/8);
        var col = n%8;
       
        if(target === "o"){ // White pawn (black player)
            var x = n - 8;
            if(x >= 0 && values[x] === 0){
                scopes.push(x);
                if(row === 6 && values[x-8] === 0){
                    scopes.push(x-8);
                }
            }
            if(x >= 0 && col > 0 && "prnbqk".indexOf(values[x-1]) >= 0){
                scopes.push(x-1);
            }
            if(x >= 0 && col < 7 && "prnbqk".indexOf(values[x+1]) >= 0){
                scopes.push(x+1);
            }
        }
       
        else if(target === "t"){ // White rook
            for(var i = n-8; i >= 0; i -= 8){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+8; i < 64; i += 8){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+1; i%8 !== 0; i++){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n-1; i%8 !== 7 && i >= 0; i--){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
        }
        
        else if(target === "m"){ // White knight
            var moves = [-17, -15, -10, -6, 6, 10, 15, 17];
            for(var m of moves){
                var i = n + m;
                if(i >= 0 && i < 64){
                    var newCol = i%8;
                    var newRow = Math.floor(i/8);
                    if(Math.abs(newCol - col) <= 2 && Math.abs(newRow - row) <= 2){
                        if(values[i] === 0 || "prnbqk".indexOf(values[i]) >= 0){
                            scopes.push(i);
                        }
                    }
                }
            }
        }
        
        else if(target === "v"){ // White bishop
            for(var i = n-9; i >= 0 && i%8 !== 7; i -= 9){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+9; i < 64 && i%8 !== 0; i += 9){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n-7; i >= 0 && i%8 !== 0; i -= 7){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+7; i < 64 && i%8 !== 7; i += 7){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
        }
       
        else if(target === "w"){ // White queen
            for(var i = n-8; i >= 0; i -= 8){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+8; i < 64; i += 8){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+1; i%8 !== 0; i++){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n-1; i%8 !== 7 && i >= 0; i--){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n-9; i >= 0 && i%8 !== 7; i -= 9){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+9; i < 64 && i%8 !== 0; i += 9){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n-7; i >= 0 && i%8 !== 0; i -= 7){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+7; i < 64 && i%8 !== 7; i += 7){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("prnbqk".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
        }
        
        else if(target === "l"){ // White king
            var moves = [-8, 8, -1, 1, -9, 9, -7, 7];
            for(var m of moves){
                var i = n + m;
                if(i >= 0 && i < 64 && Math.abs((i%8) - col) <= 1 && Math.abs(Math.floor(i/8) - row) <= 1){
                    if(values[i] === 0 || "prnbqk".indexOf(values[i]) >= 0){
                        scopes.push(i);
                    }
                }
            }
            if(!ck && row === 7 && n === 60){
                if(!cr2 && values[61] === 0 && values[62] === 0 && values[63] === "t"){
                    scopes.push(62);
                    cl = true;
                }
                if(!cr1 && values[59] === 0 && values[58] === 0 && values[57] === 0 && values[56] === "t"){
                    scopes.push(58);
                    cl = true;
                }
            }
        }
        return scopes;
    }

    function checkWhite(n, values){
        var target = values[n];
        var scopes = [];
        var row = Math.floor(n/8);
        var col = n%8;
        
    if(target === "p"){
            var x = n + 8;
            if(x < 64 && values[x] === 0){
                scopes.push(x);
                if(row === 1 && values[x+8] === 0){
                    scopes.push(x+8);
                }
            }
            if(x < 64 && col > 0 && "otmvlw".indexOf(values[x-1]) >= 0){
                scopes.push(x-1);
            }
            if(x < 64 && col < 7 && "otmvlw".indexOf(values[x+1]) >= 0){
                scopes.push(x+1);
            }
        }
        
        else if(target === "r"){
            for(var i = n-8; i >= 0; i -= 8){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+8; i < 64; i += 8){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+1; i%8 !== 0; i++){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n-1; i%8 !== 7 && i >= 0; i--){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
        }
        
        else if(target === "n"){
            var moves = [-17, -15, -10, -6, 6, 10, 15, 17];
            for(var m of moves){
                var i = n + m;
                if(i >= 0 && i < 64){
                    var newCol = i%8;
                    var newRow = Math.floor(i/8);
                    if(Math.abs(newCol - col) <= 2 && Math.abs(newRow - row) <= 2){
                        if(values[i] === 0 || "otmvlw".indexOf(values[i]) >= 0){
                            scopes.push(i);
                        }
                    }
                }
            }
        }
     
        else if(target === "b"){
            for(var i = n-9; i >= 0 && i%8 !== 7; i -= 9){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+9; i < 64 && i%8 !== 0; i += 9){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n-7; i >= 0 && i%8 !== 0; i -= 7){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+7; i < 64 && i%8 !== 7; i += 7){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
        }
        
        else if(target === "q"){
            for(var i = n-8; i >= 0; i -= 8){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+8; i < 64; i += 8){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+1; i%8 !== 0; i++){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n-1; i%8 !== 7 && i >= 0; i--){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n-9; i >= 0 && i%8 !== 7; i -= 9){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+9; i < 64 && i%8 !== 0; i += 9){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n-7; i >= 0 && i%8 !== 0; i -= 7){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
            for(var i = n+7; i < 64 && i%8 !== 7; i += 7){
                if(values[i] === 0){
                    scopes.push(i);
                } else if("otmvlw".indexOf(values[i]) >= 0){
                    scopes.push(i);
                    break;
                } else {
                    break;
                }
            }
        }
        
        else if(target === "k"){
            var moves = [-8, 8, -1, 1, -9, 9, -7, 7];
            for(var m of moves){
                var i = n + m;
                if(i >= 0 && i < 64 && Math.abs((i%8) - col) <= 1 && Math.abs(Math.floor(i/8) - row) <= 1){
                    if(values[i] === 0 || "otmvlw".indexOf(values[i]) >= 0){
                        scopes.push(i);
                    }
                }
            }
        }
        return scopes;
    }

    var myTurn = true;

    function boardToFEN(values) {
        var fen = '';
        for (var row = 7; row >= 0; row--) {
            var emptyCount = 0;
            for (var col = 0; col < 8; col++) {
                var idx = row * 8 + col;
                var piece = values[idx];
                if (piece === 0) {
                    emptyCount++;
                } else {
                    if (emptyCount > 0) {
                        fen += emptyCount;
                        emptyCount = 0;
                    }
                    var fenPiece = {
                        'k': 'k', 'q': 'q', 'r': 'r', 'b': 'b', 'n': 'n', 'p': 'p',
                        'l': 'K', 'w': 'Q', 't': 'R', 'v': 'B', 'm': 'N', 'o': 'P'
                    }[piece];
                    fen += fenPiece;
                }
            }
            if (emptyCount > 0) {
                fen += emptyCount;
            }
            if (row > 0) {
                fen += '/';
            }
        }
        fen += myTurn ? ' b' : ' w';
        var castling = '';
        if (!ck) {
            if (!cr1) castling += 'Q';
            if (!cr2) castling += 'K';
        }
        fen += ' ' + (castling || '-') + ' - 0 1';
        return fen;
    }

    function uciToIndices(uci) {
        var from = uci.slice(0, 2);
        var to = uci.slice(2, 4);
        var fromFile = from.charCodeAt(0) - 'a'.charCodeAt(0);
        var fromRank = parseInt(from[1]) - 1;
        var toFile = to.charCodeAt(0) - 'a'.charCodeAt(0);
        var toRank = parseInt(to[1]) - 1;
        var fromIdx = fromRank * 8 + fromFile;
        var toIdx = toRank * 8 + toFile;
        return [fromIdx, toIdx];
    }

    function check() {
        if (!myTurn) return;
        var n = Number(this.classList[1].slice(1));
        console.log('Clicked square:', n); // Debug click

        if (!moveable) {
            if ("otmvlw".indexOf(values[n]) >= 0) { // Select white piece (black player)
                moveScopes = checkBlack(n, values) || [];
                console.log('Valid moves:', moveScopes); // Debug scopes
                if (moveScopes.length > 0) {
                    moveable = true;
                    moveTarget = n;
                    updateSquarecolor();
                    for (var x of moveScopes) {
                        sqs[x].style.background = "#f45";
                    }
                }
            }
        } else {
            if (moveScopes.includes(n)) {
                var checkArr = values.slice();
                checkArr[n] = checkArr[moveTarget];
                checkArr[moveTarget] = 0;
                
                var saveKing = false;
                for (var y = 0; y < 64; y++) {
                    if ("prnbkq".indexOf(checkArr[y]) >= 0) {
                        var checkScp = checkWhite(y, checkArr) || [];
                        for (var z of checkScp) {
                            if (checkArr[z] === 'l') {
                                alert('Save Your King');
                                saveKing = true;
                                break;
                            }
                        }
                        if (saveKing) break;
                    }
                }
                
                if (!saveKing) {
                    values[n] = values[moveTarget];
                    values[moveTarget] = 0;
                    if (cl) {
                        if (n === 62 && moveTarget === 60) {
                            values[63] = 0;
                            values[61] = "t";
                        } else if (n === 58 && moveTarget === 60) {
                            values[59] = "t";
                            values[56] = 0;
                        }
                    }
                    if (moveTarget === 60) {
                        ck = true;
                    } else if (moveTarget === 63) {
                        cr2 = true;
                    } else if (moveTarget === 56) {
                        cr1 = true;
                    }
                    if (values[n] === "o" && Math.floor(n/8) === 0) {
                        values[n] = "w"; // Promote to queen
                    }
                    moveable = false;
                    moveScopes = [];
                    myTurn = false;
                    
                    updateSquarecolor();
                    for (var x = 0; x < 64; x++) {
                        sqs[x].innerHTML = fonts[values[x]] || '';
                    }
                    sqs[n].style.background = '#aaf';
                    sqs[moveTarget].style.background = '#aaf';
                    
                    setTimeout(chooseTurn, 1000);
                }
            } else {
                moveable = false;
                moveScopes = [];
                updateSquarecolor();
                for (var x = 0; x < 64; x++) {
                    sqs[x].innerHTML = fonts[values[x]] || '';
                }
            }
        }
    }

    function chooseTurn() {
        var fen = boardToFEN(values);
        console.log('FEN:', fen); // Debug FEN
        stockfish.onmessage = function(event) {
            var message = event.data;
            console.log('Stockfish:', message); // Debug Stockfish
            if (message.startsWith('bestmove')) {
                var bestMove = message.split(' ')[1];
                if (bestMove === '(none)') {
                    alert('Game Over: Checkmate or Stalemate');
                    return;
                }
                var [fromIdx, toIdx] = uciToIndices(bestMove);
                var piece = values[fromIdx];
                values[toIdx] = piece;
                values[fromIdx] = 0;

                if (piece === 'p' && Math.floor(toIdx/8) === 7) {
                    values[toIdx] = 'q';
                }

                if (fromIdx === 4) {
                    ck = true;
                } else if (fromIdx === 0) {
                    cr1 = true;
                } else if (fromIdx === 7) {
                    cr2 = true;
                }

                if (piece === 'k') {
                    if (fromIdx === 4 && toIdx === 6) {
                        values[5] = 'r';
                        values[7] = 0;
                    } else if (fromIdx === 4 && toIdx === 2) {
                        values[3] = 'r';
                        values[0] = 0;
                    }
                }

                updateSquarecolor();
                for (var x = 0; x < 64; x++) {
                    sqs[x].innerHTML = fonts[values[x]] || '';
                }
                sqs[toIdx].style.background = '#aaf';
                sqs[fromIdx].style.background = '#aaf';

                var checkArr = values.slice();
                for (var y = 0; y < 64; y++) {
                    if ("prnbkq".indexOf(checkArr[y]) >= 0) {
                        var checkScp = checkWhite(y, checkArr) || [];
                        for (var z of checkScp) {
                            if (checkArr[z] === 'l') {
                                alert('Check!');
                                break;
                            }
                        }
                    }
                }

                myTurn = true;
            }
        };
        stockfish.postMessage('position fen ' + fen);
        stockfish.postMessage('go movetime 1000');
    }
}