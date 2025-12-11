import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, QrCode, CheckCircle, Clock, MapPin, User } from 'lucide-react-native';

interface LastScan {
  subject: string;
  faculty: string;
  room: string;
  time: string;
  date: string;
}

export default function ScannerScreen() {
  const { student } = useAuth();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastScan, setLastScan] = useState<LastScan | null>(null);
  const [todayStats, setTodayStats] = useState({ attended: 0, remaining: 0 });

  useEffect(() => {
    if (student) {
      loadTodayStats();
      loadLastScan();
    }
  }, [student]);

  const loadTodayStats = async () => {
    if (!student) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', student.id)
        .gte('marked_at', `${today}T00:00:00`)
        .lt('marked_at', `${today}T23:59:59`);

      const attended = attendanceData?.length || 0;
      // Assuming 4 classes per day as default
      setTodayStats({ attended, remaining: Math.max(0, 4 - attended) });
    } catch (error) {
      console.error('Error loading today stats:', error);
    }
  };

  const loadLastScan = async () => {
    if (!student) return;

    try {
      const { data: recentData } = await supabase
        .from('attendance')
        .select(`
          marked_at,
          classes (
            name,
            instructor_name
          ),
          sessions (
            start_time
          )
        `)
        .eq('student_id', student.id)
        .order('marked_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentData) {
        const markedAt = new Date(recentData.marked_at);
        setLastScan({
          subject: (recentData.classes as any)?.name || 'Unknown Class',
          faculty: (recentData.classes as any)?.instructor_name || 'Unknown',
          room: 'Room TBD',
          time: markedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          date: markedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        });
      }
    } catch (error) {
      console.error('Error loading last scan:', error);
    }
  };

  if (!permission) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#7A1431" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <StatusBar style="dark" />
        <LinearGradient
          colors={['#771C32', '#9E2A48']}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            margin: 24,
            borderRadius: 16,
            padding: 32,
            width: '100%',
          }}
        >
          <QrCode size={64} color="white" />
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', marginTop: 16, marginBottom: 8 }}>
            Camera Permission Required
          </Text>
          <Text style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.8)', textAlign: 'center', marginBottom: 24 }}>
            We need camera access to scan QR codes for attendance marking
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 8,
            }}
            onPress={requestPermission}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
              Grant Permission
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (!scanning || processing) return;

    setScanning(false);
    setProcessing(true);

    try {
      // Call Supabase Edge Function directly
      const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/attendance-scan`;
      
      const attendancePayload = {
        reg_number: student?.reg_number || (student as any)?.roll_number || '',
        name: student?.name || 'Unknown',
        class_no: (student as any)?.class_no || (student as any)?.class || '',
        qr_code_value: data?.trim() || '',
        scanned_qr_data: data?.trim() || '',
      };

      console.log('Sending attendance payload:', attendancePayload);
      console.log('Calling endpoint:', EDGE_FUNCTION_URL);

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(attendancePayload),
      });

      const result = await response.json();
      console.log('Response:', result);

      if (result.success) {
        Alert.alert('Success', result.message || 'Attendance marked successfully', [
          { text: 'OK', onPress: () => {
            loadTodayStats();
            loadLastScan();
            setScanning(true);
          }}
        ]);
      } else {
        Alert.alert('Error', result.message || 'Failed to mark attendance');
        setScanning(true);
      }
    } catch (error: any) {
      console.error('QR scan error:', error);
      Alert.alert('Error', `Failed to process QR code: ${error?.message || 'Unknown error'}`);
      setScanning(true);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <StatusBar style="light" />
      {scanning && !processing ? (
        <View className="flex-1 bg-black">
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={handleBarCodeScanned}
          >
            {/* Header */}
            <View
              className="absolute top-0 left-0 right-0 pb-6 px-6 bg-black/50"
              style={{ paddingTop: insets.top + 16 }}
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-white text-lg font-semibold">
                  Scan QR Code
                </Text>
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="p-2"
                  accessibilityLabel="Close scanner"
                >
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scanning Frame */}
            <View className="flex-1 justify-center items-center">
              <View className="relative">
                <View
                  className="w-64 h-64 border-2 rounded-2xl"
                  style={{ borderColor: '#771C32' }}
                >
                  {/* Corner indicators */}
                  <View
                    className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-2xl"
                    style={{ borderColor: '#771C32' }}
                  />
                  <View
                    className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-2xl"
                    style={{ borderColor: '#771C32' }}
                  />
                  <View
                    className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-2xl"
                    style={{ borderColor: '#771C32' }}
                  />
                  <View
                    className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-2xl"
                    style={{ borderColor: '#771C32' }}
                  />
                </View>
              </View>
            </View>

            {/* Instructions */}
            <View className="absolute bottom-0 left-0 right-0 pb-10 px-6 bg-black/50">
              <View className="bg-white/10 rounded-xl p-4 backdrop-blur-lg">
                <Text className="text-white text-center font-medium">
                  Position QR code within the frame
                </Text>
              </View>
            </View>
          </CameraView>
        </View>
      ) : (
        <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <LinearGradient
            colors={['#771C32', '#9E2A48']}
            style={{
              paddingTop: insets.top + 60,
              paddingBottom: 30,
              paddingHorizontal: 24,
            }}
          >
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 4 }}>
              QR Scanner
            </Text>
            <Text style={{ fontSize: 16, color: 'rgba(255, 255, 255, 0.8)' }}>
              Scan faculty QR code to mark attendance
            </Text>
          </LinearGradient>

          <View style={{ flex: 1, marginTop: -20, paddingHorizontal: 24 }}>
            {/* Scan Button */}
            <View style={{ alignItems: 'center', marginVertical: 32 }}>
              <TouchableOpacity
                style={{
                  borderRadius: 20,
                  shadowColor: '#771C32',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 8,
                }}
                onPress={() => setScanning(true)}
              >
                <LinearGradient
                  colors={['#771C32', '#9E2A48']}
                  style={{
                    alignItems: 'center',
                    paddingVertical: 32,
                    paddingHorizontal: 48,
                    borderRadius: 20,
                  }}
                >
                  <QrCode size={48} color="white" />
                  <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', marginTop: 12 }}>
                    Scan QR Code
                  </Text>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14, marginTop: 4 }}>
                    Tap to open camera
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Last Scan Info */}
            {lastScan && (
              <View style={{ marginBottom: 32 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}>
                  <CheckCircle size={20} color="#059669" />
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e293b' }}>
                    Last Attendance Marked
                  </Text>
                </View>

                <View style={{
                  backgroundColor: 'white',
                  borderRadius: 16,
                  padding: 20,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e293b', flex: 1 }}>
                      {lastScan.subject}
                    </Text>
                    <View style={{
                      backgroundColor: '#dcfce7',
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 12,
                    }}>
                      <Text style={{ color: '#059669', fontSize: 12, fontWeight: 'bold' }}>
                        Present
                      </Text>
                    </View>
                  </View>

                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <User size={16} color="#64748b" />
                      <Text style={{ fontSize: 14, color: '#64748b' }}>{lastScan.faculty}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MapPin size={16} color="#64748b" />
                      <Text style={{ fontSize: 14, color: '#64748b' }}>{lastScan.room}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Clock size={16} color="#64748b" />
                      <Text style={{ fontSize: 14, color: '#64748b' }}>
                        {lastScan.time} • {lastScan.date}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Quick Stats */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 16 }}>
                Today's Summary
              </Text>
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{
                  flex: 1,
                  backgroundColor: 'white',
                  padding: 20,
                  borderRadius: 16,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#771C32', marginBottom: 4 }}>
                    {todayStats.attended}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                    Classes Attended
                  </Text>
                </View>
                <View style={{
                  flex: 1,
                  backgroundColor: 'white',
                  padding: 20,
                  borderRadius: 16,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#771C32', marginBottom: 4 }}>
                    {todayStats.remaining}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                    Remaining
                  </Text>
                </View>
              </View>
            </View>

            {/* Instructions */}
            <View style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 20,
              marginBottom: 32,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 8,
              elevation: 3,
            }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 }}>
                How to use:
              </Text>
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 14, color: '#64748b', lineHeight: 20 }}>
                  1. Tap "Scan QR Code" button
                </Text>
                <Text style={{ fontSize: 14, color: '#64748b', lineHeight: 20 }}>
                  2. Point camera at faculty's QR code
                </Text>
                <Text style={{ fontSize: 14, color: '#64748b', lineHeight: 20 }}>
                  3. Wait for automatic detection
                </Text>
                <Text style={{ fontSize: 14, color: '#64748b', lineHeight: 20 }}>
                  4. Attendance will be marked instantly
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      )}
    </>
  );
}
