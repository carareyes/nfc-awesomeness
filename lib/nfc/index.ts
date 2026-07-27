// lib/nfc/index.ts

import NfcManager, { NfcTech, TagEvent } from 'react-native-nfc-manager';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { SecurityManager } from './security-manager';
import { NFCTagData, NDEFRecord, ThreatReport } from './types';
export { simpleSecureNFCManager } from './simple-secure-manager';
export { NFCTagData, ThreatReport, NDEFRecord } from './types';

class NFCManager {
  private isInitialised = false;
  private isReading = false;
  public security = new SecurityManager();

  async initialise(): Promise<boolean> {
    try {
      if (this.isInitialised) return true;
      
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) return false;

      await NfcManager.start();
      this.isInitialised = true;
      console.log('NFC Manager initialised');
      return true;
    } catch (error) {
      console.error('NFC initialisation failed:', error);
      return false;
    }
  }

  async isNFCAvailable(): Promise<boolean> {
    try {
      if (!this.isInitialised) {
        const initialized = await this.initialise();
        if (!initialized) return false;
      }

      const isSupported = await NfcManager.isSupported();
      
      if (Platform.OS === 'android') {
        const isEnabled = await NfcManager.isEnabled();
        return isSupported && isEnabled;
      }
      
      return isSupported;
    } catch (error) {
      console.warn('Error checking NFC availability:', error);
      return false;
    }
  }

  async readNFCTag(): Promise<NFCTagData> {
    if (!this.isInitialised) {
      throw new Error('NFC Manager not initialised');
    }
    if (this.isReading) {
      throw new Error('NFC read in progress');
    }
    this.isReading = true;

    try {
      if (Platform.OS === 'ios') {
        await NfcManager.requestTechnology([NfcTech.Ndef], {
          alertMessage: 'Hold iPhone near the NFC tag',
          invalidateAfterFirstRead: true,
        });
      } else {
        await NfcManager.requestTechnology([NfcTech.Ndef]);
      }

      const tag = await NfcManager.getTag();
      if (!tag) {
        throw new Error('No tag detected');
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const tagData = await this.parseTagData(tag);
      
      // Optional: Still perform basic threat detection for content analysis
      // const threatReport = await this.security.performThreatDetection(tagData);
      
      // if (threatReport) {
      //   console.log('⚠️ Content threat detected:', threatReport.description);
      // } else {
      //   console.log('✅ Tag scanned successfully');
      // }
      
      return tagData;
    } finally {
      this.isReading = false;
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (error) {
        console.warn('Error canceling NFC request:', error);
      }
    }
  }

  async writeNFCTag(textData: string[]): Promise<void> {
    if (!this.isInitialised) {
      throw new Error('NFC Manager not initialised');
    }
    if (this.isReading) {
      throw new Error('NFC operation in progress');
    }
    this.isReading = true;

    try {
      if (Platform.OS === 'ios') {
        await NfcManager.requestTechnology([NfcTech.Ndef], {
          alertMessage: 'Hold iPhone near the NFC tag to write',
          invalidateAfterFirstRead: true,
        });
      } else {
        await NfcManager.requestTechnology([NfcTech.Ndef]);
      }

      // Create NDEF message bytes
      const ndefMessageBytes: number[] = [];
      textData.forEach((text, index) => {
        const langCode = 'en';
        const langCodeBytes = new TextEncoder().encode(langCode);
        const textBytes = new TextEncoder().encode(text);
        const payload = new Uint8Array(1 + langCodeBytes.length + textBytes.length);
        payload[0] = langCodeBytes.length;
        payload.set(langCodeBytes, 1);
        payload.set(textBytes, 1 + langCodeBytes.length);

        let flags = 0x01;
        if (index === 0) flags |= 0x80; 
        if (index === textData.length - 1) flags |= 0x40; 
        if (payload.length < 256) flags |= 0x10; 

        ndefMessageBytes.push(flags);
        ndefMessageBytes.push(0x01); 
        ndefMessageBytes.push(payload.length); 
        ndefMessageBytes.push(0x54);
        ndefMessageBytes.push(...Array.from(payload));
      });

      await NfcManager.ndefHandler.writeNdefMessage(ndefMessageBytes);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('NFC write successful');
    } finally {
      this.isReading = false;
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (error) {
        console.warn('Error canceling NFC request:', error);
      }
    }
  }

  private async parseTagData(tag: TagEvent): Promise<NFCTagData> {
    const tagId = this.getTagId(tag.id);
    const techTypes = tag.techTypes || ['NDEF'];
    
    let ndefRecords: NDEFRecord[] = [];

    try {
      const ndefMessage = await NfcManager.ndefHandler.getNdefMessage();
      if (ndefMessage?.ndefMessage && Array.isArray(ndefMessage.ndefMessage)) {
        ndefRecords = ndefMessage.ndefMessage.map((record: any, index: number) => ({
          id: `record_${index}`,
          type: 'T', 
          payload: this.parsePayload(record.payload),
          tnf: 1,
        }));
      }
    } catch (error) {
      console.warn('Error reading NDEF:', error);
    }

    return {
      id: tagId,
      techTypes,
      type: 'DEMO_TAG',
      maxSize: 1000,
      isWritable: true,
      canMakeReadOnly: false,
      ndefRecords,
      rawData: tag,
      timestamp: new Date().toISOString(),
    };
  }

  private getTagId(id: any): string {
    if (!id) return 'DEMO_TAG_' + Date.now();
    
    if (typeof id === 'string') {
      return id.toUpperCase();
    }
    
    if (Array.isArray(id)) {
      return id
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
    }
    return 'DEMO_TAG_' + Date.now();
  }

  private parsePayload(payload: any): string {
    if (!payload) return '';
    
    try {
      if (typeof payload === 'string') return payload;
      
      if (Array.isArray(payload)) {
        const textBytes = payload.slice(3);
        return String.fromCharCode(...textBytes);
      }
      
      return String(payload);
    } catch (error) {
      return 'Parse error';
    }
  }

  // Keep these methods for compatibility
  getThreatAttempts(tagId: string): number {
    return this.security.getReadAttempts(tagId);
  }

  resetThreatDetection(): void {
    this.security.resetReadAttempts();
  }

  async cleanup(): Promise<void> {
    try {
      if (this.isReading) {
        await NfcManager.cancelTechnologyRequest();
      }
      this.isInitialised = false;
      console.log('NFC Manager cleaned up');
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  }

  getSecurityManager(): SecurityManager {
    return this.security;
  }

  async checkThreatDetection(tagData: NFCTagData): Promise<ThreatReport | null> {
    return await this.security.performThreatDetection(tagData);
  }
}

export const nfcManager = new NFCManager();