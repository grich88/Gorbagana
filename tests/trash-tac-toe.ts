import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TrashTacToe } from "../target/types/trash_tac_toe";
import { expect } from "chai";

describe("trash-tac-toe", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TrashTacToe as Program<TrashTacToe>;
  
  // Test players
  const playerX = anchor.web3.Keypair.generate();
  const playerO = anchor.web3.Keypair.generate();
  
  let gameAddress: anchor.web3.PublicKey;

  before(async () => {
    // Fund test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(playerX.publicKey, 1000000000)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(playerO.publicKey, 1000000000)
    );
  });

  it("Initializes a new game", async () => {
    // Derive game PDA
    [gameAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("game"), playerX.publicKey.toBuffer()],
      program.programId
    );

    // Initialize game
    await program.methods
      .initializeGame()
      .accounts({
        game: gameAddress,
        player: playerX.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([playerX])
      .rpc();

    // Fetch and verify game state
    const gameAccount = await program.account.game.fetch(gameAddress);
    
    expect(gameAccount.playerX.toString()).to.equal(playerX.publicKey.toString());
    expect(gameAccount.playerO.toString()).to.equal(anchor.web3.PublicKey.default.toString());
    expect(gameAccount.board).to.deep.equal([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(gameAccount.currentTurn).to.equal(1);
    expect(Object.keys(gameAccount.status)[0]).to.equal("waitingForPlayer");
  });

  it("Second player joins the game", async () => {
    // Player O joins the game
    await program.methods
      .joinGame()
      .accounts({
        game: gameAddress,
        player: playerO.publicKey,
      })
      .signers([playerO])
      .rpc();

    // Verify game state
    const gameAccount = await program.account.game.fetch(gameAddress);
    
    expect(gameAccount.playerO.toString()).to.equal(playerO.publicKey.toString());
    expect(Object.keys(gameAccount.status)[0]).to.equal("active");
  });

  it("Player X makes the first move", async () => {
    // Player X moves to position 0
    await program.methods
      .makeMove(0)
      .accounts({
        game: gameAddress,
        player: playerX.publicKey,
      })
      .signers([playerX])
      .rpc();

    // Verify move
    const gameAccount = await program.account.game.fetch(gameAddress);
    
    expect(gameAccount.board[0]).to.equal(1); // X is represented by 1
    expect(gameAccount.currentTurn).to.equal(2); // Turn switches to O
  });

  it("Player O makes a move", async () => {
    // Player O moves to position 1
    await program.methods
      .makeMove(1)
      .accounts({
        game: gameAddress,
        player: playerO.publicKey,
      })
      .signers([playerO])
      .rpc();

    // Verify move
    const gameAccount = await program.account.game.fetch(gameAddress);
    
    expect(gameAccount.board[1]).to.equal(2); // O is represented by 2
    expect(gameAccount.currentTurn).to.equal(1); // Turn switches back to X
  });

  it("Prevents invalid moves", async () => {
    try {
      // Try to move to an occupied position
      await program.methods
        .makeMove(0) // Position 0 is already occupied by X
        .accounts({
          game: gameAddress,
          player: playerX.publicKey,
        })
        .signers([playerX])
        .rpc();
      
      expect.fail("Should have thrown an error for occupied position");
    } catch (error) {
      expect(error.message).to.include("PositionOccupied");
    }
  });

  it("Prevents playing out of turn", async () => {
    try {
      // Player O tries to move when it's X's turn
      await program.methods
        .makeMove(2)
        .accounts({
          game: gameAddress,
          player: playerO.publicKey,
        })
        .signers([playerO])
        .rpc();
      
      expect.fail("Should have thrown an error for wrong turn");
    } catch (error) {
      expect(error.message).to.include("NotYourTurn");
    }
  });

  it("Player X wins with a diagonal", async () => {
    // Complete a winning sequence for X
    // X: 0, 4, 8 (diagonal)
    // O: 1, 2, 3
    
    // Player X moves to position 4
    await program.methods
      .makeMove(4)
      .accounts({
        game: gameAddress,
        player: playerX.publicKey,
      })
      .signers([playerX])
      .rpc();

    // Player O moves to position 2
    await program.methods
      .makeMove(2)
      .accounts({
        game: gameAddress,
        player: playerO.publicKey,
      })
      .signers([playerO])
      .rpc();

    // Player X moves to position 8 (winning move)
    await program.methods
      .makeMove(8)
      .accounts({
        game: gameAddress,
        player: playerX.publicKey,
      })
      .signers([playerX])
      .rpc();

    // Verify X wins
    const gameAccount = await program.account.game.fetch(gameAddress);
    expect(Object.keys(gameAccount.status)[0]).to.equal("xWins");
  });

  it("Prevents moves after game ends", async () => {
    try {
      // Try to move after game has ended
      await program.methods
        .makeMove(3)
        .accounts({
          game: gameAddress,
          player: playerO.publicKey,
        })
        .signers([playerO])
        .rpc();
      
      expect.fail("Should have thrown an error for inactive game");
    } catch (error) {
      expect(error.message).to.include("GameNotActive");
    }
  });

  it("Tests a tie game", async () => {
    // Start a new game for tie test
    const tiePlayerX = anchor.web3.Keypair.generate();
    const tiePlayerO = anchor.web3.Keypair.generate();

    // Fund test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(tiePlayerX.publicKey, 1000000000)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(tiePlayerO.publicKey, 1000000000)
    );

    // Derive game PDA
    const [tieGameAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("game"), tiePlayerX.publicKey.toBuffer()],
      program.programId
    );

    // Initialize and join game
    await program.methods
      .initializeGame()
      .accounts({
        game: tieGameAddress,
        player: tiePlayerX.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([tiePlayerX])
      .rpc();

    await program.methods
      .joinGame()
      .accounts({
        game: tieGameAddress,
        player: tiePlayerO.publicKey,
      })
      .signers([tiePlayerO])
      .rpc();

    // Play a tie game
    // Final board: X O X
    //              O X O  
    //              O X X
    const moves = [
      { player: tiePlayerX, position: 0 }, // X
      { player: tiePlayerO, position: 1 }, // O
      { player: tiePlayerX, position: 2 }, // X
      { player: tiePlayerO, position: 3 }, // O
      { player: tiePlayerX, position: 4 }, // X
      { player: tiePlayerO, position: 5 }, // O
      { player: tiePlayerX, position: 7 }, // X
      { player: tiePlayerO, position: 6 }, // O
      { player: tiePlayerX, position: 8 }, // X (tie)
    ];

    for (const move of moves) {
      await program.methods
        .makeMove(move.position)
        .accounts({
          game: tieGameAddress,
          player: move.player.publicKey,
        })
        .signers([move.player])
        .rpc();
    }

    // Verify tie
    const gameAccount = await program.account.game.fetch(tieGameAddress);
    expect(Object.keys(gameAccount.status)[0]).to.equal("tie");
  });
}); 