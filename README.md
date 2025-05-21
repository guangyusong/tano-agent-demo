# Tano Agent Demo

Simple web interface for testing Tano Agent voice and text chat capabilities.

## Overview

This demo provides a web-based interface for testing and interacting with Tano agents. It allows you to:

- Configure API settings
- Create and manage agents
- Start voice or text sessions with agents
- Connect to LiveKit rooms for real-time audio communication (voice mode)
- Interact with agents via voice or text chat

## Usage

1. Start a local server to avoid CORS issues:
   ```
   python -m http.server 3000
   ```
2. Open `http://localhost:3000` in your web browser
3. Enter your Tano Agent API Key
4. Create a new agent or select an existing one
5. Choose between voice or text mode using the session type buttons
6. For voice mode:
   - Start a session with the selected agent
   - Connect to the room to begin voice interaction
7. For text mode:
   - Start a text session with the selected agent
   - Type messages in the chat input and press Enter or click Send
   - View the conversation history in the chat window

## Features

### Voice Mode
- Real-time voice communication using LiveKit
- Audio visualization
- Participant tracking
- Microphone mute/unmute controls

### Text Mode
- Real-time text chat with agents
- Chat history display
- Typing indicators
- Session management

## LiveKit Integration

The voice mode uses LiveKit for real-time audio communication. The following LiveKit SDKs are available for different platforms:

- [LiveKit Client SDK for JavaScript](https://github.com/livekit/client-sdk-js) - Used in this web demo
- [LiveKit Client SDK for Unity](https://github.com/livekit/client-sdk-unity) - For building voice agents in Unity applications
- [LiveKit Python SDKs](https://github.com/livekit/python-sdks/) - For server-side integration with Python

## Files

- `index.html` - Main HTML interface
- `script.js` - JavaScript for agent management, LiveKit integration, and text chat
- `styles.css` - CSS styling for the interface
