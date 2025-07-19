/**
 * Pad Thai AI Engine for Checkers
 *
 * This standalone AI engine provides functions for checkers game logic,
 * including move generation, forced capture detection, board evaluation,
 * and a Minimax algorithm with Alpha-Beta Pruning to find the best move.
 *
 * It does not include any UI or game state management (like current player,
 * selected piece, etc.). It operates purely on a given board state.
 */
const PadThaiAI = {
    // --- Game Constants (should match your game's constants) ---
    BOARD_SIZE: 8,
    EMPTY: 0,
    WHITE_PIECE: 1,
    BLACK_PIECE: 2,
    WHITE_KING: 3,
    BLACK_KING: 4,

    PLAYER_WHITE: 1, // Corresponds to WHITE_PIECE
    PLAYER_BLACK: 2, // Corresponds to BLACK_PIECE

    /**
     * Checks if a given piece belongs to a specific player.
     * @param {number} piece - The piece value (e.g., WHITE_PIECE, BLACK_KING).
     * @param {number} player - The player constant (PLAYER_WHITE or PLAYER_BLACK).
     * @returns {boolean} True if the piece belongs to the player, false otherwise.
     */
    isPlayerPiece: function(piece, player) {
        if (player === this.PLAYER_WHITE) {
            return piece === this.WHITE_PIECE || piece === this.WHITE_KING;
        } else {
            return piece === this.BLACK_PIECE || piece === this.BLACK_KING;
        }
    },

    /**
     * Checks if a piece is a king.
     * @param {number} piece - The piece value.
     * @returns {boolean} True if the piece is a king, false otherwise.
     */
    isKing: function(piece) {
        return piece === this.WHITE_KING || piece === this.BLACK_KING;
    },

    /**
     * Helper function to validate move object structure.
     * A move object should have `from` and `to` properties, each with `row` and `col`.
     * It may also have an optional `captured` property.
     * @param {object} move - The move object to validate.
     * @returns {boolean} True if the move object is valid, false otherwise.
     */
    isValidMoveObject: function(move) {
        return move && typeof move.from === 'object' && typeof move.to === 'object' &&
               typeof move.from.row === 'number' && typeof move.from.col === 'number' &&
               typeof move.to.row === 'number' && typeof move.to.col === 'number';
    },

    /**
     * Calculates all possible regular moves and capture moves for a piece at (row, col).
     * @param {Array<Array<number>>} boardState - The current state of the board.
     * @param {number} row - The row of the piece.
     * @param {number} col - The column of the piece.
     * @param {boolean} isForcedCaptureCheck - If true, only checks for captures (used internally by findForcedCaptures).
     * @returns {{moves: Array<object>, captures: Array<object>}} An object containing arrays of regular moves and capture moves.
     */
    getPossibleMoves: function(boardState, row, col, isForcedCaptureCheck = false) {
        const piece = boardState[row][col];
        const moves = []; // For non-capture moves
        const captures = []; // For capture moves

        if (piece === this.EMPTY) return { moves, captures };

        const isWhite = this.isPlayerPiece(piece, this.PLAYER_WHITE);
        const isBlack = this.isPlayerPiece(piece, this.PLAYER_BLACK);
        const isKingPiece = this.isKing(piece);

        // Define directions for regular pieces
        const regularPieceDirections = [];
        if (isWhite) {
            regularPieceDirections.push({ dr: -1, dc: -1 }, { dr: -1, dc: 1 }); // White moves up (rows decrease)
        } else if (isBlack) {
            regularPieceDirections.push({ dr: 1, dc: -1 }, { dr: 1, dc: 1 }); // Black moves down (rows increase)
        }

        // Directions for kings (all 4 diagonals)
        const kingDirections = [
            { dr: -1, dc: -1 }, { dr: -1, dc: 1 },
            { dr: 1, dc: -1 }, { dr: 1, dc: 1 }
        ];

        const directionsToUse = isKingPiece ? kingDirections : regularPieceDirections;

        for (const { dr, dc } of directionsToUse) {
            let currentR = row + dr;
            let currentC = col + dc;

            if (!isKingPiece) { // Logic for regular pieces
                // Regular move
                if (!isForcedCaptureCheck &&
                    currentR >= 0 && currentR < this.BOARD_SIZE && currentC >= 0 && currentC < this.BOARD_SIZE &&
                    boardState[currentR][currentC] === this.EMPTY) {
                    moves.push({ from: { row, col }, to: { row: currentR, col: currentC } });
                }

                // Capture move
                const jumpedR = row + 2 * dr;
                const jumpedC = col + 2 * dc;

                if (currentR >= 0 && currentR < this.BOARD_SIZE && currentC >= 0 && currentC < this.BOARD_SIZE &&
                    jumpedR >= 0 && jumpedR < this.BOARD_SIZE && jumpedC >= 0 && jumpedC < this.BOARD_SIZE) {
                    const jumpedPiece = boardState[currentR][currentC];
                    const landingSquare = boardState[jumpedR][jumpedC];

                    if (jumpedPiece !== this.EMPTY && landingSquare === this.EMPTY &&
                        ((isWhite && (jumpedPiece === this.BLACK_PIECE || jumpedPiece === this.BLACK_KING)) ||
                        (isBlack && (jumpedPiece === this.WHITE_PIECE || jumpedPiece === this.WHITE_KING)))) {
                        captures.push({ from: { row, col }, to: { row: jumpedR, col: jumpedC }, captured: { row: currentR, col: currentC } });
                    }
                }
            } else { // Logic for King pieces (can move/capture multiple squares)
                let potentialCapturedPiece = null; // Stores the first opponent piece encountered in this direction

                while (currentR >= 0 && currentR < this.BOARD_SIZE && currentC >= 0 && currentC < this.BOARD_SIZE) {
                    const squareContent = boardState[currentR][currentC];

                    if (squareContent === this.EMPTY) {
                        if (!potentialCapturedPiece) {
                            // King can move any number of empty squares if no piece has been encountered yet
                            if (!isForcedCaptureCheck) { // Only add non-capture moves if not checking for forced captures
                                moves.push({ from: { row, col }, to: { row: currentR, col: currentC } });
                            }
                        } else {
                            // If an opponent's piece was found (potentialCapturedPiece), this empty square is a valid landing spot after capture
                            captures.push({ from: { row, col }, to: { row: currentR, col: currentC }, captured: potentialCapturedPiece });
                        }
                    } else if (this.isPlayerPiece(squareContent, isWhite ? this.PLAYER_WHITE : this.PLAYER_BLACK)) {
                        // Blocked by own piece
                        break;
                    } else { // Opponent's piece
                        if (potentialCapturedPiece) {
                            // Already found one opponent piece to capture in this direction, cannot capture another in the same "jump"
                            break;
                        }
                        // Found the first opponent piece, mark it as potential to capture
                        potentialCapturedPiece = { row: currentR, col: currentC };
                    }
                    currentR += dr;
                    currentC += dc;
                }
            }
        }
        return { moves, captures };
    },

    /**
     * Gets all possible moves (regular and capture) for a given player on the board.
     * @param {Array<Array<number>>} boardState - The current state of the board.
     * @param {number} player - The player constant (PLAYER_WHITE or PLAYER_BLACK).
     * @returns {{allMoves: Array<object>, allCaptures: Array<object>}} An object containing arrays of all regular moves and all capture moves for the player.
     */
    getAllPossibleMovesForPlayer: function(boardState, player) {
        let allMoves = [];
        let allCaptures = [];

        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                const piece = boardState[r][c];
                if (this.isPlayerPiece(piece, player)) {
                    const { moves, captures } = this.getPossibleMoves(boardState, r, c);
                    allMoves = allMoves.concat(moves);
                    allCaptures = allCaptures.concat(captures);
                }
            }
        }
        return { allMoves, allCaptures };
    },

    /**
     * Finds all longest possible forced capture sequences for a given player.
     * If multiple sequences have the same maximum length, all are returned.
     * @param {Array<Array<number>>} boardState - The current state of the board.
     * @param {number} player - The player constant (PLAYER_WHITE or PLAYER_BLACK).
     * @returns {Array<Array<object>>} An array of capture sequences. Each sequence is an array of move objects.
     */
    findForcedCaptures: function(boardState, player) {
        const { allCaptures } = this.getAllPossibleMovesForPlayer(boardState, player);
        if (allCaptures.length === 0) {
            return []; // No captures available
        }

        let longestCaptures = [];
        let maxLen = 0;

        // Iterate through all initial capture possibilities
        for (const initialCapture of allCaptures) {
            if (!this.isValidMoveObject(initialCapture)) {
                console.warn("Skipping malformed initial capture:", initialCapture);
                continue;
            }

            // Recursive function to find all possible capture sequences
            const findSequences = (currentBoard, currentMove, currentSequence) => {
                if (!this.isValidMoveObject(currentMove)) {
                    console.warn("Skipping malformed current move in sequence:", currentMove);
                    return;
                }

                const nextBoard = this.applyMove(currentBoard, currentMove); // Apply the current jump
                const pieceAtNewPos = nextBoard[currentMove.to.row][currentMove.to.col];

                // If the piece is no longer there (e.g., due to an error in applyMove), stop this branch
                if (pieceAtNewPos === this.EMPTY || !this.isPlayerPiece(pieceAtNewPos, player)) {
                    if (currentSequence.length > maxLen) {
                        maxLen = currentSequence.length;
                        longestCaptures = [currentSequence];
                    } else if (currentSequence.length === maxLen) {
                        longestCaptures.push(currentSequence);
                    }
                    return;
                }

                const { captures: nextCaptures } = this.getPossibleMoves(nextBoard, currentMove.to.row, currentMove.to.col, true);

                let foundFurtherCapture = false;
                for (const nextCap of nextCaptures) {
                    if (!this.isValidMoveObject(nextCap)) {
                        console.warn("Skipping malformed next capture in findSequences:", nextCap);
                        continue;
                    }

                    if (nextCap.from.row === currentMove.to.row && nextCap.from.col === currentMove.to.col) {
                        foundFurtherCapture = true;
                        findSequences(nextBoard, nextCap, [...currentSequence, nextCap]);
                    }
                }

                if (!foundFurtherCapture) { // If no further captures from this sequence, it's a complete sequence
                    if (currentSequence.length > maxLen) {
                        maxLen = currentSequence.length;
                        longestCaptures = [currentSequence]; // Start a new list of longest sequences
                    } else if (currentSequence.length === maxLen) {
                        longestCaptures.push(currentSequence); // Add to the list if same length
                    }
                }
            };
            findSequences(boardState, initialCapture, [initialCapture]);
        }
        return longestCaptures.filter(sequence => {
            if (!Array.isArray(sequence) || sequence.length === 0) return false;
            for (const move of sequence) {
                if (!this.isValidMoveObject(move)) {
                    console.warn("Filtered out a malformed sequence at the end:", sequence);
                    return false;
                }
            }
            return true;
        });
    },

    /**
     * Applies a given move to a board state and returns the new board state.
     * This function does not modify the original boardState.
     * @param {Array<Array<number>>} currentBoard - The board state before the move.
     * @param {object} move - The move object ({from: {row, col}, to: {row, col}, captured: {row, col} (optional)}).
     * @returns {Array<Array<number>>} The new board state after the move.
     */
    applyMove: function(currentBoard, move) {
        if (!this.isValidMoveObject(move)) {
            console.error("Invalid move object passed to applyMove:", move);
            return currentBoard.map(row => [...row]); // Return a deep copy of original to prevent unintended modifications
        }

        const newBoard = currentBoard.map(row => [...row]); // Deep copy the board
        const piece = newBoard[move.from.row][move.from.col];

        newBoard[move.to.row][move.to.col] = piece;
        newBoard[move.from.row][move.from.col] = this.EMPTY;

        if (move.captured && typeof move.captured.row !== 'undefined' && typeof move.captured.col !== 'undefined') {
            newBoard[move.captured.row][move.captured.col] = this.EMPTY;
        }

        // Promote to King
        if (piece === this.WHITE_PIECE && move.to.row === 0) {
            newBoard[move.to.row][move.to.col] = this.WHITE_KING;
        } else if (piece === this.BLACK_PIECE && move.to.row === this.BOARD_SIZE - 1) {
            newBoard[move.to.row][move.to.col] = this.BLACK_KING;
        }

        return newBoard;
    },

    /**
     * Evaluates the given board state and returns a score.
     * Positive scores favor White, negative scores favor Black.
     * @param {Array<Array<number>>} boardState - The board state to evaluate.
     * @returns {number} The evaluation score.
     */
    evaluateBoard: function(boardState) {
        let score = 0;
        for (let r = 0; r < this.BOARD_SIZE; r++) {
            for (let c = 0; c < this.BOARD_SIZE; c++) {
                const piece = boardState[r][c];
                if (piece === this.WHITE_PIECE) {
                    score += 1;
                    score += (this.BOARD_SIZE - 1 - r) * 0.1; // Positional advantage for white moving forward
                } else if (piece === this.WHITE_KING) {
                    score += 5; // Kings are more valuable
                } else if (piece === this.BLACK_PIECE) {
                    score -= 1;
                    score -= r * 0.1; // Positional advantage for black moving forward
                } else if (piece === this.BLACK_KING) {
                    score -= 5;
                }
            }
        }
        return score;
    },

    /**
     * The Minimax algorithm with Alpha-Beta Pruning.
     * @param {Array<Array<number>>} boardState - The current board state.
     * @param {number} depth - The current depth of the search.
     * @param {number} alpha - Alpha value for pruning.
     * @param {number} beta - Beta value for pruning.
     * @param {boolean} maximizingPlayer - True if the current player is maximizing (White), false if minimizing (Black).
     * @returns {number} The best evaluation score found for the current player.
     */
    minimax: function(boardState, depth, alpha, beta, maximizingPlayer) {
        // Base case: if depth is 0 or game is over (not handled here, assumed by external caller)
        if (depth === 0) {
            return this.evaluateBoard(boardState);
        }

        const playerToMove = maximizingPlayer ? this.PLAYER_WHITE : this.PLAYER_BLACK;
        const currentForcedCaptures = this.findForcedCaptures(boardState, playerToMove);
        const { allMoves } = this.getAllPossibleMovesForPlayer(boardState, playerToMove);

        // Determine which moves to consider (forced captures take precedence)
        let movesToConsider = currentForcedCaptures.length > 0 ? currentForcedCaptures : allMoves.map(m => [m]); // Ensure it's an array of sequences

        // If no moves are possible for the current player, return a very high/low score
        if (movesToConsider.flat().length === 0) {
            return maximizingPlayer ? -Infinity : Infinity;
        }

        if (maximizingPlayer) {
            let maxEval = -Infinity;
            for (const sequenceOrMove of movesToConsider) {
                let currentSequence;
                if (Array.isArray(sequenceOrMove) && Array.isArray(sequenceOrMove[0])) {
                    currentSequence = sequenceOrMove;
                } else if (Array.isArray(sequenceOrMove)) {
                    currentSequence = sequenceOrMove;
                } else {
                    currentSequence = [sequenceOrMove];
                }

                let simulatedBoard = JSON.parse(JSON.stringify(boardState)); // Deep copy for simulation
                for (const move of currentSequence) {
                    if (!this.isValidMoveObject(move)) {
                        console.error("Invalid move in minimax sequence (maximizing):", move);
                        simulatedBoard = JSON.parse(JSON.stringify(boardState)); // Reset board to prevent cascading errors
                        break;
                    }
                    simulatedBoard = this.applyMove(simulatedBoard, move);
                }

                const evalScore = this.minimax(simulatedBoard, depth - 1, alpha, beta, false);
                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }
            return maxEval;
        } else { // Minimizing player (Black)
            let minEval = Infinity;
            for (const sequenceOrMove of movesToConsider) {
                let currentSequence;
                if (Array.isArray(sequenceOrMove) && Array.isArray(sequenceOrMove[0])) {
                    currentSequence = sequenceOrMove;
                } else if (Array.isArray(sequenceOrMove)) {
                    currentSequence = sequenceOrMove;
                } else {
                    currentSequence = [sequenceOrMove];
                }

                let simulatedBoard = JSON.parse(JSON.stringify(boardState)); // Deep copy for simulation
                for (const move of currentSequence) {
                    if (!this.isValidMoveObject(move)) {
                        console.error("Invalid move in minimax sequence (minimizing):", move);
                        simulatedBoard = JSON.parse(JSON.stringify(boardState)); // Reset board to prevent cascading errors
                        break;
                    }
                    simulatedBoard = this.applyMove(simulatedBoard, move);
                }

                const evalScore = this.minimax(simulatedBoard, depth - 1, alpha, beta, true);
                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) {
                    break; // Alpha-beta pruning
                }
            }
            return minEval;
        }
    },

    /**
     * Finds the best move for a given player using the Minimax algorithm.
     * @param {Array<Array<number>>} boardState - The current board state.
     * @param {number} player - The player for whom to find the best move (PLAYER_WHITE or PLAYER_BLACK).
     * @param {number} depth - The search depth for the Minimax algorithm.
     * @returns {object|null} The best move object ({from: {row, col}, to: {row, col}, captured: {row, col} (optional)})
     * or null if no moves are possible.
     */
    findBestMove: function(boardState, player, depth) {
        let bestMove = null;
        let bestValue = player === this.PLAYER_WHITE ? -Infinity : Infinity;

        const currentForcedCaptures = this.findForcedCaptures(boardState, player);
        const { allMoves } = this.getAllPossibleMovesForPlayer(boardState, player);

        let movesToConsider = currentForcedCaptures.length > 0 ? currentForcedCaptures : allMoves.map(m => [m]); // Ensure it's an array of sequences

        if (movesToConsider.flat().length === 0) {
            return null;
        }

        // Shuffle moves to add some randomness to AI play at the same evaluation score
        movesToConsider.sort(() => Math.random() - 0.5);

        for (const sequenceOrMove of movesToConsider) {
            let currentSequence;
            if (Array.isArray(sequenceOrMove) && Array.isArray(sequenceOrMove[0])) {
                currentSequence = sequenceOrMove;
            } else if (Array.isArray(sequenceOrMove)) {
                currentSequence = sequenceOrMove;
            } else {
                currentSequence = [sequenceOrMove];
            }

            if (!currentSequence[0] || !this.isValidMoveObject(currentSequence[0])) {
                console.error("Invalid sequence/move in findBestMove iteration:", currentSequence);
                continue;
            }

            let simulatedBoard = JSON.parse(JSON.stringify(boardState)); // Deep copy for simulation
            for (const move of currentSequence) {
                if (!this.isValidMoveObject(move)) {
                    console.error("Invalid move within sequence in findBestMove:", move);
                    simulatedBoard = JSON.parse(JSON.stringify(boardState)); // Reset board to prevent cascading errors
                    break;
                }
                simulatedBoard = this.applyMove(simulatedBoard, move);
            }

            const moveValue = this.minimax(simulatedBoard, depth - 1, -Infinity, Infinity, player === this.PLAYER_BLACK);

            if (player === this.PLAYER_WHITE) {
                if (moveValue > bestValue) {
                    bestValue = moveValue;
                    bestMove = currentSequence[0]; // Store the first move of the best sequence
                }
            } else { // PLAYER_BLACK (minimizing)
                if (moveValue < bestValue) {
                    bestValue = moveValue;
                    bestMove = currentSequence[0]; // Store the first move of the best sequence
                }
            }
        }
        return bestMove;
    }
};



