const boardElement = document.getElementById('board');
const currentTurnDisplay = document.getElementById('currentTurn');
const resetButton = document.getElementById('resetButton');
const gameOverOverlay = document.querySelector('.game-over-overlay');
const gameOverMessage = document.getElementById('gameOverMessage');
const restartButton = document.getElementById('restartButton');
const flashEffect = document.getElementById('flashEffect'); // フラッシュエフェクト要素を追加

const BOARD_SIZE = 11; // 11x11の交点を持つ盤面
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

let board = [];
let currentTurn;
let gameOver;
let CELL_SIZE; // Make CELL_SIZE dynamic

// --- ゲーム初期化 --- //
function initGame() {
    board = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(EMPTY));
    gameOver = false;
    gameOverOverlay.classList.add('hidden');
    resetButton.classList.remove('hidden');
    currentTurn = BLACK; // 黒から開始
    updateTurnDisplay();

    // Get actual heights of non-board elements
    // These elements are direct children of game-container, which is a flex column.
    // Their heights contribute to the total height of the game-container.
    const h1 = document.querySelector('h1');
    const statusArea = document.querySelector('.status-area');
    const controls = document.querySelector('.controls');

    const h1Height = h1 ? h1.offsetHeight : 0;
    const statusAreaHeight = statusArea ? statusArea.offsetHeight : 0;
    const controlsHeight = controls ? controls.offsetHeight : 0;

    // Total fixed vertical space taken by non-board elements and game-container padding
    // game-container has padding: 20px; (top and bottom)
    const fixedVerticalSpace = h1Height + statusAreaHeight + controlsHeight + (20 * 2); // 20px padding top/bottom

    // Total fixed horizontal space taken by game-container padding
    const fixedHorizontalSpace = 20 * 2; // 20px padding left/right

    // Calculate available space for the board
    const availableWidthForBoard = window.innerWidth - fixedHorizontalSpace;
    const availableHeightForBoard = window.innerHeight - fixedVerticalSpace;

    // Calculate CELL_SIZE based on the smaller of the available dimensions for the board
    // Divide by (BOARD_SIZE - 1) because the board is (BOARD_SIZE-1) * CELL_SIZE
    CELL_SIZE = Math.floor(Math.min(availableWidthForBoard / (BOARD_SIZE - 1), availableHeightForBoard / (BOARD_SIZE - 1)));

    // Ensure a minimum cell size for usability
    CELL_SIZE = Math.max(CELL_SIZE, 20); // Minimum 20px per cell

    // Scale down the board to 2/3 of the calculated size
    CELL_SIZE = Math.floor(CELL_SIZE * (2/3));

    // CSS変数に盤面サイズとセルサイズを設定
    document.documentElement.style.setProperty('--board-size', BOARD_SIZE);
    document.documentElement.style.setProperty('--cell-size', `${CELL_SIZE}px`);

    // 盤面要素のサイズを明示的に設定
    boardElement.style.width = `${(BOARD_SIZE - 1) * CELL_SIZE}px`;
    boardElement.style.height = `${(BOARD_SIZE - 1) * CELL_SIZE}px`;

    renderBoard();
}

// --- 盤面描画 --- //
function renderBoard() {
    boardElement.innerHTML = '';
    // クリックイベントはboardElement全体に設定
    boardElement.removeEventListener('click', handleBoardClick); // 複数登録防止
    boardElement.addEventListener('click', handleBoardClick);

    // 既存の石を描画
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] !== EMPTY) {
                const stone = document.createElement('div');
                stone.classList.add('stone', board[r][c] === BLACK ? 'black' : 'white');
                // 交点に配置
                stone.style.left = `${c * CELL_SIZE}px`;
                stone.style.top = `${r * CELL_SIZE}px`;
                boardElement.appendChild(stone);
            }
        }
    }
}

// --- 石を置く処理 --- //
function handleBoardClick(event) {
    if (gameOver || currentTurn === undefined) return; // ゲーム終了後または手番未設定時は何もしない

    const rect = boardElement.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // クリックされた座標から最も近い交点を計算
    const col = Math.round(clickX / CELL_SIZE);
    const row = Math.round(clickY / CELL_SIZE);

    // 盤面範囲内かチェック
    if (row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE && board[row][col] === EMPTY) {
        // クリックイベントを一時的に無効化
        boardElement.removeEventListener('click', handleBoardClick);

        // エネルギーチャージエフェクト
        const charge = document.createElement('div');
        charge.classList.add('charge-effect');
        charge.style.left = `${col * CELL_SIZE}px`;
        charge.style.top = `${row * CELL_SIZE}px`;
        boardElement.appendChild(charge);

        charge.addEventListener('animationend', () => {
            charge.remove();
            // チャージアニメーション終了後、石を置き、バーストエフェクト
            placeStone(row, col, currentTurn);

            const burst = document.createElement('div');
            burst.classList.add('burst-effect');
            burst.style.left = `${col * CELL_SIZE}px`;
            burst.style.top = `${row * CELL_SIZE}px`;
            boardElement.appendChild(burst);

            burst.addEventListener('animationend', () => {
                burst.remove();
                // 全てのエフェクト終了後、クリックイベントを再度有効化
                boardElement.addEventListener('click', handleBoardClick);
            }, { once: true });

            // ターンを交代
            currentTurn = (currentTurn === BLACK) ? WHITE : BLACK;
            updateTurnDisplay();

        }, { once: true });
    }
}

function placeStone(row, col, color) {
    // 既存のlast-moveクラスを削除
    const prevLastMoveStone = document.querySelector('.stone.last-move');
    if (prevLastMoveStone) {
        prevLastMoveStone.classList.remove('last-move');
    }

    board[row][col] = color;
    // 石を直接追加
    const stone = document.createElement('div');
    stone.classList.add('stone', color === BLACK ? 'black' : 'white');
    stone.style.left = `${col * CELL_SIZE}px`;
    stone.style.top = `${row * CELL_SIZE}px`;
    boardElement.appendChild(stone);

    // 新しい石にlast-moveクラスを追加
    stone.classList.add('last-move');

    // --- 吹っ飛ばしエフェクト (最新の手以外) --- //
    const BLOW_AWAY_DISTANCE = 135; // 吹っ飛ぶ距離の基準 (px) 3/4に短縮
    const DISTANCE_VARIANCE = 67.5; // 距離の誤差 (±33.75px) 調整
    const ANGLE_VARIANCE = Math.PI / 8; // 角度の誤差 (±22.5度)

    const allStones = document.querySelectorAll('.stone');
    allStones.forEach(s => {
        if (s !== stone) { // 新しく置かれた石以外に適用
            const stoneX = parseFloat(s.style.left);
            const stoneY = parseFloat(s.style.top);

            const newStoneX = col * CELL_SIZE;
            const newStoneY = row * CELL_SIZE;

            const deltaX = stoneX - newStoneX;
            const deltaY = stoneY - newStoneY;

            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            let offsetX = 0;
            let offsetY = 0;

            if (distance > 0) { // ゼロ除算を避ける
                // 基本の角度を計算
                let angle = Math.atan2(deltaY, deltaX);

                // 角度にランダムな誤差を加える
                angle += (Math.random() - 0.5) * ANGLE_VARIANCE * 2;

                // 距離にランダムな誤差を加える
                const currentBlowAwayDistance = BLOW_AWAY_DISTANCE + (Math.random() - 0.5) * DISTANCE_VARIANCE * 2;

                offsetX = Math.cos(angle) * currentBlowAwayDistance;
                offsetY = Math.sin(angle) * currentBlowAwayDistance;
            } else {
                // 同じ位置にある場合は動かさない
            }
            
            s.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px)`;

            // 各石が個別のタイミングで戻るようにsetTimeoutをループ内に移動
            setTimeout(() => {
                s.style.transform = 'translate(-50%, -50%)';
            }, 1000 + (Math.random() - 0.5) * 200); // 1秒 + ±0.1秒の誤差
        }
    });

    // --- 衝撃波エフェクト --- //
    const shockwave = document.createElement('div');
    shockwave.classList.add('shockwave');
    shockwave.style.left = `${col * CELL_SIZE}px`;
    shockwave.style.top = `${row * CELL_SIZE}px`;
    boardElement.appendChild(shockwave);

    // アニメーション終了後に削除
    shockwave.addEventListener('animationend', () => {
        shockwave.remove();
    }, { once: true });

    // 雷エフェクト
    const lightning = document.createElement('div');
    lightning.classList.add('lightning-effect');
    lightning.style.left = `${col * CELL_SIZE}px`;
    lightning.style.top = `${row * CELL_SIZE}px`;
    boardElement.appendChild(lightning);

    // アニメーション終了後に削除
    lightning.addEventListener('animationend', () => {
        lightning.remove();
    }, { once: true });

    // 波紋エフェクト
    const ripple = document.createElement('div');
    ripple.classList.add('ripple-effect');
    ripple.style.left = `${col * CELL_SIZE}px`;
    ripple.style.top = `${row * CELL_SIZE}px`;
    boardElement.appendChild(ripple);

    // アニメーション終了後に削除
    ripple.addEventListener('animationend', () => {
        ripple.remove();
    }, { once: true });

    // 勝利判定
    if (checkWin(row, col, color)) {
        endGame(color);
    }

    // 1/3の確率でフラッシュエフェクト
    if (Math.random() < 1/3) {
        flashEffect.classList.remove('hidden');
        setTimeout(() => {
            flashEffect.classList.add('hidden');
            setTimeout(() => {
                flashEffect.classList.remove('hidden');
                setTimeout(() => {
                    flashEffect.classList.add('hidden');
                }, 16); // 1フレーム
            }, 32); // 2フレーム待機
        }, 16); // 1フレーム
    }
}

// --- 勝利判定 --- //
function checkWin(row, col, color) {
    // 縦、横、斜めの4方向をチェック
    const directions = [
        [0, 1],  // 横
        [1, 0],  // 縦
        [1, 1],  // 右下がり斜め
        [1, -1]  // 右上がり斜め
    ];

    for (const [dr, dc] of directions) {
        let count = 1;
        // 正方向
        for (let i = 1; i < 5; i++) {
            const nr = row + dr * i;
            const nc = col + dc * i;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === color) {
                count++;
            } else {
                break;
            }
        }
        // 逆方向
        for (let i = 1; i < 5; i++) {
            const nr = row - dr * i;
            const nc = col - dc * i;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === color) {
                count++;
            } else {
                break;
            }
        }
        if (count >= 5) {
            return true;
        }
    }
    return false;
}

// --- ターン表示更新 --- //
function updateTurnDisplay() {
    currentTurnDisplay.textContent = (currentTurn === BLACK) ? '黒' : '白';
}

// --- ゲーム終了 --- //
function endGame(winnerColor) {
    gameOver = true;
    gameOverOverlay.classList.remove('hidden');
    if (winnerColor === BLACK) {
        gameOverMessage.textContent = '黒の勝利！';
    } else if (winnerColor === WHITE) {
        gameOverMessage.textContent = '白の勝利！';
    } else {
        gameOverMessage.textContent = '引き分け！';
    }
}

// --- イベントリスナー --- //
resetButton.addEventListener('click', initGame);
restartButton.addEventListener('click', initGame);

// Add resize event listener to re-initialize game on window resize
window.addEventListener('resize', initGame);

// --- 初期化 --- //
initGame();