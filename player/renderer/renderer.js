document.addEventListener('DOMContentLoaded', () => {
    const pairingScreen = document.getElementById('pairing-screen');
    const statusScreen = document.getElementById('status-screen');
    const pairingCodeEl = document.getElementById('pairing-code');

    // Handle initial pairing mode
    window.api.onEnterPairingMode((data) => {
        pairingCodeEl.innerText = data.pairingCode;
        pairingScreen.style.display = 'block';
        statusScreen.style.display = 'none';

        // NOTE: The user is expected to manually enter this code.
        // We'll simulate a successful pairing after a delay for demonstration.
        setTimeout(() => {
            console.log('Simulating pairing success with code:', data.pairingCode);
            window.api.registerPlayer(data.pairingCode);
        }, 5000);
    });

    // Handle pairing success
    window.api.onPairingSuccess(() => {
        pairingScreen.style.display = 'none';
        statusScreen.style.display = 'block';
        console.log('Pairing successful! Player is now online.');
    });
});
