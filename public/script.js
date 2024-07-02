document.addEventListener('DOMContentLoaded', () => {
    const username = prompt('Enter your username:');
    localStorage.setItem('username', username);

    const socket = io();

    socket.emit('new user', { username });

    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const messages = document.getElementById('messages');

    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (message !== '') {
            socket.emit('chat message', { message, username });
            messageInput.value = '';
        }
    });

    socket.on('chat message', ({ message, username }) => {
        const li = document.createElement('li');
        li.textContent = `${username}: ${message}`;
        messages.appendChild(li);
    });

    socket.on('decrypted message', (decryptedMessage) => {
        const decryptedMessageDiv = document.getElementById('decrypted-message');
        decryptedMessageDiv.textContent = decryptedMessage;
    });
});
