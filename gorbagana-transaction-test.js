const web3 = require('@solana/web3.js');

// Configuration - REPLACE WITH YOUR VALUES
const secretKey = Uint8Array.from([/* YOUR ARRAY KEY */]);
const recipientAddress = new web3.PublicKey('RECEIVERADDRESS');

// GORBAGANA OFFICIAL CONFIGURATION
const connection = new web3.Connection('https://gorchain.wstf.io', {
  commitment: 'confirmed',
  disableRetryOnRateLimit: false,
  wsEndpoint: undefined, // COMPLETELY disable WebSocket (CRITICAL for Gorbagana)
  httpHeaders: { 'User-Agent': 'gorbagana-script' },
});

const amount = 0.1 * web3.LAMPORTS_PER_SOL; // 0.1 $GOR = 100,000,000 lamports
const POLL_INTERVAL = 2000; // Poll every 2 seconds
const MAX_POLL_ATTEMPTS = 30; // 60 seconds total
const SEND_RETRIES = 5; // Retry sending up to 5 times

// Helper function to format balance
const formatBalance = (lamports) => (lamports / web3.LAMPORTS_PER_SOL).toFixed(6) + ' $GOR';

// Helper function to get current timestamp
const getTimestamp = () => new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' });

// GORBAGANA TRANSACTION CONFIRMATION (Official Method)
async function confirmTransaction(signature) {
  console.log('Polling for transaction confirmation...');
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    try {
      const { value } = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
      const status = value[0];
      if (status) {
        if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
          console.log(`Transaction confirmed after ${i + 1} polls!`);
          return status.err ? { status: 'Failed', error: status.err } : { status: 'Success' };
        }
        console.log(`Poll ${i + 1}/${MAX_POLL_ATTEMPTS}: Transaction not yet confirmed...`);
      } else {
        console.log(`Poll ${i + 1}/${MAX_POLL_ATTEMPTS}: Transaction status not found...`);
      }
    } catch (error) {
      console.error(`Poll ${i + 1} error:`, error.message);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
  }
  throw new Error('Transaction confirmation timed out after 60 seconds.');
}

// Main function
async function sendAndVerifyGorTransaction() {
  console.log(`\n=== Gorbagana Transaction Script Started at ${getTimestamp()} ===`);

  try {
    // Initialize keypair
    console.log('\n1. Initializing Wallet...');
    const fromKeypair = web3.Keypair.fromSecretKey(secretKey);
    console.log('Sender Public Key:', fromKeypair.publicKey.toBase58());
    console.log('Recipient Public Key:', recipientAddress.toBase58());

    // Check sender balance before
    console.log('\n2. Checking Sender Balance Before Transaction...');
    const senderBalanceBefore = await connection.getBalance(fromKeypair.publicKey);
    console.log('Sender Balance:', formatBalance(senderBalanceBefore));
    if (senderBalanceBefore < amount + 5000) {
      console.warn('Warning: Insufficient funds. Attempting to request test $GOR from faucet...');
      try {
        const airdropSignature = await connection.requestAirdrop(fromKeypair.publicKey, web3.LAMPORTS_PER_SOL);
        const airdropStatus = await confirmTransaction(airdropSignature);
        if (airdropStatus.status === 'Failed') {
          throw new Error('Airdrop transaction failed: ' + JSON.stringify(airdropStatus.error));
        }
        const newBalance = await connection.getBalance(fromKeypair.publicKey);
        console.log('Airdrop successful! New Sender Balance:', formatBalance(newBalance));
      } catch (airdropError) {
        console.error('Airdrop failed:', airdropError.message);
        throw new Error('Insufficient funds and airdrop failed. Please fund the wallet manually.');
      }
    }

    // Check recipient balance before
    console.log('\n3. Checking Recipient Balance Before Transaction...');
    const recipientBalanceBefore = await connection.getBalance(recipientAddress);
    console.log('Recipient Balance:', formatBalance(recipientBalanceBefore));

    // Create and send transaction
    console.log('\n4. Creating and Sending Transaction...');
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const transaction = new web3.Transaction().add(
      web3.SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: recipientAddress,
        lamports: amount,
      })
    );
    transaction.feePayer = fromKeypair.publicKey;
    transaction.recentBlockhash = blockhash;
    transaction.sign(fromKeypair);

    let signature;
    for (let attempt = 1; attempt <= SEND_RETRIES; attempt++) {
      try {
        console.log(`Sending transaction (Attempt ${attempt}/${SEND_RETRIES})...`);
        signature = await connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: false,
          maxRetries: 0, // Handle retries manually
        });
        console.log('Transaction Sent! Signature:', signature);
        break;
      } catch (sendError) {
        console.error(`Send attempt ${attempt} failed:`, sendError.message);
        if (attempt === SEND_RETRIES) throw new Error('Failed to send transaction after retries.');
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }

    // Confirm transaction
    console.log('\n5. Confirming Transaction...');
    const confirmResult = await confirmTransaction(signature);
    console.log('Confirmation Result:', confirmResult.status);
    if (confirmResult.status === 'Failed') {
      throw new Error('Transaction failed: ' + JSON.stringify(confirmResult.error));
    }
    console.log(`Explorer URL: https://gorexplorer.net/lookup.html#tx/${signature}`);

    // Verify transaction details (GORBAGANA COMPATIBLE METHOD)
    console.log('\n6. Verifying Transaction Details...');
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0, // Gorbagana uses Solana v1.18.26
    });
    if (!tx) {
      console.error('Transaction not found or not confirmed yet.');
      return;
    }
    console.log('Transaction Details:');
    console.log('Status:', tx.meta.err ? 'Failed' : 'Success');
    console.log('From:', tx.transaction.message.accountKeys[0].toBase58());
    console.log('To:', tx.transaction.message.accountKeys[1].toBase58());
    console.log('Amount:', formatBalance(tx.meta.postBalances[1] - tx.meta.preBalances[1]));
    console.log('Fee:', formatBalance(tx.meta.fee));
    console.log('Block Time:', new Date(tx.blockTime * 1000).toLocaleString('en-US', { timeZone: 'Europe/Paris' }));

    // Check sender balance after
    console.log('\n7. Checking Sender Balance After Transaction...');
    const senderBalanceAfter = await connection.getBalance(fromKeypair.publicKey);
    console.log('Sender Balance:', formatBalance(senderBalanceAfter));
    console.log('Balance Change:', formatBalance(senderBalanceAfter - senderBalanceBefore));

    // Check recipient balance after
    console.log('\n8. Checking Recipient Balance After Transaction...');
    const recipientBalanceAfter = await connection.getBalance(recipientAddress);
    console.log('Recipient Balance:', formatBalance(recipientBalanceAfter));
    console.log('Balance Change:', formatBalance(recipientBalanceAfter - recipientBalanceBefore));

    // List recent transactions
    console.log('\n9. Listing Recent Transactions for Sender Wallet...');
    const signatures = await connection.getSignaturesForAddress(fromKeypair.publicKey, { limit: 10 });
    console.log('Recent Transactions:');
    signatures.forEach((sig, index) => {
      console.log(`${index + 1}. Signature: ${sig.signature}, Time: ${new Date(sig.blockTime * 1000).toLocaleString('en-US', { timeZone: 'Europe/Paris' })}`);
    });

    console.log('\n=== Transaction Process Completed Successfully! ===');
    console.log('Please verify the transaction manually at:');
    console.log(`https://gorexplorer.net/lookup.html#tx/${signature}`);
  } catch (error) {
    console.error('\nError during transaction process:', error.message);
    console.error('Stack Trace:', error.stack);
    console.log('\nChecking recent transactions to see if transaction was sent...');
    try {
      const fromKeypair = web3.Keypair.fromSecretKey(secretKey);
      const signatures = await connection.getSignaturesForAddress(fromKeypair.publicKey, { limit: 10 });
      console.log('Recent Transactions:');
      signatures.forEach((sig, index) => {
        console.log(`${index + 1}. Signature: ${sig.signature}, Time: ${new Date(sig.blockTime * 1000).toLocaleString('en-US', { timeZone: 'Europe/Paris' })}`);
      });
    } catch (sigError) {
      console.error('Error fetching recent transactions:', sigError.message);
    }
  }
}

// Execute the script
sendAndVerifyGorTransaction(); 