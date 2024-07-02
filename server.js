const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// User data storage (for demo purposes, should use a database in production)
const users = {};

// Read RSA public key file
const publicKeyPath = path.resolve(__dirname, 'public.pem'); // Update with your actual path
let publicKey;
try {
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
    console.log('Public key loaded successfully');
} catch (err) {
    console.error('Error reading public key file:', err);
    process.exit(1); // Exit the process if there's an error reading the key
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected');

    // New user event
    socket.on('new user', ({ username }) => {
        console.log(`User '${username}' connected`);
        // Generate private key for the user
        const privateKey = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        }).privateKey;
        // Store user with public and private key
        users[username] = { publicKey, privateKey };
        // Send user list to all clients
        io.emit('update user list', Object.keys(users));
    });

    // Chat message event
    socket.on('chat message', ({ message, username }) => {
        console.log(`Message received from '${username}': ${message}`);
        // Broadcast the encrypted message to all connected clients
        io.emit('chat message', { message: encrypt(message, users[username].publicKey), username });
    });

    // Decrypt message event
    socket.on('decrypt message', ({ encryptedMessage, sender }) => {
        const decryptedMessage = decrypt(encryptedMessage, users[sender].privateKey);
        socket.emit('decrypted message', decryptedMessage);
    });

    // Disconnect event
    socket.on('disconnect', () => {
        // Remove user from users object
        for (let user in users) {
            if (users[user].socketId === socket.id) {
                delete users[user];
                break;
            }
        }
        // Update user list
        io.emit('update user list', Object.keys(users));
        console.log('User disconnected');
    });
});

// Encrypt function
function encrypt(message, publicKey) {
    const bufferMessage = Buffer.from(message, 'utf8');
    const encrypted = crypto.publicEncrypt(publicKey, bufferMessage);
    return encrypted.toString('base64');
}

// Decrypt function
function decrypt(encryptedMessage, privateKey) {
    const bufferEncryptedMessage = Buffer.from(encryptedMessage, 'base64');
    const decrypted = crypto.privateDecrypt(privateKey, bufferEncryptedMessage);
    return decrypted.toString('utf8');
}

// Start the server
server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
