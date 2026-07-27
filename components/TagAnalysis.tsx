// components/TagAnalysis.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

import { NFCTagData, nfcManager } from '@/lib/nfc';

interface TagAnalysisModalProps {
  visible: boolean;
  tagData: NFCTagData | null;
  onClose: () => void;
}

export const TagAnalysis: React.FC<TagAnalysisModalProps> = ({
  visible,
  tagData,
  onClose,
}) => {

  if (!tagData) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.container}
      >

        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tag Analysis</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          <Animatable.View animation="fadeInUp" delay={200} style={styles.infoCard}>
            <Text style={styles.cardTitle}>📱 Tag Information</Text>
            <View style={styles.infoGrid}>
              <InfoItem label="Tag ID" value={tagData.id} />
              <InfoItem label="Type" value={tagData.type || 'Unknown'} />
              <InfoItem label="Size" value={`${tagData.maxSize || 0} bytes`} />
              <InfoItem label="Writable" value={tagData.isWritable ? 'Yes' : 'No'} />
              <InfoItem label="Technologies" value={tagData.techTypes.join(', ')} />
              <InfoItem label="NDEF Records" value={tagData.ndefRecords.length.toString()} />
            </View>
          </Animatable.View>

          {tagData.ndefRecords.length > 0 && (
            <Animatable.View animation="fadeInUp" delay={400} style={styles.infoCard}>
              <Text style={styles.cardTitle}>NDEF Records</Text>
              {tagData.ndefRecords.map((record, index) => (
                <View key={index} style={styles.recordCard}>
                  <Text style={styles.recordTitle}>Record {index + 1}</Text>
                  <Text style={styles.recordType}>Type: {record.type || 'Unknown'}</Text>
                  <Text style={styles.recordContent} numberOfLines={3}>
                    {record.payload || '(empty)'}
                  </Text>
                </View>
              ))}
            </Animatable.View>
          )}

        </ScrollView>
      </LinearGradient>
    </Modal>
  );
};

const InfoItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoLabel}>{label}:</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 50,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  threatCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  threatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  threatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  threatBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  threatBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  threatDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  infoGrid: {
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  infoLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
    flex: 1,
    textAlign: 'right',
  },
  recordCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  recordType: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  recordContent: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  actionsCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  actionsSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionGradient: {
    padding: 16,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});