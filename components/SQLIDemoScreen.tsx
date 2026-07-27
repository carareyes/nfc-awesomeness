// components/SQLIDemoScreen.tsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { nfcManager } from '../lib/nfc';
import { SQLVulnerableBackend } from '../lib/sql/vulnerable-backend';
import { SQLSecureBackend } from '../lib/sql/secure-backend';

const SQLInjectionDemoScreen = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [nfcPayload, setNfcPayload] = useState<string | null>(null);
  const [vulnerableResult, setVulnerableResult] = useState<any>(null);
  const [secureResult, setSecureResult] = useState<any>(null);
  const [demoResults, setDemoResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const vulnerableBackend = new SQLVulnerableBackend();
  const secureBackend = new SQLSecureBackend();

  const handleStep1 = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const isAvailable = await nfcManager.isNFCAvailable();
      if (!isAvailable) {
        Alert.alert('📱 NFC Not Available');
        return;
      }

      Alert.alert(
        'step 1: write malicious NFC tag',
        'choose an SQLi payload to write to tag:',
        [
          { 
            text: "(' OR '1'='1)", 
            onPress: () => writePayload("' OR '1'='1") 
          },
          { 
            text: "(' UNION SELECT)", 
            onPress: () => writePayload("' UNION SELECT username, password FROM admin_users--") 
          },
          { 
            text: "(' ; SELECT * FROM)", 
            onPress: () => writePayload("'; SELECT * FROM sensitive_data; --") 
          },
          { text: 'cancel', onPress: () => setIsLoading(false) }
        ]
      );
      
    } catch (error: any) {
      console.error('step 1 error:', error);
      Alert.alert('error', error.message, [{ text: 'retry' }]);
    } finally {
    }
  };

  const writePayload = async (payload: string) => {
    try {
      Alert.alert(
        'writing',
        `writing: ${payload}\n\nhold device near blank tag`,
        [{ text: 'cancel', onPress: () => setIsLoading(false) }]
      );

      // write malicious payload
      await nfcManager.writeNFCTag([
        `USER_ID:${payload}`,
        `ACCESS_LEVEL:admin`,
        `TIMESTAMP:${Date.now()}`
      ]);
      
      setNfcPayload(payload);
      setCurrentStep(2);
      
      Alert.alert(
        'step 1 complete', 
        `malicious tag created!\n\n` +
        `payload: ${payload}\n\n` +
        `this tag contains SQLi code`,
        [{ text: 'next: test on vulnerable database' }]
      );
      
    } catch (error: any) {
      console.error('error:', error);
      Alert.alert('error', `failed to write payload: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2 = async () => {
    if (!nfcPayload) {
      Alert.alert('error', 'no payload found');
      return;
    }

    setIsLoading(true);
    try {
      Alert.alert(
        'step 2: test vulnerable system',
        'scan tag from step 1',
        [{ text: 'cancel', onPress: () => setIsLoading(false) }]
      );

      const tagData = await nfcManager.readNFCTag();
      
      let extractedPayload = '';
      tagData.ndefRecords.forEach(record => {
        if (record.payload && record.payload.includes('USER_ID:')) {
          extractedPayload = record.payload.replace('USER_ID:', '');
        }
      });

      console.log('extracted payload:', extractedPayload);

      const vulnResult = await vulnerableBackend.authenticateUser(extractedPayload);
      
      setVulnerableResult({
        success: vulnResult.success,
        exploited: vulnResult.exploited,
        query: vulnResult.executedQuery,
        data: vulnResult.data,
        message: vulnResult.message,
        payload: extractedPayload
      });
      
      setCurrentStep(3);
      
      Alert.alert(
        vulnResult.exploited ? 'step 2 complete' : '',
        vulnResult.exploited 
          ? `SQLi successful!\n\n` +
            `access: ${vulnResult.success ? 'GRANTED' : 'DENIED'}\n` +
            `data extracted: ${vulnResult.data?.length || 0} records\n` +
            `query: ${vulnResult.executedQuery?.substring(0, 50)}...\n\n` +
            `vulnerable database has been compromised!`
          : `SQLi blocked or failed.\n\n${vulnResult.message}`,
        [{ text: 'next: test on secure database' }]
      );
      
    } catch (error: any) {
      console.error('step 2 error:', error);
      Alert.alert('test error', `vulnerable system test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep3 = async () => {
    if (!vulnerableResult) {
      Alert.alert('error');
      return;
    }

    setIsLoading(true);
    try {
      Alert.alert(
        'step 3: test secure system',
        'scan malicious tag and test against secure backend with parameterised queries',
        [{ text: 'cancel', onPress: () => setIsLoading(false) }]
      );

      const tagData = await nfcManager.readNFCTag();
      
      let extractedPayload = '';
      tagData.ndefRecords.forEach(record => {
        if (record.payload && record.payload.includes('USER_ID:')) {
          extractedPayload = record.payload.replace('USER_ID:', '');
        }
      });

      console.log('testing secure system with payload:', extractedPayload);

      const secureResult = await secureBackend.authenticateUser(extractedPayload);
      
      setSecureResult({
        success: secureResult.success,
        blocked: secureResult.blocked,
        sanitised: secureResult.sanitisedInput,
        query: secureResult.executedQuery,
        message: secureResult.message,
        securityEvents: secureResult.securityEvents,
        payload: extractedPayload
      });
      
      setCurrentStep(4);
      
      Alert.alert(
        secureResult.blocked ? 'step 3 complete' : 'complete',
        secureResult.blocked 
          ? `attack blocked!!\n\n` +
            `access: ${secureResult.success ? 'GRANTED' : 'DENIED'}\n` +
            `input sanitised: ${secureResult.sanitisedInput}\n` +
            `security events: ${secureResult.securityEvents?.length || 0}\n\n` +
            `parameterised queries prevented SQLi`
          : `secure system processed request safely.\n\n${secureResult.message}`,
        [{ text: 'next: results' }]
      );
      
    } catch (error: any) {
      console.error('step 3 error:', error);
      Alert.alert('test error', `secure system test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep4 = async () => {
    if (!secureResult) {
      Alert.alert('error');
      return;
    }

    setIsLoading(true);
    try {
        const comparison = {
        vulnerableSystem: {
            exploited: vulnerableResult.exploited,
            dataLeaked: vulnerableResult.data?.length || 0,
            accessGranted: vulnerableResult.success,
            query: vulnerableResult.query
        },
        secureSystem: {
            blocked: secureResult.blocked,
            sanitised: secureResult.sanitised,
            accessGranted: secureResult.success,
            securityEvents: secureResult.securityEvents?.length || 0
        },
        payload: nfcPayload,
        timestamp: new Date().toISOString()
      };
      
      setDemoResults(comparison);
      
      Alert.alert(
        'step 4 complete - comparing secure and vulnerable results',
        `original payload: ${nfcPayload}\n\n` +
        `VULNERABLE SYSTEM:\n` +
        `• exploited: ${vulnerableResult.exploited ? 'YES' : 'NO'}\n` +
        `• data leaked: ${vulnerableResult.data?.length || 0} records\n` +
        `• access: ${vulnerableResult.success ? 'GRANTED' : 'DENIED'}\n\n` +
        `SECURE SYSTEM:\n` +
        `• blocked: ${secureResult.blocked ? 'YES' : 'NO'}\n` +
        `• input sanitised: ${secureResult.sanitised || 'N/A'}\n` +
        `• security events: ${secureResult.securityEvents?.length || 0}\n\n` +
        `Result: ${vulnerableResult.exploited && secureResult.blocked ? 
          'demo success' : 
          'some error'}`,
        [
          { text: 'view SQL queries', onPress: () => showSQLDetails() },
          { text: 'reset', onPress: resetDemo },
          { text: 'done' }
        ]
      );
      
    } catch (error: any) {
      console.error('step 4 error:', error);
      Alert.alert('error', `failed to complete analysis: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showLeakedData = (data: any[]) => {
    if (!data || data.length === 0) {
      Alert.alert('leaked data', 'no data was leaked in this attack.');
      return;
    }

    let dataDisplay = '';
    data.forEach((record, index) => {
      dataDisplay += `Record ${index + 1}:\n`;
      Object.keys(record).forEach(key => {
        dataDisplay += `  ${key}: ${record[key]}\n`;
      });
      dataDisplay += '\n';
    });

    Alert.alert(
      'LEAKED DATA',
      `${data.length} records compromised:\n\n${dataDisplay}`,
      [
        // { text: 'hide Data' },
        { text: 'copy', onPress: () => console.log('data copied:', dataDisplay) }
      ]
    );
  };

  const showSQLDetails = () => {
    Alert.alert(
      'SQL query analysis',
      `VULNERABLE QUERY:\n${vulnerableResult.query}\n\n` +
      `SECURE QUERY:\n${secureResult.query}\n\n` +
      `EXPLANATION:\n` +
      `• vulnerable: string concatenation allows injection\n` +
      `• secure: parameterised queries treat input as data, not code\n\n` +
      [{ text: 'OK' }]
    );
  };

  const resetDemo = async () => {
    try {
      setCurrentStep(1);
      setNfcPayload(null);
      setVulnerableResult(null);
      setSecureResult(null);
      setDemoResults(null);
      
      await vulnerableBackend.resetDatabase();
      await secureBackend.resetDatabase();
      
      Alert.alert('demo reset');
    } catch (error: any) {
      Alert.alert('reset error', `failed to reset: ${error.message}`);
    }
  };

  const getDangerLevel = () => {
    if (!vulnerableResult) return 'unknown';
    if (vulnerableResult.exploited && vulnerableResult.data?.length > 0) return 'critical';
    if (vulnerableResult.exploited) return 'high';
    return 'low';
  };

  const dangerLevel = getDangerLevel();
  const dangerColors = {
    critical: '#d32f2f',
    high: '#f57c00',
    low: '#388e3c',
    unknown: '#757575'
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>SQLi Demo</Text>
      <Text style={styles.subtitle}>
        shows how malicious NFC tags can exploit vulnerable database systems
      </Text>

      {demoResults && (
        <View style={[styles.dangerIndicator, { backgroundColor: dangerColors[dangerLevel] }]}>
          <Text style={styles.dangerText}>
            {dangerLevel.toUpperCase()} RISK DEMOED
          </Text>
        </View>
      )}

      <View style={[styles.stepContainer, currentStep === 1 && styles.activeStep]}>
        <Text style={styles.stepTitle}>
          step 1: create malicious tag
        </Text>
        <Text style={styles.stepDescription}>
          writes an SQL payload to a tag
        </Text>
        
        {nfcPayload && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>malicious payload created:</Text>
            <Text style={[styles.dataText, styles.dangerousText]}>
              payload: {nfcPayload}
            </Text>
            <Text style={styles.dataText}>
              vector: SQLi in USER_ID field
            </Text>
            <Text style={styles.dataText}>
              target: authentication system
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton, currentStep !== 1 && styles.disabledButton]} 
          onPress={handleStep1}
          disabled={currentStep !== 1 || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading && currentStep === 1 ? 'creating' : 'create tag'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.stepContainer, currentStep === 2 && styles.activeStep]}>
        <Text style={styles.stepTitle}>
          step 2: attack vulnerable DB
        </Text>
        <Text style={styles.stepDescription}>
          scan malicious tag to test against vulnerable backend
        </Text>
        
        {vulnerableResult && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>
              {vulnerableResult.exploited ? 'SYSTEM COMPROMISED:' : 'Attack Result:'}
            </Text>
            <Text style={[
              styles.dataText, 
              vulnerableResult.exploited ? styles.dangerousText : styles.normalText
            ]}>
              status: {vulnerableResult.exploited ? 'EXPLOITED' : 'BLOCKED'}
            </Text>
            <Text style={styles.dataText}>
              access: {vulnerableResult.success ? 'GRANTED' : 'DENIED'}
            </Text>
            <Text style={styles.dataText}>
              data leaked: {vulnerableResult.data?.length || 0} records
            </Text>
            <Text style={styles.dataText}>
              query: {vulnerableResult.query?.substring(0, 50)}...
            </Text>
            {vulnerableResult.exploited && (
              <>
                <Text style={[styles.dataText, styles.dangerousText]}>
                  SQLi successful! database compromised!!
                </Text>
                {vulnerableResult.data && vulnerableResult.data.length > 0 && (
                  <TouchableOpacity 
                    style={styles.leakedDataButton}
                    onPress={() => showLeakedData(vulnerableResult.data)}
                  >
                    <Text style={styles.leakedDataButtonText}>
                      view leaked data ({vulnerableResult.data.length} records)
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.button, styles.dangerButton, currentStep !== 2 && styles.disabledButton]} 
          onPress={handleStep2}
          disabled={currentStep !== 2 || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading && currentStep === 2 ? 'attacking' : 'attacking DB'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.stepContainer, currentStep === 3 && styles.activeStep]}>
        <Text style={styles.stepTitle}>
          step 3: test secure DB
        </Text>
        <Text style={styles.stepDescription}>
          test same payload against secure backend with parameterised queries
        </Text>
        
        {secureResult && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>secure system:</Text>
            <Text style={[
              styles.dataText, 
              secureResult.blocked ? styles.secureText : styles.normalText
            ]}>
              status: {secureResult.blocked ? 'ATTACK BLOCKED' : 'PROCESSED SAFELY'}
            </Text>
            <Text style={styles.dataText}>
              access: {secureResult.success ? 'GRANTED' : 'DENIED'}
            </Text>
            <Text style={styles.dataText}>
              input sanitised: {secureResult.sanitised || 'N/A'}
            </Text>
            <Text style={styles.dataText}>
              security events: {secureResult.securityEvents?.length || 0}
            </Text>
            <Text style={styles.dataText}>
              query: {secureResult.query?.substring(0, 50)}...
            </Text>
            {secureResult.blocked && (
              <Text style={[styles.dataText, styles.secureText]}>
                result: parameterised queries prevented SQLi
              </Text>
            )}
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.button, styles.secureButton, currentStep !== 3 && styles.disabledButton]} 
          onPress={handleStep3}
          disabled={currentStep !== 3 || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading && currentStep === 3 ? 'testing' : 'test on secure DB'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.stepContainer, currentStep === 4 && styles.activeStep]}>
        <Text style={styles.stepTitle}>
          step 4: compare results
        </Text>
        <Text style={styles.stepDescription}>
          compare step 2 and 3 results
        </Text>
        
        {demoResults && (
          <View style={styles.dataContainer}>
            <Text style={styles.dataTitle}>comparison:</Text>
            
            <Text style={styles.sectionTitle}>vulnerable system:</Text>
            <Text style={[styles.dataText, demoResults.vulnerableSystem.exploited ? styles.dangerousText : styles.normalText]}>
              • exploited: {demoResults.vulnerableSystem.exploited ? 'YES' : 'NO'}
            </Text>
            <Text style={styles.dataText}>
              • data leaked: {demoResults.vulnerableSystem.dataLeaked} records
            </Text>
            <Text style={styles.dataText}>
              • access granted: {demoResults.vulnerableSystem.accessGranted ? 'YES' : 'NO'}
            </Text>
            
            <Text style={styles.sectionTitle}>secure system:</Text>
            <Text style={[styles.dataText, demoResults.secureSystem.blocked ? styles.secureText : styles.normalText]}>
              • attack blocked: {demoResults.secureSystem.blocked ? 'YES' : 'NO'}
            </Text>
            <Text style={styles.dataText}>
              • input sanitised: {demoResults.secureSystem.sanitised || 'N/A'}
            </Text>
            <Text style={styles.dataText}>
              • security events: {demoResults.secureSystem.securityEvents}
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.button, currentStep !== 4 && styles.disabledButton]} 
          onPress={handleStep4}
          disabled={currentStep !== 4 || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading && currentStep === 4 ? 'analysing' : 'comparing results'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.resetButton} onPress={resetDemo}>
        <Text style={styles.buttonText}>reset</Text>
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>prevention methods</Text>
        <Text style={styles.infoText}>
          <Text style={styles.boldText}>1. parameterised queries:</Text> use statements with parameters
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.boldText}>2. input validation:</Text> sanitise and validate user input
        </Text>
      </View>

    
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#d32f2f',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  dangerIndicator: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  dangerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  activeStep: {
    borderColor: '#d32f2f',
    backgroundColor: '#fff5f5',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  stepDescription: {
    fontSize: 14,
    marginBottom: 15,
    color: '#666',
  },
  dataContainer: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  dataText: {
    fontSize: 14,
    marginBottom: 3,
    color: '#555',
  },
  dangerousText: {
    color: '#d32f2f',
    fontWeight: 'bold',
  },
  secureText: {
    color: '#4caf50',
    fontWeight: 'bold',
  },
  normalText: {
    color: '#555',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: '#333',
  },
  button: {
    backgroundColor: '#1976d2',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#d32f2f',
  },
  secureButton: {
    backgroundColor: '#4caf50',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  leakedDataButton: {
    backgroundColor: '#d32f2f',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f44336',
  },
  leakedDataButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  infoContainer: {
    backgroundColor: '#e8f5e8',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2e7d32',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#2e7d32',
  },
  boldText: {
    fontWeight: 'bold',
  },
  payloadContainer: {
    backgroundColor: '#fff3e0',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffb74d',
  },
  payloadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#e65100',
    textAlign: 'center',
  },
  payloadSection: {
    marginBottom: 15,
  },
  payloadSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#f57c00',
  },
  payloadText: {
    fontSize: 13,
    marginBottom: 4,
    color: '#bf360c',
    fontFamily: 'monospace',
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 4,
  },
});

export default SQLInjectionDemoScreen;