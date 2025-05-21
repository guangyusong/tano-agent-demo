// --- DOM Elements ---
const apiKeyInput = document.getElementById('apiKey');
const agentNameInput = document.getElementById('agentName');
const agentInstructionsInput = document.getElementById('agentInstructions');
const createAgentBtn = document.getElementById('createAgentBtn');
const listAgentsBtn = document.getElementById('listAgentsBtn');
const agentsListSelect = document.getElementById('agentsList');
const deleteAgentBtn = document.getElementById('deleteAgentBtn');
const startSessionBtn = document.getElementById('startSessionBtn');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const muteBtn = document.getElementById('muteBtn');
const connectionStatusSpan = document.getElementById('connectionStatus');
const roomNameSpan = document.getElementById('roomName');
const participantsListUl = document.querySelector('#participantsList ul');
const logsPre = document.getElementById('logs');
const visualizerCanvas = document.getElementById('visualizerCanvas');
const canvasCtx = visualizerCanvas.getContext('2d');
const toggleApiEndpointBtn = document.getElementById('toggleApiEndpointBtn');
const currentApiEndpointSpan = document.getElementById('currentApiEndpoint');
const apiEndpointSelect = document.getElementById('apiEndpoint');
const customEndpointInput = document.getElementById('customEndpoint');

// Interaction tab elements
const voiceTab = document.getElementById('voiceTab');
const textTab = document.getElementById('textTab');
const voiceInteraction = document.getElementById('voiceInteraction');
const textInteraction = document.getElementById('textInteraction');
const startVoiceSessionBtn = document.getElementById('startVoiceSessionBtn');
const textChatMessages = document.getElementById('textChatMessages');
const textMessageInput = document.getElementById('textMessageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');
const endTextSessionBtn = document.getElementById('endTextSessionBtn');
const textSessionStatus = document.getElementById('textSessionStatus');

// --- Configuration ---
const ENDPOINTS = {
    local: 'http://localhost:8000/api/v1',
    remote: 'https://agents.tanolabs.com/api/v1',
    staging: 'http://34.41.84.236:8000/api/v1'
};

// --- State ---
let currentApiKey = sessionStorage.getItem('tanoAgentApiKey') || '';
let currentEndpoint = sessionStorage.getItem('tanoAgentEndpoint') || 'remote';
let API_BASE_URL = ENDPOINTS[currentEndpoint];
let agents = [];
let selectedAgentId = null;
let tanoAgentRoom = null;
let tanoAgentToken = null;
let tanoAgentUrl = '';
let localAudioTrack = null;
let audioContext = null;
let analyser = null;
let source = null;
let dataArray = null;
let animationFrameId = null;

// Session state
let activeTab = 'voice'; // 'voice' or 'text'
let textSessionActive = false;
let textSessionId = null;
let isWaitingForResponse = false;

// --- Logging ---
function log(message) {
    console.log(message);
    logsPre.textContent += `${new Date().toLocaleTimeString()}: ${message}\n`;
    logsPre.scrollTop = logsPre.scrollHeight; // Auto-scroll
}

// --- API Interaction ---
async function apiRequest(endpoint, method = 'GET', body = null, apiKey) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'Authorization': `Bearer ${apiKey}` // Include Bearer token as well if needed
    };

    const options = {
        method: method,
        headers: headers,
    };

    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }

    log(`Making ${method} request to ${url}`);
    if (options.body) log(`Request body: ${options.body}`);

    try {
        const response = await fetch(url, options);
        log(`Response status: ${response.status}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Request failed with status ${response.status}: ${errorText}`);
        }
        // Handle 204 No Content specifically for DELETE
        if (response.status === 204) {
            return null; // Or return a success indicator if preferred
        }
        return await response.json();
    } catch (error) {
        log(`API Request Error: ${error}`);
        log(`API Error: ${error.message}`); // Log error instead of showing alert
        throw error;
    }
}

async function listAgents() {
    if (!currentApiKey) {
        log('Please enter your API Key.'); // Log instead of alert
        return;
    }
    try {
        log('Listing agents...');
        agents = await apiRequest('/agents', 'GET', null, currentApiKey);
        populateAgentList();
        log(`Found ${agents.length} agents.`);
    } catch (error) {
        log('Failed to list agents.');
    }
}

async function createAgent() {
    if (!currentApiKey) {
        log('Please enter your API Key.'); // Log instead of alert
        return;
    }
    const name = agentNameInput.value.trim();
    const instructions = agentInstructionsInput.value.trim();
    if (!name || !instructions) {
        log('Please enter both Agent Name and Instructions.'); // Log instead of alert
        return;
    }

    try {
        log(`Creating agent: ${name}`);
        const newAgent = await apiRequest('/agents', 'POST', { name, instructions }, currentApiKey);
        log(`Agent created: ${JSON.stringify(newAgent)}`);
        agentNameInput.value = '';
        agentInstructionsInput.value = '';
        await listAgents(); // Refresh list
    } catch (error) {
        log('Failed to create agent.');
    }
}

async function deleteAgent() {
    if (!selectedAgentId || !currentApiKey) {
        log('Please select an agent to delete and ensure API Key is set.'); // Log instead of alert
        return;
    }
    if (!confirm(`Are you sure you want to delete agent ${selectedAgentId}?`)) {
        return;
    }

    try {
        log(`Deleting agent: ${selectedAgentId}`);
        await apiRequest(`/agents/${selectedAgentId}`, 'DELETE', null, currentApiKey);
        log(`Agent ${selectedAgentId} deleted.`);
        selectedAgentId = null; // Reset selection
        await listAgents(); // Refresh list
    } catch (error) {
        log('Failed to delete agent.');
    }
}

function populateAgentList() {
    agentsListSelect.innerHTML = ''; // Clear existing options
    agents.forEach((agent, index) => {
        const option = document.createElement('option');
        option.value = agent.id;
        option.textContent = `${agent.name} (${agent.id})`;
        agentsListSelect.appendChild(option);

        // Select first agent by default if no agent is currently selected
        if (index === 0 && !selectedAgentId) {
            selectedAgentId = agent.id;
        }
    });

    // Set the selected agent
    if (selectedAgentId && agents.some(a => a.id === selectedAgentId)) {
        agentsListSelect.value = selectedAgentId;
    } else if (agents.length > 0) {
        // If no valid selection, select the first agent
        selectedAgentId = agents[0].id;
        agentsListSelect.value = selectedAgentId;
    } else {
        selectedAgentId = null;
    }
    updateButtonStates();

    // Update the instructions display for the selected agent
    updateInstructionsDisplay();
}

// Function to update the instructions display
function updateInstructionsDisplay() {
    const instructionsContent = document.getElementById('instructionsContent');

    if (!selectedAgentId || !instructionsContent) {
        return;
    }

    const selectedAgent = agents.find(agent => agent.id === selectedAgentId);

    if (selectedAgent) {
        if (selectedAgent.instructions) {
            instructionsContent.textContent = selectedAgent.instructions;
        } else {
            instructionsContent.textContent = "No instructions provided for this agent.";
        }
    } else {
        instructionsContent.textContent = "Select an agent to view instructions";
    }
}

// Remove the old startAgentSession function as we'll use separate buttons now

async function startVoiceSession() {
    log(`Starting voice session for agent: ${selectedAgentId}`);
    try {
        const sessionInfo = await apiRequest(`/agents/${selectedAgentId}/start`, 'POST', {}, currentApiKey);
        log(`Agent session dispatch initiated: ${JSON.stringify(sessionInfo)}`);

        if (sessionInfo.connection_url) {
            tanoAgentUrl = sessionInfo.connection_url;
            log(`Received raw connection_url: ${tanoAgentUrl}`);
            // Extract token and URL for the client SDK
            const urlParams = new URL(tanoAgentUrl.replace('tanoAgent://', 'http://')); // Use http for URL parsing
            const serverUrl = tanoAgentUrl.includes('wss://') ? `wss://${urlParams.host}` : `ws://${urlParams.host}`;
            tanoAgentToken = urlParams.searchParams.get('access_token');
            roomNameSpan.textContent = urlParams.searchParams.get('room') || 'Unknown';

            log(`Parsed Server URL: ${serverUrl}`);
            log(`Parsed Token (length): ${tanoAgentToken ? tanoAgentToken.length : 'N/A'}`);

            connectBtn.disabled = false;
            disconnectBtn.disabled = true;
            muteBtn.disabled = true;
        } else {
            log('Error: Connection URL not found in response.');
            log('Failed to get connection URL from API.');
        }
    } catch (error) {
        log('Failed to start voice agent session.');
    }
}

async function startTextSession() {
    if (textSessionActive) {
        return; // Session already active
    }

    if (!selectedAgentId) {
        log('Please select an agent first.');
        addSystemMessage('Please select an agent first.');
        return;
    }

    log(`Starting text session for agent: ${selectedAgentId}`);
    try {
        const sessionInfo = await apiRequest(`/agents/${selectedAgentId}/start-text`, 'POST', {}, currentApiKey);
        log(`Text agent session started: ${JSON.stringify(sessionInfo)}`);

        if (sessionInfo.session_id) {
            textSessionId = sessionInfo.session_id;
            textSessionStatus.textContent = 'Connected';

            // Show end session button
            endTextSessionBtn.style.display = 'inline-block';

            // Clear previous messages and add welcome message
            textChatMessages.innerHTML = '';
            addSystemMessage('Text session started. You can now chat with the agent.');

            textSessionActive = true;
            return true;
        } else {
            log('Error: Session ID not found in response.');
            log('Failed to start text session.');
            return false;
        }
    } catch (error) {
        log('Failed to start text agent session.');
        return false;
    }
}

async function sendTextMessage() {
    if (!selectedAgentId) {
        log('Please select an agent first.');
        addSystemMessage('Please select an agent first.');
        return;
    }

    const message = textMessageInput.value.trim();
    if (!message) return;

    // Clear input
    textMessageInput.value = '';

    // If no active session, start one first
    if (!textSessionActive) {
        const sessionStarted = await startTextSession();
        if (!sessionStarted) {
            addSystemMessage('Failed to start text session. Please try again.');
            return;
        }
    }

    // Add user message to chat
    addUserMessage(message);

    // Show typing indicator
    addTypingIndicator();

    // Disable input while waiting for response
    textMessageInput.disabled = true;
    sendMessageBtn.disabled = true;
    isWaitingForResponse = true;

    try {
        const response = await apiRequest(
            `/agents/${selectedAgentId}/sessions/${textSessionId}/message`,
            'POST',
            { message },
            currentApiKey
        );

        // Remove typing indicator
        removeTypingIndicator();

        // Add agent response to chat
        if (response && response.response) {
            addAgentMessage(response.response);
        } else {
            addSystemMessage('Error: No response received from agent.');
        }
    } catch (error) {
        // Remove typing indicator
        removeTypingIndicator();
        addSystemMessage('Error sending message. Please try again.');
        log(`Error sending message: ${error}`);
    }

    // Re-enable input
    textMessageInput.disabled = false;
    sendMessageBtn.disabled = false;
    isWaitingForResponse = false;
    textMessageInput.focus();
}

async function endTextSession() {
    if (!textSessionActive || !textSessionId || !selectedAgentId) {
        log('No active text session to end.');
        return;
    }

    try {
        await apiRequest(
            `/agents/${selectedAgentId}/sessions/${textSessionId}`,
            'DELETE',
            null,
            currentApiKey
        );

        log(`Text session ${textSessionId} ended.`);
        addSystemMessage('Session ended.');

        // Reset text session state
        textSessionActive = false;
        textSessionId = null;
        textSessionStatus.textContent = 'Ready';

        // Hide end session button
        endTextSessionBtn.style.display = 'none';
    } catch (error) {
        log(`Error ending text session: ${error}`);
        addSystemMessage('Error ending session. Please try again.');
    }
}

// Helper functions for chat UI
function addUserMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.textContent = message;
    textChatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addAgentMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message agent-message';
    messageDiv.textContent = message;
    textChatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addSystemMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'welcome-message';
    messageDiv.textContent = message;
    textChatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function addTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typingIndicator';
    indicator.textContent = 'Agent is typing...';
    textChatMessages.appendChild(indicator);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function scrollToBottom() {
    textChatMessages.scrollTop = textChatMessages.scrollHeight;
}

function switchTab(tab) {
    activeTab = tab;

    if (tab === 'voice') {
        voiceTab.classList.add('active');
        textTab.classList.remove('active');
        voiceInteraction.classList.add('active');
        textInteraction.classList.remove('active');
    } else {
        voiceTab.classList.remove('active');
        textTab.classList.add('active');
        voiceInteraction.classList.remove('active');
        textInteraction.classList.add('active');

        // Focus on text input when switching to text mode
        if (selectedAgentId) {
            textMessageInput.focus();
        }
    }

    updateButtonStates();
}

function updateInteractionButtons() {
    // Update voice interaction buttons
    startVoiceSessionBtn.disabled = !selectedAgentId;

    // Update text interaction buttons
    textMessageInput.disabled = !selectedAgentId;
    sendMessageBtn.disabled = !selectedAgentId;
}

// --- Voice Service Interaction ---
const { Room, RoomEvent, ParticipantEvent, Track, createLocalAudioTrack } = LivekitClient;

async function connectToRoom() {
    if (!tanoAgentUrl || !tanoAgentToken) {
        log('Connection details not available. Start a session first.'); // Log instead of alert
        return;
    }

    // Extract server URL from the full connection URL
    const urlParams = new URL(tanoAgentUrl.replace('tanoAgent://', 'http://'));
    const serverUrl = tanoAgentUrl.includes('wss://') ? `wss://${urlParams.host}` : `ws://${urlParams.host}`;

    log(`Attempting to connect to voice room: ${roomNameSpan.textContent}`);
    log(`Server URL: ${serverUrl}`);

    tanoAgentRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { autoGainControl: true, echoCancellation: true, noiseSuppression: true },
    });

    tanoAgentRoom
        .on(RoomEvent.Connected, handleConnected)
        .on(RoomEvent.Disconnected, handleDisconnected)
        .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
        .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
        .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    // Add more event listeners as needed (e.g., TrackPublished, ActiveSpeakersChanged)

    try {
        await tanoAgentRoom.connect(serverUrl, tanoAgentToken);
        log('Successfully connected to voice room.');
        // Connection successful logic is in handleConnected
    } catch (error) {
        log(`Error connecting to voice service: ${error}`);
        log(`Failed to connect to voice service: ${error.message}`); // Log instead of alert
        handleDisconnected(); // Reset UI
    }
}

async function handleConnected() {
    log(`Connected to room: ${tanoAgentRoom.name}`);
    connectionStatusSpan.textContent = 'Connected';
    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
    muteBtn.disabled = false;
    muteBtn.textContent = 'Mute Mic';

    // Publish microphone track
    try {
        localAudioTrack = await createLocalAudioTrack({
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        });
        await tanoAgentRoom.localParticipant.publishTrack(localAudioTrack);
        log('Microphone track published.');
        setupAudioVisualizer(localAudioTrack.mediaStream);
    } catch (error) {
        log(`Error publishing microphone: ${error}`);
        log(`Could not get microphone access: ${error.message}`); // Log instead of alert
        // Optionally disconnect if mic is essential
        // await disconnectFromRoom();
    }

    updateParticipantsList();
}

function handleDisconnected() {
    log('Disconnected from voice room.');
    connectionStatusSpan.textContent = 'Disconnected';
    roomNameSpan.textContent = '-';
    connectBtn.disabled = true; // Disable connect until a new session is started
    disconnectBtn.disabled = true;
    muteBtn.disabled = true;
    muteBtn.textContent = 'Mute Mic';
    participantsListUl.innerHTML = ''; // Clear participant list
    tanoAgentRoom = null;
    tanoAgentToken = null;
    tanoAgentUrl = '';
    if (localAudioTrack) {
        localAudioTrack.stop();
        localAudioTrack = null;
    }
    stopAudioVisualizer();
}

function handleParticipantConnected(participant) {
    log(`Participant connected: ${participant.identity} (${participant.sid})`);
    updateParticipantsList();
}

function handleParticipantDisconnected(participant) {
    log(`Participant disconnected: ${participant.identity} (${participant.sid})`);
    updateParticipantsList();
}

function handleTrackSubscribed(track, publication, participant) {
    log(`Track subscribed: ${track.sid} from ${participant.identity}`);
    if (track.kind === Track.Kind.Audio) {
        log(`Attaching audio track ${track.sid} from ${participant.identity}`);
        const audioElement = track.attach();
        document.body.appendChild(audioElement); // Attach to body to play
        // Add to participant list item if needed
        const li = participantsListUl.querySelector(`[data-sid="${participant.sid}"]`);
        if (li) {
            li.dataset.audioTrackSid = track.sid;
        }
    }
}

function handleTrackUnsubscribed(track, publication, participant) {
    log(`Track unsubscribed: ${track.sid} from ${participant.identity}`);
    if (track.kind === Track.Kind.Audio) {
        track.detach().forEach(el => el.remove());
        const li = participantsListUl.querySelector(`[data-sid="${participant.sid}"]`);
        if (li) {
            delete li.dataset.audioTrackSid;
        }
    }
}


function updateParticipantsList() {
    if (!tanoAgentRoom) return;
    participantsListUl.innerHTML = ''; // Clear list

    // Add local participant
    const localLi = document.createElement('li');
    localLi.textContent = `${tanoAgentRoom.localParticipant.identity} (You)`;
    localLi.dataset.sid = tanoAgentRoom.localParticipant.sid;
    participantsListUl.appendChild(localLi);

    // Add remote participants
    tanoAgentRoom.remoteParticipants.forEach(participant => {
        const li = document.createElement('li');
        li.textContent = participant.identity;
        li.dataset.sid = participant.sid;
        // Check if they have an audio track subscribed
        const audioPub = Array.from(participant.audioTrackPublications.values())[0];
        if (audioPub?.trackSid && audioPub.isSubscribed) {
            li.dataset.audioTrackSid = audioPub.trackSid;
            li.textContent += ' (Audio)';
        }
        participantsListUl.appendChild(li);
    });
}


async function disconnectFromRoom() {
    if (tanoAgentRoom) {
        log('Disconnecting from voice room...');
        await tanoAgentRoom.disconnect();
        // UI updates are handled by the 'disconnected' event handler
    }
}

function toggleMute() {
    if (!localAudioTrack) return;
    const muted = !localAudioTrack.isMuted;
    localAudioTrack.mute(muted);
    muteBtn.textContent = muted ? 'Unmute Mic' : 'Mute Mic';
    log(`Microphone ${muted ? 'muted' : 'unmuted'}.`);
}

// --- Audio Visualizer ---
function setupAudioVisualizer(stream) {
    if (!stream || !stream.getAudioTracks().length) {
        log("No audio stream for visualizer.");
        return;
    }
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (!analyser) {
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; // Smaller size for simple visualization
    }
    if (source) {
        source.disconnect(); // Disconnect previous source if any
    }
    source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    drawVisualizer();
    log("Audio visualizer setup complete.");
}

function drawVisualizer() {
    if (!analyser || !canvasCtx || !dataArray) return;

    animationFrameId = requestAnimationFrame(drawVisualizer);

    analyser.getByteFrequencyData(dataArray);

    canvasCtx.fillStyle = '#f4f4f4'; // Background color
    canvasCtx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);

    const barWidth = (visualizerCanvas.width / analyser.frequencyBinCount) * 1.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < analyser.frequencyBinCount; i++) {
        barHeight = dataArray[i] / 2; // Scale height

        canvasCtx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`; // Simple color based on height
        canvasCtx.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1; // Add spacing
    }
}

function stopAudioVisualizer() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    if (source) {
        source.disconnect();
        source = null;
    }
    if (canvasCtx) {
        canvasCtx.fillStyle = '#f4f4f4';
        canvasCtx.fillRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    }
    log("Audio visualizer stopped.");
}


// --- Event Listeners ---
apiKeyInput.addEventListener('change', (e) => {
    currentApiKey = e.target.value;
    sessionStorage.setItem('tanoAgentApiKey', currentApiKey);
    log('API Key updated.');
    listAgents();
});

// Interaction tab event listeners
voiceTab.addEventListener('click', () => switchTab('voice'));
textTab.addEventListener('click', () => switchTab('text'));
startVoiceSessionBtn.addEventListener('click', startVoiceSession);
endTextSessionBtn.addEventListener('click', endTextSession);
sendMessageBtn.addEventListener('click', sendTextMessage);
textMessageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendTextMessage();
    }
});

apiEndpointSelect.addEventListener('change', (e) => {
    currentEndpoint = e.target.value;
    if (currentEndpoint === 'custom') {
        customEndpointInput.style.display = 'inline-block';
        API_BASE_URL = sessionStorage.getItem('tanoAgentCustomEndpoint') || ENDPOINTS.remote;
    } else {
        customEndpointInput.style.display = 'none';
        API_BASE_URL = ENDPOINTS[currentEndpoint];
    }
    sessionStorage.setItem('tanoAgentEndpoint', currentEndpoint);
    log(`API endpoint changed to: ${API_BASE_URL}`);
    updateApiEndpointDisplay();
    listAgents();
});

customEndpointInput.addEventListener('change', (e) => {
    const customEndpoint = e.target.value.trim();
    if (customEndpoint) {
        // If the endpoint doesn't start with http:// or https://, add http://
        const baseUrl = customEndpoint.match(/^https?:\/\//) ? customEndpoint : `http://${customEndpoint}`;
        // If the endpoint doesn't end with /api/v1, add it
        API_BASE_URL = baseUrl.endsWith('/api/v1') ? baseUrl : `${baseUrl}/api/v1`;
        sessionStorage.setItem('tanoAgentCustomEndpoint', API_BASE_URL);
        log(`Custom API endpoint set to: ${API_BASE_URL}`);
        updateApiEndpointDisplay();
        listAgents();
    }
});

toggleApiEndpointBtn.addEventListener('click', () => {
    log(`Using API endpoint: ${API_BASE_URL}`);
    updateApiEndpointDisplay();
    listAgents();
});


createAgentBtn.addEventListener('click', createAgent);
listAgentsBtn.addEventListener('click', listAgents);
deleteAgentBtn.addEventListener('click', deleteAgent);
startSessionBtn.addEventListener('click', startVoiceSession);
connectBtn.addEventListener('click', connectToRoom);
disconnectBtn.addEventListener('click', disconnectFromRoom);
muteBtn.addEventListener('click', toggleMute);

agentsListSelect.addEventListener('change', (e) => {
    selectedAgentId = e.target.value;
    updateButtonStates();
    updateInstructionsDisplay(); // Update instructions when agent selection changes
});

function updateButtonStates() {
    const agentSelected = !!selectedAgentId;
    deleteAgentBtn.disabled = !agentSelected;
    startSessionBtn.disabled = !agentSelected;

    // Update interaction-specific buttons
    updateInteractionButtons();
}

// --- Initial Load ---
function initialize() {
    log('Initializing test interface...');

    // Load and set API Key
    apiKeyInput.value = currentApiKey;

    // Set up endpoint selection
    apiEndpointSelect.value = currentEndpoint;
    if (currentEndpoint === 'custom') {
        customEndpointInput.style.display = 'inline-block';
        customEndpointInput.value = API_BASE_URL.replace('http://', '').replace(':8000/api/v1', '');
    }

    toggleApiEndpointBtn.textContent = 'Refresh Agents';
    log(`Using API Endpoint: ${API_BASE_URL}`);
    updateApiEndpointDisplay();

    if (currentApiKey) {
        listAgents();
    } else {
        log('Enter API Key to list agents.');
    }

    // Initialize interaction tab
    switchTab('voice');

    updateButtonStates();
    connectBtn.disabled = true;
}

function updateApiEndpointDisplay() {
    if (currentApiEndpointSpan) {
        let displayText;
        if (currentEndpoint === 'local') {
            displayText = 'Local Development';
        } else if (currentEndpoint === 'remote') {
            displayText = 'Tano Labs Remote';
        } else if (currentEndpoint === 'staging') {
            displayText = 'Staging Server';
        } else {
            // For custom endpoints, show a cleaner version of the URL
            const url = new URL(API_BASE_URL);
            displayText = `Custom: ${url.host}`;
        }
        currentApiEndpointSpan.textContent = displayText;
    }
}

initialize();
