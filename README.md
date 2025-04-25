# Tano Agent Demo

Simple web interface for testing Tano Agent voice capabilities.

## Overview

This demo provides a web-based interface for testing and interacting with Tano voice agents. It allows you to:

- Configure API settings
- Create and manage voice agents
- Start voice sessions with agents
- Connect to LiveKit rooms for real-time audio communication
- Interact with agents via voice

## Usage

1. Start a local server to avoid CORS issues:
   ```
   python -m http.server 3000
   ```
2. Open `http://localhost:3000` in your web browser
3. Enter your Tano Agent API Key
4. Create a new agent or select an existing one
5. Start a session with the selected agent
6. Connect to the room to begin voice interaction

## LiveKit Integration

This demo uses LiveKit for real-time audio communication. The following LiveKit SDKs are available for different platforms:

- [LiveKit Client SDK for JavaScript](https://github.com/livekit/client-sdk-js) - Used in this web demo
- [LiveKit Client SDK for Unity](https://github.com/livekit/client-sdk-unity) - For building voice agents in Unity applications
- [LiveKit Python SDKs](https://github.com/livekit/python-sdks/) - For server-side integration with Python

## Files

- `index.html` - Main HTML interface
- `script.js` - JavaScript for agent management and LiveKit integration
- `styles.css` - CSS styling for the interface