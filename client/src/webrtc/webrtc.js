import SimplePeer from 'simple-peer';

export class WebRTCManager {
    constructor(sendSignal, onStream, onClose) {
        this.peer = null;
        this.localStream = null;
        this.sendSignal = sendSignal;
        this.onStream = onStream;
        this.onClose = onClose;
    }

    async initCall(initiator = false) {
        try {
            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            // Create peer connection
            this.peer = new SimplePeer({
                initiator,
                stream: this.localStream,
                trickle: true,
                config: {
                    iceServers: [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            // Handle signals (offer, answer, ICE candidates)
            this.peer.on('signal', (data) => {
                if (data.type === 'offer' || data.type === 'answer') {
                    this.sendSignal(data.type, data);
                } else if (data.candidate) {
                    this.sendSignal('ice_candidate', data);
                }
            });

            // Handle incoming stream
            this.peer.on('stream', (stream) => {
                if (this.onStream) {
                    this.onStream(stream);
                }
            });

            // Handle connection close
            this.peer.on('close', () => {
                this.cleanup();
                if (this.onClose) {
                    this.onClose();
                }
            });

            // Handle errors
            this.peer.on('error', (err) => {
                console.error('WebRTC error:', err);
                this.cleanup();
            });

            return this.localStream;
        } catch (error) {
            console.error('Failed to init call:', error);
            throw error;
        }
    }

    handleSignal(signal) {
        if (this.peer) {
            try {
                this.peer.signal(signal.payload);
            } catch (error) {
                console.error('Error handling signal:', error);
            }
        }
    }

    endCall() {
        this.cleanup();
    }

    cleanup() {
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
    }

    toggleAudio() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                return audioTrack.enabled;
            }
        }
        return false;
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                return videoTrack.enabled;
            }
        }
        return false;
    }
}
