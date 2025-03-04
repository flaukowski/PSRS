import CryptoJS from 'crypto-js';

interface SecureChannel {
  channelId: string;
  encryptionKey: string;
}

class SecureWebSocket {
  private ws: WebSocket;
  private channel?: SecureChannel;
  private messageHandlers: ((data: any) => void)[] = [];
  private closeHandlers: (() => void)[] = [];
  private reconnectTimeout?: NodeJS.Timeout;
  public reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  constructor(url: string) {
    console.log('Initializing SecureWebSocket with URL:', url);
    this.ws = new WebSocket(url);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.ws.addEventListener('message', this.handleMessage);
    this.ws.addEventListener('close', this.handleClose);
    this.ws.addEventListener('open', () => {
      console.log('WebSocket connection established');
      this.reconnectAttempts = 0;
    });
    this.ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleMessage = (event: MessageEvent) => {
    try {
      let data: any;

      try {
        data = JSON.parse(event.data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        return;
      }

      if (data.type === 'channel_established') {
        this.channel = {
          channelId: data.channelId,
          encryptionKey: data.encryptionKey
        };
        return;
      }

      if (this.channel && data.data) {
        // Decrypt message if we have a secure channel
        try {
          const decrypted = CryptoJS.AES.decrypt(
            data.data,
            this.channel.encryptionKey
          );
          data = JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
        } catch (error) {
          console.error('Error decrypting message:', error);
          return;
        }
      }

      // Notify all message handlers
      this.messageHandlers.forEach(handler => handler(data));
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  };

  private handleClose = () => {
    console.log('WebSocket connection closed');
    this.closeHandlers.forEach(handler => handler());

    // Attempt reconnection if not at max attempts
    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`);

      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts++;
        // Recreate the WebSocket with the same URL
        this.ws = new WebSocket(this.ws.url);
        this.setupEventListeners();
      }, delay);
    }
  };

  public send(message: any) {
    if (this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return;
    }

    try {
      let dataToSend = message;

      if (typeof message !== 'string') {
        dataToSend = JSON.stringify(message);
      }

      if (this.channel) {
        // Encrypt message if we have a secure channel
        const encrypted = CryptoJS.AES.encrypt(
          dataToSend,
          this.channel.encryptionKey
        ).toString();

        this.ws.send(JSON.stringify({
          channelId: this.channel.channelId,
          data: encrypted
        }));
      } else {
        // Fall back to unencrypted in development
        this.ws.send(dataToSend);
      }
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  }

  public onMessage(callback: (data: any) => void) {
    this.messageHandlers = [callback]; // Replace existing handlers
  }

  public onClose(callback: () => void) {
    this.closeHandlers = [callback]; // Replace existing handlers
  }

  public close() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.ws.close();
  }

  public get readyState() {
    return this.ws.readyState;
  }
}

export default SecureWebSocket;