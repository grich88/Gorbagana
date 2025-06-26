use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod trash_tac_toe {
    use super::*;

    pub fn initialize_game(ctx: Context<InitializeGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        game.player_x = ctx.accounts.player.key();
        game.player_o = Pubkey::default(); // Will be set when second player joins
        game.board = [0; 9]; // Empty board
        game.current_turn = 1; // Player X starts (trash cans)
        game.status = GameStatus::WaitingForPlayer;
        game.bump = ctx.bumps.game;
        
        msg!("🗑️ New trash-tac-toe game initialized by player: {}", game.player_x);
        Ok(())
    }

    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        require!(game.status == GameStatus::WaitingForPlayer, ErrorCode::GameNotWaitingForPlayer);
        require!(game.player_x != ctx.accounts.player.key(), ErrorCode::CannotPlayAgainstYourself);
        
        game.player_o = ctx.accounts.player.key();
        game.status = GameStatus::Active;
        
        msg!("♻️ Player {} joined the game! Game is now active.", game.player_o);
        Ok(())
    }

    pub fn make_move(ctx: Context<MakeMove>, position: u8) -> Result<()> {
        let game = &mut ctx.accounts.game;
        
        require!(game.status == GameStatus::Active, ErrorCode::GameNotActive);
        require!(position < 9, ErrorCode::InvalidPosition);
        require!(game.board[position as usize] == 0, ErrorCode::PositionOccupied);
        
        let current_player = ctx.accounts.player.key();
        
        // Determine which player is making the move
        let player_symbol = if current_player == game.player_x {
            require!(game.current_turn == 1, ErrorCode::NotYourTurn);
            1 // X (trash cans)
        } else if current_player == game.player_o {
            require!(game.current_turn == 2, ErrorCode::NotYourTurn);
            2 // O (recycling bins)
        } else {
            return Err(ErrorCode::NotAPlayer.into());
        };
        
        // Make the move
        game.board[position as usize] = player_symbol;
        
        // Check for win condition
        if check_winner(&game.board, player_symbol) {
            game.status = if player_symbol == 1 {
                GameStatus::XWins
            } else {
                GameStatus::OWins
            };
            msg!("🎉 Player {} wins!", current_player);
        } else if is_board_full(&game.board) {
            game.status = GameStatus::Tie;
            msg!("🤝 Game ended in a tie!");
        } else {
            // Switch turns
            game.current_turn = if game.current_turn == 1 { 2 } else { 1 };
        }
        
        let symbol_emoji = if player_symbol == 1 { "🗑️" } else { "♻️" };
        msg!("{} Player {} moved to position {}", symbol_emoji, current_player, position);
        
        Ok(())
    }

    pub fn close_game(_ctx: Context<CloseGame>) -> Result<()> {
        msg!("Game closed and rent returned to player");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(
        init,
        payer = player,
        space = Game::LEN,
        seeds = [b"game", player.key().as_ref()],
        bump
    )]
    pub game: Account<'info, Game>,
    
    #[account(mut)]
    pub player: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct MakeMove<'info> {
    #[account(mut)]
    pub game: Account<'info, Game>,
    
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseGame<'info> {
    #[account(
        mut,
        close = player,
        constraint = game.status != GameStatus::Active @ ErrorCode::GameStillActive
    )]
    pub game: Account<'info, Game>,
    
    #[account(mut)]
    pub player: Signer<'info>,
}

#[account]
pub struct Game {
    pub player_x: Pubkey,      // 32 bytes - Trash cans player
    pub player_o: Pubkey,      // 32 bytes - Recycling bins player
    pub board: [u8; 9],        // 9 bytes - 3x3 grid (0=empty, 1=X, 2=O)
    pub current_turn: u8,      // 1 byte - 1 for X, 2 for O
    pub status: GameStatus,    // 1 byte - Game status enum
    pub bump: u8,              // 1 byte - PDA bump
}

impl Game {
    pub const LEN: usize = 8 + 32 + 32 + 9 + 1 + 1 + 1; // 84 bytes + discriminator
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GameStatus {
    WaitingForPlayer,
    Active,
    XWins,
    OWins,
    Tie,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Game is not waiting for a player")]
    GameNotWaitingForPlayer,
    #[msg("Game is not active")]
    GameNotActive,
    #[msg("Game is still active and cannot be closed")]
    GameStillActive,
    #[msg("Invalid board position")]
    InvalidPosition,
    #[msg("Position already occupied")]
    PositionOccupied,
    #[msg("Not your turn")]
    NotYourTurn,
    #[msg("You are not a player in this game")]
    NotAPlayer,
    #[msg("Cannot play against yourself")]
    CannotPlayAgainstYourself,
}

// Helper functions
fn check_winner(board: &[u8; 9], player: u8) -> bool {
    let winning_combinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6],             // Diagonals
    ];
    
    winning_combinations.iter().any(|combination| {
        combination.iter().all(|&i| board[i] == player)
    })
}

fn is_board_full(board: &[u8; 9]) -> bool {
    board.iter().all(|&cell| cell != 0)
} 