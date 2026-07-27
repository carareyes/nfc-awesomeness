// lib/nfc/simple-secure-manager.ts

import * as Crypto from 'expo-crypto';
import { nfcManager } from './index';
import { SecurityManager } from './security-manager';
import type { NFCTagData } from './types';

export class SimpleSecureNFCManager {
  private securityManager: SecurityManager;
  private privateKey = 'demo_key_123';

  constructor() {
    this.securityManager = new SecurityManager();
  }

  async writeSecureTag(data: string, location?: string): Promise<void> {
    try {
      console.log('creating secure tag');
      
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2, 8);
      const truncatedData = data.length > 50 ? data.substring(0, 50) + '...' : data;
      const payload = `${truncatedData}|T:${timestamp}|N:${nonce}`;
      
      const signature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        payload + this.privateKey
      );
      
      const secureData = `${payload}|S:${signature.substring(0, 16)}`; 
      
      console.log('final payload length:', secureData.length, 'characters');
      console.log('secure payload:', secureData);
      
      await nfcManager.writeNFCTag([secureData]);
      
      console.log('secure tag written successfully');
    } catch (error) {
      console.error('failed to write secure tag:', error);
      throw error;
    }
  }

  async readSecureTag(location?: string): Promise<{
    tagData: NFCTagData;
    securityResult: {
      isValid: boolean;
      isExpired: boolean;
      shouldBlock: boolean;
      events: any[];
    };
    accessGranted: boolean;
  }> {
    try {
      console.log('reading tag');
      
      const tagData = await nfcManager.readNFCTag();
      
      console.log('result:', tagData);
      
      const threatReport = await nfcManager.checkThreatDetection(tagData);
      
      let isValid = false;
      let isExpired = false;
      let shouldBlock = false;
      const events: any[] = [];
      
      for (const record of tagData.ndefRecords) {
        if (record.payload && record.payload.includes('S:')) {
          console.log('verifying');
          
          const verification = await this.verifySignature(record.payload);
          isValid = verification.isValid;
          isExpired = verification.isExpired;
          
          if (!isValid) {
            events.push({
              type: 'SIGNATURE_INVALID',
              severity: 'HIGH',
              description: 'invalid cryptographic signature',
              tagId: tagData.id,
              timestamp: Date.now(),
              blocked: true
            });
            shouldBlock = true;
          }
          
          if (isExpired) {
            events.push({
              type: 'EXPIRED_SIGNATURE',
              severity: 'MEDIUM',
              description: 'signature has expired',
              tagId: tagData.id,
              timestamp: Date.now(),
              blocked: true
            });
            shouldBlock = true;
          }
        }
      }
      
      if (threatReport) {
        events.push({
          type: threatReport.threatType,
          severity: threatReport.severity,
          description: threatReport.description,
          tagId: threatReport.tagId,
          timestamp: Date.now(),
          blocked: threatReport.blocked
        });
        
        if (threatReport.blocked) {
          shouldBlock = true;
        }
      }
      
      const accessGranted = isValid && !isExpired && !shouldBlock;
      
      console.log(`access: ${accessGranted ? 'GRANTED' : 'DENIED'}`);
      console.log('security events:', events.length);

      return {
        tagData,
        securityResult: {
          isValid,
          isExpired,
          shouldBlock,
          events
        },
        accessGranted
      };
      
    } catch (error) {
      console.error('failed to read secure tag:', error);
      throw error;
    }
  }

  private async verifySignature(payload: string): Promise<{
    isValid: boolean;
    isExpired: boolean;
  }> {
    try {
      const parts = payload.split('|');
      const signatureIndex = parts.findIndex(part => part.startsWith('S:'));
      
      if (signatureIndex === -1) {
        return { isValid: false, isExpired: false };
      }

      const shortSignature = parts[signatureIndex].substring(2); 
      const payloadWithoutSig = parts.slice(0, signatureIndex).join('|');

      const expectedSignature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        payloadWithoutSig + this.privateKey
      );
      
      const isValid = shortSignature === expectedSignature.substring(0, 16);

      const timeMatch = payloadWithoutSig.match(/T:(\d+)/);
      let isExpired = false;
      
      if (timeMatch) {
        const tagTimestamp = parseInt(timeMatch[1]);
        const age = Date.now() - tagTimestamp;
        isExpired = age > (5 * 60 * 1000);
      }
      
      return { isValid, isExpired };
      
    } catch (error) {
      console.error('signature invalid:', error);
      return { isValid: false, isExpired: false };
    }
  }

  async demonstrateSecurity(): Promise<{
    vulnerableClone: boolean;
    secureClone: boolean;
    behavioralDetection: boolean;
  }> {
    try {
      console.log('start demo');

      await nfcManager.writeNFCTag(['ACCESS:ADMIN|USER:VulnerableUser']);
      const vulnerableTag = await nfcManager.readNFCTag();
      const vulnerableClone = vulnerableTag.ndefRecords.length > 0;
      
      await this.writeSecureTag('ACCESS:ADMIN|USER:SecureUser');
      const secureRead = await this.readSecureTag();
      const secureClone = secureRead.accessGranted;

      const behavioralDetection = false;
      
      return {
        vulnerableClone,
        secureClone,
        behavioralDetection
      };
      
    } catch (error) {
      console.error('demo failed:', error);
      throw error;
    }
  }

  getSecurityManager(): SecurityManager {
    return this.securityManager;
  }
}

export const simpleSecureNFCManager = new SimpleSecureNFCManager();