// app/(tabs)/index.tsx 
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FeatureCard } from '@/components/FeatureCard';
import { nfcManager, NFCTagData } from '@/ios/lib/nfc';
import { useRouter } from 'expo-router';
import { TagAnalysis } from '@/components/TagAnalysis';

export default function HomePage() {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState<NFCTagData | null>(null);
  const [showTagAnalysis, setShowTagAnalysis] = useState(false);
  const [nfcInitialized, setNfcInitialized] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const router = useRouter();

  useEffect(() => {
    initializeNFC();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const initializeNFC = async () => {
    try {
      const initialized = await nfcManager.initialise();
      setNfcInitialized(initialized);
      if (!initialized) {
        console.warn('init failed');
      }
    } catch (error) {
      console.error('failed to initialise:', error);
    }
  };

  const handleProtectPress = async () => {
    if (isScanning) return;

    try {
      setIsScanning(true);
      
      const isAvailable = await nfcManager.isNFCAvailable();
      if (!isAvailable) {
        Alert.alert(
          'NFC not available',
          '',
          [{ text: 'OK' }]
        );
        return;
      }
      
      Alert.alert(
        'NFC Reader',
        'hold device near tag to scan',
        [{ text: 'cancel', onPress: () => setIsScanning(false) }]
      );
      
      const tagData = await nfcManager.readNFCTag();
      setLastScanResult(tagData);
      
      Alert.alert(
        'tag detected!',
        `tag ID: ${tagData.id.substring(0, 12)}...\nType: ${tagData.type}\nRecords: ${tagData.ndefRecords.length}\nWritable: ${tagData.isWritable ? 'Yes' : 'No'}`,
        [
          { 
            text: 'details', 
            onPress: () => showTagDetails(tagData)
          },
          { text: 'scan again' },
          { text: 'done' }
        ]
      );
      
    } catch (error) {
      console.error('error:', error);
      const errorMessage = (error as Error).message;
      Alert.alert(
        'scan error', 
        errorMessage,
        [{ text: 'try again' }]
      );
    } finally {
      setIsScanning(false);
    }
  };

  const showTagDetails = (tagData: NFCTagData) => {
    const details = `TAG DETAILS:
    
    ID: ${tagData.id}
    type: ${tagData.type}
    record: ${tagData.ndefRecords.length}
    writable: ${tagData.isWritable ? 'Yes' : 'No'}
    size: ${tagData.maxSize || 0} bytes
    
    NDEF data:
    ${tagData.ndefRecords.map((record, i) => 
      `${i + 1}. ${record.payload || '(empty)'}`
    ).join('\n')}`;
      
    Alert.alert('tag details', details);
  };

  const getSystemStatus = () => {
    if (isScanning) return { text: 'scanning...', color: '#FFC107' };
    if (!nfcInitialized) return { text: 'scan: not ready', color: '#F44336' };
    return { text: 'scan: ready', color: '#4CAF50' };
  };

  const systemStatus = getSystemStatus();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2c3e50" />
      
      <View style={styles.plainBackground}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >

            <Text style={styles.title}>NFC Awesomeness</Text>
            <Text style={styles.subtitle}>
              app that can read data and demo some vulnerabilities!
            </Text>
            
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: systemStatus.color }
              ]} />
              <Text style={styles.statusText}>{systemStatus.text}</Text>
              {isScanning && (
                <ActivityIndicator 
                  size="small" 
                  color="#fff" 
                  style={{ marginLeft: 8 }} 
                />
              )}
            </View>
          </Animated.View>

          <View style={styles.featuresContainer}>
            <FeatureCard
              title={isScanning ? "scanning" : "READ NFC"}
              subtitle={isScanning ? "analysing NFC tag" : "we love security"}
              icon={isScanning ? "refresh" : "shield-checkmark"}
              color={['#4facfe', '#00f2fe']}
              onPress={handleProtectPress}
              delay={300}
              disabled={isScanning || false}
            />

            <FeatureCard
              title="CLONING DEMO"
              subtitle="press here to see NFC cloning"
              icon="copy"
              color={['#f093fb', '#f5576c']}
              onPress={() => router.push('/cloning-demo')}
              delay={450}
              disabled={false}
            />

            <FeatureCard
              title="SQL INJECTION"
              subtitle="press to see SQL injection using NFC"
              icon="warning"
              color={['#ff6b6b', '#ee5a24']}
              onPress={() => router.push('/sqli-demo')}
              delay={600}
              disabled={false}
            />
          </View>

          {lastScanResult && (
            <Animatable.View 
              animation="fadeInUp" 
              style={styles.lastScanContainer}
            >
              <View style={styles.lastScanHeader}>
                <Text style={styles.lastScanTitle}>last scan</Text>
              </View>
              <View style={styles.lastScanContent}>
                <Text style={styles.lastScanText}>
                  tag: {lastScanResult.id.substring(0, 12)}...
                </Text>
                <Text style={styles.lastScanText}>
                  type: {lastScanResult.type}
                </Text>
                <Text style={styles.lastScanText}>
                  records: {lastScanResult.ndefRecords.length}
                </Text>
                <Text style={styles.lastScanText}>
                   {new Date(lastScanResult.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            </Animatable.View>
          )}
        </ScrollView>

        <TagAnalysis
          visible={showTagAnalysis}
          tagData={lastScanResult}
          onClose={() => setShowTagAnalysis(false)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  plainBackground: {
    flex: 1,
    backgroundColor: '#667eea', 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  featuresContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  lastScanContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  lastScanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  lastScanTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  lastScanContent: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
  },
  lastScanText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  systemInfo: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
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
  },
  infoValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});